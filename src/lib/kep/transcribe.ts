/**
 * Voice note transcription via OpenAI Whisper API.
 */

const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // Whisper limit: 25 MB

interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Transcribe an audio file using OpenAI Whisper.
 *
 * @param audioBuffer - Raw audio bytes
 * @param mimeType - MIME type of the audio
 * @param filename - Original filename (helps Whisper detect format)
 * @returns Transcription text
 */
export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  filename?: string,
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  if (audioBuffer.byteLength > MAX_AUDIO_SIZE) {
    throw new Error(`Audio too large for transcription: ${audioBuffer.byteLength} bytes (max ${MAX_AUDIO_SIZE})`);
  }

  const ext = mimeType.split("/")[1] || "ogg";
  const file = new File([audioBuffer], filename || `audio.${ext}`, { type: mimeType });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000); // 60s timeout

  try {
    const res = await fetch(WHISPER_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Whisper API error ${res.status}: ${errorBody}`);
    }

    const data = await res.json();

    return {
      text: data.text || "",
      language: data.language,
      duration: data.duration,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Download audio from URL and transcribe.
 * Used when we have a Supabase storage URL for the audio.
 */
export async function transcribeFromUrl(
  audioUrl: string,
  mimeType: string,
): Promise<TranscriptionResult> {
  const res = await fetch(audioUrl);
  if (!res.ok) {
    throw new Error(`Failed to download audio for transcription: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  return transcribeAudio(buffer, mimeType);
}
