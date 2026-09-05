import * as THREE from "three";

/**
 * WS7-9 / WS6-12 (step WS7-8 in the Wave-2 brief) — real THREE.VideoTexture
 * for the cinema wall, replacing the per-frame 384×256 canvas drawImage blit.
 *
 * Contract with makeArtwork: once `onReady` fires, the texture carries the
 * native aspect in `tex.userData.aspect` (same convention as paintTex) — the
 * consumer builds/keeps its plane from that aspect and swaps the map with
 * `artwork.setTexture(handle.texture)`. NOTE: makeArtwork sizes its plane at
 * creation and setTexture does NOT rescale — either create the artwork inside
 * `onReady` (poster canvas until then), or letterbox the niche plane from
 * userData.aspect yourself (the WS6-12 cinema-wall path).
 *
 * Autoplay-safe: muted + playsInline (incl. webkit-playsinline for old
 * WKWebView) so inline autoplay works on iOS; a rejected play() surfaces via
 * `onAutoplayBlocked` — the scene shows its play affordance and calls `play()`
 * from the user gesture.
 *
 * Fallback: any load error (or metadata timeout) fires `onError` exactly once
 * — the scene KEEPS its existing canvas/poster path. If metadata still lands
 * later (slow buffered stream), `onReady` fires anyway (late recovery) — the
 * consumer may swap the live texture back in.
 *
 * Decode budget: the browser decodes at the source's native size — pass a
 * tier-appropriate rendition URL (1024-class mobile / 2048 desktop per the
 * plan); this module does not transcode.
 *
 * dispose() truly releases the decoder: pause → clear src → load() (the
 * canonical HTMLMediaElement release dance) → texture.dispose(). The element
 * is never appended to the DOM.
 */

export interface VideoArtworkOptions {
  url: string;
  /** Default true — required for inline autoplay; unmute only from a user gesture. */
  muted?: boolean;
  /** Default true (cinema wall loops). */
  loop?: boolean;
  /** Try to play as soon as metadata lands (default true). */
  autoplay?: boolean;
  /** Default "anonymous" (WebGL needs CORS-clean frames); pass null to omit the attribute for same-origin media. */
  crossOrigin?: string | null;
  /** Metadata deadline before `onError` fires (default 8000ms). */
  timeoutMs?: number;
  /** Metadata loaded: aspect is set on texture.userData — build/rescale the plane now, then artwork.setTexture(texture). */
  onReady?(texture: THREE.VideoTexture, aspect: number): void;
  /** Load failure or timeout (fires once) — keep the existing canvas/poster path and dispose this handle. */
  onError?(error: unknown): void;
  /** Autoplay rejected by the browser — show the play affordance; call play() from the tap. */
  onAutoplayBlocked?(error: unknown): void;
}

export interface VideoArtwork {
  /** The live texture — hand to makeArtwork.setTexture() / the cinema plane's map. */
  texture: THREE.VideoTexture;
  /** The backing element (currentTime/seeking, ended events, unmuting on gesture). Never in the DOM. */
  video: HTMLVideoElement;
  /** True once loadedmetadata fired (userData.aspect is valid). */
  readonly ready: boolean;
  /** Safe play — resolves when playback starts; autoplay-policy rejections route to onAutoplayBlocked and resolve. */
  play(): Promise<void>;
  pause(): void;
  /** Pauses, detaches the source, releases the decoder and disposes the texture. Callbacks never fire after this. */
  dispose(): void;
}

/** Fallback aspect until real metadata arrives (also used when the browser reports 0×0). */
const FALLBACK_ASPECT = 16 / 9;
const DEFAULT_TIMEOUT_MS = 8000;

export function makeVideoArtwork(opts: VideoArtworkOptions): VideoArtwork {
  const video = document.createElement("video");
  video.muted = opts.muted ?? true;
  video.defaultMuted = video.muted;
  video.loop = opts.loop ?? true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.preload = "auto";
  const cross = opts.crossOrigin === undefined ? "anonymous" : opts.crossOrigin;
  if (cross !== null) video.crossOrigin = cross;

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.userData.aspect = FALLBACK_ASPECT;

  let ready = false;
  let failed = false;
  let disposed = false;

  const timer = setTimeout(() => fail(new Error(`video metadata timeout: ${opts.url}`)), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  function fail(err: unknown) {
    if (failed || disposed || ready) return;
    failed = true;
    clearTimeout(timer);
    opts.onError?.(err);
  }

  const tryPlay = () =>
    Promise.resolve(video.play()).catch((err) => {
      if (!disposed) opts.onAutoplayBlocked?.(err);
    });

  const onMeta = () => {
    if (disposed) return;
    // Late recovery (owner R2 #6): on slow links (the Supabase fallback buffers the
    // whole file before first byte) metadata can land AFTER the deadline already
    // fired onError. The scene keeps its poster fallback until then — but a live
    // texture arriving late is strictly better, so `failed` does not block onReady.
    failed = false;
    ready = true;
    clearTimeout(timer);
    const w = video.videoWidth, h = video.videoHeight;
    const aspect = w > 0 && h > 0 ? w / h : FALLBACK_ASPECT;
    texture.userData.aspect = aspect;
    texture.userData.naturalWidth = w;
    texture.userData.naturalHeight = h;
    opts.onReady?.(texture, aspect);
    if (opts.autoplay ?? true) void tryPlay();
  };
  const onErrorEvt = () => fail(video.error ?? new Error(`video load error: ${opts.url}`));

  video.addEventListener("loadedmetadata", onMeta);
  video.addEventListener("error", onErrorEvt);
  video.src = opts.url;

  return {
    texture,
    video,
    get ready() {
      return ready;
    },
    play: () => (disposed ? Promise.resolve() : tryPlay()),
    pause() {
      if (!disposed) video.pause();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("error", onErrorEvt);
      video.pause();
      video.removeAttribute("src");
      video.load(); // canonical decoder release
      texture.dispose();
    },
  };
}
