"use client";
import { useState, useRef, useCallback, useEffect } from "react";

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // seconds
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioLevel: number; // 0-1 for waveform visualization
  error: string | null;
  permissionDenied: boolean;
}

interface AudioRecorderActions {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  reset: () => void;
}

const MAX_DURATION = 10 * 60; // 10 minutes max per question

export function useAudioRecorder(): AudioRecorderState & AudioRecorderActions {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const animFrame = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStop = useRef<((blob: Blob | null) => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
      if (audioContext.current) audioContext.current.close().catch(() => {});
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAudioLevel = useCallback(() => {
    if (!analyser.current) return;
    const data = new Uint8Array(analyser.current.fftSize);
    analyser.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setAudioLevel(Math.min(1, rms * 3)); // amplify a bit for visual effect
    animFrame.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);
    setAudioBlob(null);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    chunks.current = [];
    setDuration(0);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      stream.current = mediaStream;

      // Set up audio analysis for waveform
      const ctx = new AudioContext();
      audioContext.current = ctx;
      const source = ctx.createMediaStreamSource(mediaStream);
      const anal = ctx.createAnalyser();
      anal.fftSize = 256;
      source.connect(anal);
      analyser.current = anal;

      // Choose best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        if (resolveStop.current) {
          resolveStop.current(blob);
          resolveStop.current = null;
        }
      };

      // Collect chunks every 5 seconds for auto-save resilience
      recorder.start(5000);
      setIsRecording(true);
      setIsPaused(false);

      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDuration(elapsed);
        if (elapsed >= MAX_DURATION) {
          // Auto-stop at max duration
          recorder.stop();
          mediaStream.getTracks().forEach((t) => t.stop());
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
          if (animFrame.current) cancelAnimationFrame(animFrame.current);
        }
      }, 250);

      // Start audio level visualization
      updateAudioLevel();
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionDenied(true);
        setError("Microphone access was denied. Please allow microphone access in your browser settings.");
      } else {
        setError("Could not start recording. Please check your microphone.");
      }
      console.error("Recording error:", err);
    }
  }, [audioUrl, updateAudioLevel]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") {
        resolve(audioBlob);
        return;
      }

      resolveStop.current = resolve;
      mediaRecorder.current.stop();
      if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      if (audioContext.current) audioContext.current.close().catch(() => {});
      setIsRecording(false);
      setIsPaused(false);
      setAudioLevel(0);
    });
  }, [audioBlob]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.pause();
      setIsPaused(true);
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      setAudioLevel(0);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === "paused") {
      mediaRecorder.current.resume();
      setIsPaused(false);
      updateAudioLevel();
    }
  }, [updateAudioLevel]);

  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setAudioLevel(0);
    setError(null);
    chunks.current = [];
  }, [audioUrl]);

  return {
    isRecording, isPaused, duration, audioBlob, audioUrl, audioLevel, error, permissionDenied,
    startRecording, stopRecording, pauseRecording, resumeRecording, reset,
  };
}
