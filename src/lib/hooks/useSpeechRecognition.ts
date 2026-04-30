"use client";
import { useState, useRef, useCallback } from "react";

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string;
  startListening: (lang?: string) => void;
  stopListening: () => Promise<string>;
  resetTranscript: () => void;
  isSupported: boolean;
}

/**
 * Browser Speech Recognition hook with mobile auto-restart.
 *
 * On mobile Chrome, `continuous: true` often silently stops after a few seconds.
 * This hook detects premature stops and automatically restarts recognition,
 * accumulating the transcript across restarts so nothing is lost.
 *
 * Prevents echo/duplicates by tracking which result indices have been finalised.
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  // Accumulated transcript across auto-restarts (mobile)
  const accumulatedRef = useRef("");
  // Index of the last result we have already processed as final.
  // The Web Speech API results list only grows within a session; results
  // are never removed. Tracking the index (not a count) avoids double-
  // counting when the same result appears in multiple onresult events.
  const processedUpToIndexRef = useRef(-1);
  // Running session transcript (only finals from THIS session)
  const sessionTranscriptRef = useRef("");
  // Whether the user has requested stop (vs. browser auto-stopping)
  const stoppingRef = useRef(false);
  // Current language for auto-restart
  const langRef = useRef("nl-NL");

  const isSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const isMobileBrowser = typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const createRecognition = useCallback((lang: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // On mobile Chrome, continuous mode is unreliable — it re-processes audio
    // buffers causing echo/duplicates. Use single-utterance mode instead;
    // the onend auto-restart handles capturing the next utterance.
    recognition.continuous = !isMobileBrowser;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      // Only process NEW final results to avoid echo/duplicates.
      // Each onresult event contains ALL results from this session.
      // We track the highest result-index already processed as final.
      let newFinals = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Only append if this index is beyond what we already processed
          if (i > processedUpToIndexRef.current) {
            const text = result[0].transcript.trim();
            if (text) {
              // Guard against mobile auto-restart echo: if the new final
              // text is already the suffix of the accumulated transcript,
              // skip it. This catches the case where Chrome re-transcribes
              // lingering audio after a restart.
              const accumulated = accumulatedRef.current.trim();
              if (accumulated && accumulated.endsWith(text)) {
                // Duplicate from restart — skip
              } else {
                newFinals += text + " ";
              }
            }
            processedUpToIndexRef.current = i;
          }
        } else {
          // Only take the LAST interim result to avoid stacking
          interim = result[0].transcript;
        }
      }

      if (newFinals) {
        sessionTranscriptRef.current += newFinals;
        const combined = (accumulatedRef.current + " " + sessionTranscriptRef.current).trim();
        finalTranscriptRef.current = combined;
        setTranscript(combined);
      }
      // Don't show interim text that duplicates what's already finalized
      const currentFinal = finalTranscriptRef.current.toLowerCase().trim();
      const interimLower = interim.toLowerCase().trim();
      if (interimLower && currentFinal.endsWith(interimLower)) {
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are recoverable on mobile — let onend restart
      if (event.error === "no-speech" || event.error === "aborted") {
        if (!isMobileBrowser) {
          if (event.error === "no-speech") {
            setError("No speech detected. Please try again.");
          }
          setIsListening(false);
        }
        return;
      }
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access.");
        stoppingRef.current = true;
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!stoppingRef.current && isMobileBrowser) {
        // Mobile auto-restart: save transcript and restart with clean session counters
        accumulatedRef.current = finalTranscriptRef.current;
        sessionTranscriptRef.current = "";
        processedUpToIndexRef.current = -1;
        try {
          const newRecognition = createRecognition(langRef.current);
          recognitionRef.current = newRecognition;
          newRecognition.start();
          return;
        } catch {
          // If restart fails, fall through to normal end behavior
        }
      }
      setIsListening(false);
    };

    return recognition;
  }, [isMobileBrowser]);

  const startListening = useCallback((lang = "nl-NL") => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    // Stop any existing recognition first
    stoppingRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    setError("");
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    accumulatedRef.current = "";
    sessionTranscriptRef.current = "";
    processedUpToIndexRef.current = -1;
    stoppingRef.current = false;
    langRef.current = lang;

    const recognition = createRecognition(lang);
    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, createRecognition]);

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      stoppingRef.current = true;
      const rec = recognitionRef.current;
      if (!rec) {
        resolve(finalTranscriptRef.current);
        return;
      }

      const timeout = setTimeout(() => {
        setIsListening(false);
        setInterimTranscript("");
        recognitionRef.current = null;
        resolve(finalTranscriptRef.current);
      }, 1500);

      rec.onend = () => {
        clearTimeout(timeout);
        setIsListening(false);
        setInterimTranscript("");
        recognitionRef.current = null;
        resolve(finalTranscriptRef.current);
      };

      try { rec.stop(); } catch { clearTimeout(timeout); resolve(finalTranscriptRef.current); }
    });
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    accumulatedRef.current = "";
    sessionTranscriptRef.current = "";
    processedUpToIndexRef.current = -1;
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  };
}
