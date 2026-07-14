All claims are verified against the live code. Writing the definitive diagnosis.

# Definitive Diagnosis: Palace Renders Too Small on Load

## 1. Root cause

**Single shared bug pattern, replicated (copy-pasted) across the three inline scenes — `CorridorScene`, `InteriorScene`, `EntranceHallScene`. `ExteriorScene` is immune and proves the mechanism.**

Each of the three broken scenes sizes its pooled `WebGLRenderer`, its `PerspectiveCamera` aspect ratio, and its post-processing `EffectComposer` **exactly once**, synchronously, from a **raw, unguarded** container measurement taken the instant its mount `useEffect` runs — and the **only** later correction path is a bare `window "resize"` listener. There is **no `ResizeObserver` anywhere in `src/components/3d`** (grep confirmed: zero matches) and the resize handler is **never invoked at init**.

### Proof (file:line, verified against current source)

Unguarded one-shot measurement (no `|| window.innerWidth` fallback):
- `src/components/3d/CorridorScene.tsx:43` — `const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;`
- `src/components/3d/InteriorScene.tsx:100` — `let w=el.clientWidth,h=el.clientHeight;`
- `src/components/3d/EntranceHallScene.tsx:204` — `let w = el.clientWidth, h = el.clientHeight;`

That value is baked into camera + renderer + composer:
- `CorridorScene.tsx:52` `new THREE.PerspectiveCamera(55,w/h,0.3,80)` → `:54` `const ren=borrowRenderer(w,h)` → `:67` `createPostProcessing(ren,scene,camera,"corridor")`
- `InteriorScene.tsx:113` `new THREE.PerspectiveCamera(58,w/h,...)` → `:115` `borrowRenderer(w,h)`
- `EntranceHallScene.tsx:213` `new THREE.PerspectiveCamera(60, w/h, 0.1, 200)` → `:214` `borrowRenderer(w,h)`

Correction path is window-`resize`-only, never called at init, re-reads raw `clientWidth` with no guard:
- `CorridorScene.tsx:1520` `const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);composer.setSize(w,h);};` bound at `:1522`, removed at `:1589`.
- `InteriorScene.tsx:2168` identical `onRs`, bound `:2170`, removed `:2262`.
- `EntranceHallScene.tsx:2163` `onResize` (same logic), bound `:2176`, removed `:2319`.

No `ResizeObserver`: grep `ResizeObserver` over `src/components/3d` → **No files found**.

### Why the measurement is 0/stale at that instant

The three scenes mount **lazily via `<Suspense fallback={null}>`** (`MemoryPalace.tsx:1026-1028`) into a wrapper that is `position:absolute;inset:0;opacity;transition:"opacity 0.4s ease"` (`MemoryPalace.tsx:1023`), inside a root sized `width:100vw;height:100dvh` (`MemoryPalace.tsx:1020`). When the lazy chunk resolves and its measuring `useEffect` runs before that freshly-committed subtree's layout has settled — Suspense commit-before-layout, and/or `100dvh` resolving late on mobile/iOS WKWebView (URL-bar settle) — `el.clientWidth/clientHeight` reads 0 or a small/interim value.

### Why it never self-heals

`renderer.setSize(w,h)` runs with three.js default `updateStyle=true`, so it writes **inline `canvas.style.width/height` in px** (via `borrowRenderer` → `rendererPool.ts:28` / `:45`). The app's only canvas CSS is `canvas{display:block}` (`globals.css:243-245`) and `[role="application"] canvas{touch-action:none}` (`:248-250`) — **there is no `width/height:100%` rule** — so nothing ever stretches that px-pinned canvas back to fill its `100%/100%` mount div (`CorridorScene.tsx:1617-1618`). The palace renders into a tiny box and stays there. A `window "resize"` does **not** fire merely because the container later reached its real size, so the tiny render persists until the user physically resizes/rotates.

### Why ExteriorScene is correct (the control that proves the mechanism)

Two independent reasons:
1. It **alone guards the measurement**: `ExteriorScene.tsx:74` `let w=el.clientWidth||window.innerWidth,h=el.clientHeight||window.innerHeight;`
2. It is mounted in a **persistent body-level portal** that is always full-viewport: `MemoryPalace.tsx:590` `el.style.cssText="position:fixed;inset:0;z-index:5;..."`, portal at `:900-901`, comment at `MemoryPalace.tsx:1024`. Its container therefore never measures 0.

The exact set of scenes lacking the guard (corridor, wings/rooms, entrance) matches the exact set reported as too small. This is conclusive.

## 2. Secondary contributors

- **Missing `canvas{width:100%;height:100%}` CSS** (`globals.css:243-250`). Not the trigger, but it is what makes a bad measurement *permanent and visible* (a locked-small canvas) rather than merely low-resolution. Adding it is worthwhile belt-and-suspenders.
- **Renderer pool passes size through blindly** (`rendererPool.ts:28-29`, `45-46`). It faithfully applies whatever `w,h` the scene hands it, and a borrowed renderer carries stale inline px until the next `setSize`. This amplifies but does not originate the bug; a correct `w,h` fixes it. A defensive `Math.max(1, …)` clamp there is cheap insurance.

### Ruled out (do not chase these)

- **DPR / `setPixelRatio` ordering** — NOT the cause. `rendererPool.ts:29/46` already clamps `Math.min(devicePixelRatio, maxPixelRatio)`. DPR affects only backbuffer crispness, never CSS display size; `setPixelRatio` internally re-runs sizing in three 0.183.
- **Camera FOV / position / zoom / OrbitControls** — NOT the cause. Fixed first-person cameras (FOV 55/58/60), no OrbitControls; framing is correct once the canvas is sized. This is a canvas **size** bug, not a projection bug (proven: a manual window resize snaps it correct with no camera change).
- **Collapsed CSS parent / `opacity:0` zeroing layout** — WRONG. `opacity:0` preserves the layout box; the `100vw × 100dvh → inset:0 → 100%/100%` chain is correct in steady state. The defect is measurement **timing**, not a broken box.

## 3. The exact fix

Introduce one shared sizing helper and apply it to **all four** scenes (Exterior included, for parity so it can't regress), replacing every ad-hoc measure/`onRs`/`onResize`.

### New file: `src/lib/3d/fitRenderer.ts`

```ts
import * as THREE from "three";
import { getQuality } from "./mobilePerf";

export interface FitTarget {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer?: { setSize: (w: number, h: number) => void } | null;
}

/** Read the element's real box, falling back to the viewport so a 0/stale
 *  measurement can never bake a tiny canvas or a NaN aspect. */
export function measure(el: HTMLElement) {
  const w = el.clientWidth || window.innerWidth;
  const h = el.clientHeight || window.innerHeight;
  return { w, h };
}

/** Apply size + DPR + aspect to renderer/camera/composer. Returns applied dims. */
export function applyFit(el: HTMLElement, t: FitTarget) {
  const { w, h } = measure(el);
  if (w < 2 || h < 2) return null; // ignore transient 0
  const dpr = Math.min(window.devicePixelRatio, getQuality().maxPixelRatio);
  t.camera.aspect = w / h;
  t.camera.updateProjectionMatrix();
  t.renderer.setPixelRatio(dpr);
  t.renderer.setSize(w, h);
  t.composer?.setSize(w, h);
  return { w, h };
}

/** Wire self-healing sizing: ResizeObserver (container box changes — the
 *  load-bearing fix), window resize/orientation, and a rAF one-shot so a
 *  stale first-mount measurement corrects on the next frame.
 *  Returns a disposer to call in cleanup. */
export function autoFit(el: HTMLElement, t: FitTarget) {
  const onRs = () => applyFit(el, t);
  window.addEventListener("resize", onRs);
  window.addEventListener("orientationchange", onRs);
  const ro = new ResizeObserver(onRs);
  ro.observe(el);
  const raf = requestAnimationFrame(onRs);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("resize", onRs);
    window.removeEventListener("orientationchange", onRs);
  };
}
```

### Per-scene changes

**Initial measurement** — replace the raw read with the guarded helper so the first buffer/aspect can never be tiny or NaN:
- `CorridorScene.tsx:43`, `InteriorScene.tsx:100`, `EntranceHallScene.tsx:204`:
  ```ts
  const { w, h } = measure(el); // was: let w=el.clientWidth,h=el.clientHeight;
  ```
  (Keep them mutable if other code reassigns `w`/`h`: `let { w, h } = measure(el);`)

**Replace the resize wiring.** After `composer` is created, delete the hand-rolled `onRs`/`onResize` + `window.addEventListener("resize", …)`:
- `CorridorScene.tsx:1520` + `:1522`
- `InteriorScene.tsx:2168` + `:2170`
- `EntranceHallScene.tsx:2163` + `:2176`

and register the shared auto-fit once (place it right after the composer exists, e.g. Corridor `:67`, Interior after composer, Entrance after composer):
```ts
const disposeFit = autoFit(el, { camera, renderer: ren, composer });
```

**Cleanup** — in each cleanup return, replace the manual `window.removeEventListener("resize", …)` with `disposeFit();`:
- `CorridorScene.tsx:1589` → `disposeFit();`
- `InteriorScene.tsx:2262` → `disposeFit();`
- `EntranceHallScene.tsx:2319` → `disposeFit();`

**ExteriorScene** — swap its bespoke `orientationchange` re-fit for `autoFit(el, { camera, renderer: ren })` too, so all four scenes share one path and cannot diverge again. Its existing `:74` guard already matches `measure()`.

### CSS defense-in-depth (recommended, not sufficient alone)

Add to `globals.css` after line 245 so a px-pinned canvas visually fills its box even in the sub-frame before JS re-fits (three.js still owns backbuffer resolution via `setSize`):
```css
[role="application"] canvas { width: 100%; height: 100%; display: block; }
```

### Notes
- `getQuality` is already imported in all three inline scenes (from `./mobilePerf`), and the helper imports it itself — no new scene imports needed beyond `measure`/`autoFit` from `../../lib/3d/fitRenderer`.
- No camera FOV/position/units change is required — framing is correct once sizing is correct.
- `rendererPool` needs no change; optionally clamp `Math.max(1, w)`/`Math.max(1, h)` before `setSize` in `borrowRenderer` as insurance.

The `ResizeObserver` is the durable fix (fires the instant the Suspense/dvh box settles and on every orientation/DPR/flex change); the `requestAnimationFrame` one-shot fixes the reported first-load-too-small even before the observer; the `measure()` viewport fallback is cheap belt-and-suspenders matching Exterior.

## 4. Verification plan

**Build/lint gate**
1. `npm run build` (or `next build`) — ensure the shared helper typechecks and all four scenes compile.
2. Grep sanity: `ResizeObserver` now appears in `src/lib/3d/fitRenderer.ts` and `autoFit(` is referenced in all four scene files; no remaining `let w=el.clientWidth,h=el.clientHeight;` without the guard.

**First-load scale (each scene)** — Exterior → Entrance Hall → a Corridor (wing) → a Room:
- On each transition, the 3D content fills the full viewport at correct scale immediately (no tiny box, no letterbox).
- DevTools: inspect the `<canvas>` — its `style.width/height` (px) must equal the mount div's `clientWidth/clientHeight`, and `canvas.width/height` (backbuffer) ≈ CSS size × `min(devicePixelRatio, maxPixelRatio)`. Assert `camera.aspect === clientWidth/clientHeight` and not `NaN`.

**Resize**
- Drag the window between narrow and wide and between short and tall while inside a Corridor and a Room: canvas tracks the container every frame, no stretching/squishing, aspect stays correct. Confirm this works **without** touching the window chrome by resizing a devtools-docked panel (exercises the `ResizeObserver`, which the old window-only path missed).

**Orientation / mobile (real device + iOS Safari/WKWebView)**
- Load directly into a Room on mobile (worst case for late `100dvh`): must fill viewport on first paint, not tiny.
- Rotate portrait↔landscape in each scene: re-fits correctly, no manual resize needed.
- Show/hide the mobile URL bar (scroll to trigger dvh change): canvas re-fits to the new `100dvh`.

**DPR**
- Drag the window between a hi-DPI and standard-DPI monitor (or toggle devtools device-pixel-ratio): backbuffer resolution updates (`setPixelRatio` re-applied in `applyFit`) while CSS size stays correct.

**Cleanup / leak check**
- Navigate scene → scene → scene repeatedly; confirm via a breakpoint or counter that each `disposeFit()` runs (observer disconnected, listeners removed, rAF cancelled) so observers don't accumulate across the pooled-renderer lifecycle.

**Regression guard**
- Because all four scenes now route sizing through one `autoFit`/`measure` helper, a future scene added without it is the only way to reintroduce the bug — add a lint note/PR-review checklist item: "new 3D scenes must call `autoFit`."

Relevant files: `C:\Users\nelis\memory-palace\src\components\3d\CorridorScene.tsx`, `C:\Users\nelis\memory-palace\src\components\3d\InteriorScene.tsx`, `C:\Users\nelis\memory-palace\src\components\3d\EntranceHallScene.tsx`, `C:\Users\nelis\memory-palace\src\components\3d\ExteriorScene.tsx`, `C:\Users\nelis\memory-palace\src\lib\3d\rendererPool.ts`, `C:\Users\nelis\memory-palace\src\app\globals.css`, `C:\Users\nelis\memory-palace\src\components\MemoryPalace.tsx`, and new `C:\Users\nelis\memory-palace\src\lib\3d\fitRenderer.ts`.