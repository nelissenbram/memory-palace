"use client";
import { useRef, useEffect, useState, memo } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createInteriorEnvMap } from "@/lib/3d/environmentMaps";
import { getLightingPreset } from "@/lib/3d/daylightCycle";
import { EXPOSURE, CLEAR_COLOR, INK, GOLD, EMBER, PLASTER } from "@/lib/3d/canon";
import { flag3d } from "@/lib/3d/flags3d";
import { mountAmbientMusic, playFootstep } from "@/lib/3d/ambientAudio";
import { prefersReducedMotion } from "@/lib/3d/reducedMotion";
import { EYE_HEIGHT, MAX_YAW_DEG_S, MAX_WALK_SPEED, SPRINT_SPEED, easeInOutCubic } from "@/lib/3d/cameraComfort";
import { makeFrauncesLabel } from "@/lib/3d/frauncesLabel";
import { loadModel } from "@/lib/3d/modelLoader";
// MUSEO VIVO Wave 2 — w2_hall (WS4-6..9, WS7-7/10/15): Ancestral Wall salon
// hang, dolly-to-frame focus mode, living water/oculus light, bust plaque.
import { computeSalonHang, mountSalonHang, type SalonHangMount, type SalonMemoryRef } from "@/lib/3d/salonHang";
import { createFocusMode, FOCUS_DIM, type FocusMode, type FocusTarget } from "@/lib/3d/focusMode";
import { selectAncestralMemories, makeWaterNormalTexture, makeCausticsTexture, makeOculusPoolTexture } from "@/lib/3d/ancestralWall";
import { paintTex } from "@/lib/3d/textureHelpers";
import type { Mem } from "@/lib/constants/defaults";
import { createDustParticles, createLightBeam } from "@/lib/3d/atmosphericEffects";
import { loadHDRIProgressive, HDRI_INTERIOR, loadMarbleTextures, loadDarkWoodTextures, loadPlasterWallTextures, loadFloorTileTextures, disposePBRSet, isCachedTexture, buildCachedTextureSet, acquireEnvMap, releaseEnvMap, type PBRTextureSet } from "@/lib/3d/assetLoader";
import { acquireMaterialSet, releaseMaterialSet, buildCachedMaterialSet } from "@/lib/3d/materialCache";
import { loadBustModel, type BustStyle, type BustGender } from "@/lib/3d/bustBuilder";
import type { BustPedestalData } from "@/lib/stores/userStore";
import { getQuality, mkPhys, isMobileGPU } from "@/lib/3d/mobilePerf";
import { borrowRenderer, returnRenderer } from "@/lib/3d/rendererPool";
import { measure, autoFit } from "@/lib/3d/fitRenderer";
import { optimizeMaterials } from "@/lib/3d/geometryOptimizer";
import { useOverridableTranslation } from "@/lib/hooks/useTranslation";
import type { Locale } from "@/i18n/config";
import { T } from "@/lib/theme";

/** Shared wing data from wing_shares table */
export interface SharedWingDoor {
  shareId: string;
  wingId: string;       // slug: "roots", "travel", etc.
  ownerName: string;
  ownerId: string;
  permission: string;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// ═══ ENTRANCE HALL — Grand Roman Senate / Pantheon Chamber ═══
const HALL_DOORS = [
  { id: "roots",      locked: false },
  { id: "locked1",    locked: true  },
  { id: "travel",     locked: false },
  { id: "nest",       locked: false },
  { id: "locked2",    locked: true  },
  { id: "craft",      locked: false },
  { id: "passions",   locked: false },
];
const NUM_HALL_DOORS = HALL_DOORS.length; // 7
// Door angles pre-computed for column skip logic
const DOOR_ANGLES = HALL_DOORS.map((_, i) => {
  let a = (i / NUM_HALL_DOORS) * Math.PI * 2 - Math.PI / 2;
  while (a < 0) a += Math.PI * 2;
  return a;
});

/** Convert number to Roman numeral (1-10) */
function toRoman(n: number): string {
  const map = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return map[n] || `${n}`;
}


/** Add 3D bust to scene — loads GLB torso + cameo head for user, full bust for others */
function addBustToScene(
  scene: THREE.Scene, bx: number, bz: number, bustAngle: number,
  style: BustStyle,
  pedestalTopY: number,
  faceImageUrl?: string | null,
  marblePBR?: { map?: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture; aoMap?: THREE.Texture } | null,
  gender?: BustGender | null,
  renderer?: THREE.WebGLRenderer | null,
) {
  loadBustModel(style, gender || "male", faceImageUrl, marblePBR).then((bustGroup) => {
    // Enable clipping on the renderer for torso clipping planes
    if (renderer) renderer.localClippingEnabled = true;

    // Measure raw model bounds
    const box = new THREE.Box3().setFromObject(bustGroup);
    const modelHeight = box.max.y - box.min.y;
    const targetHeight = 1.1;
    const scale = targetHeight / Math.max(modelHeight, 0.01);

    // Center the model at origin first, then scale and position
    const center = box.getCenter(new THREE.Vector3());
    bustGroup.position.set(-center.x, -box.min.y, -center.z);

    // Wrap in a container for clean positioning
    const container = new THREE.Group();
    container.add(bustGroup);
    container.scale.set(scale, scale, scale);
    container.position.set(bx, pedestalTopY, bz);
    // Face toward hall center — lookAt points -Z toward center,
    // but this model faces +Z natively, so rotate 180° after
    container.lookAt(0, pedestalTopY, 0);
    container.rotateY(Math.PI);
    scene.add(container);
  }).catch((err) => {
    console.error("[Bust] FAILED to load:", err);
  });
}

/** Create a name plaque texture for the pedestal */
function createNamePlaqueTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  // Subtle marble-like plaque background
  ctx.fillStyle = "#E8E0D4";
  ctx.fillRect(0, 0, 512, 128);

  // Thin border
  ctx.strokeStyle = "#B8A890";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 112);

  // Roman-style uppercase text with letter spacing
  const displayName = name.toUpperCase();
  // Add manual letter spacing for Roman feel
  const spaced = displayName.split("").join("\u2009"); // thin space between letters
  ctx.fillStyle = "#2a1a0a";
  ctx.font = 'bold 38px "Times New Roman", "Palatino Linotype", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const measured = ctx.measureText(spaced);
  if (measured.width > 470) {
    ctx.font = 'bold 26px "Times New Roman", "Palatino Linotype", Georgia, serif';
  }
  ctx.fillText(spaced, 256, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


function EntranceHallScene({
  onDoorClick,
  wings: wingsProp,
  highlightDoor,
  styleEra = "roman",
  onInlayClick,
  onBustClick,
  lunettePhotos,
  bustPedestals,
  bustTextureUrl,
  bustModelUrl,
  bustProportions,
  bustName,
  bustGender,
  sharedWings,
  autoWalkTo,
  onboardingMode,
  onReady,
  ancestralMemories,
  ancestralPublicOnly,
  onAncestralMemoryClick,
  localeOverride,
}: {
  onDoorClick: (wingId: string) => void;
  wings?: Wing[];
  highlightDoor?: string | null;
  styleEra?: string;
  autoWalkTo?: string | null;
  onboardingMode?: boolean;
  onReady?: () => void;
  onInlayClick?: () => void;
  onBustClick?: (pedestalIndex: number) => void;
  /** W3H: newest photo memory per wing — hung in the door lunettes. */
  lunettePhotos?: Record<string, Mem>;
  bustPedestals?: Record<number, BustPedestalData>;
  bustTextureUrl?: string | null;
  bustModelUrl?: string | null;
  bustProportions?: Record<string, number> | null;
  bustName?: string | null;
  bustGender?: string | null;
  sharedWings?: SharedWingDoor[];
  /** MUSEO VIVO W2 w2_hall (WS4-6): candidate photo memories for the Ancestral
   *  Wall. The hall applies owner decision 4 itself (favorites → oldest, cap
   *  3 mobile / 5 desktop) via selectAncestralMemories, so callers may pass the
   *  full photo corpus. Default [] → warm cream easel empty state. */
  ancestralMemories?: Mem[];
  /** WS7-15 (owner decision 7): visitor routes set true — ONLY memories with
   *  visibility === "public" hang; fewer than 3 public photos → empty state. */
  ancestralPublicOnly?: boolean;
  /** Second tap on a focused Ancestral Wall piece opens the existing memory
   *  interaction (WS7-10) — wire to MemoryPalace's memory viewer. */
  onAncestralMemoryClick?: (mem: Mem) => void;
  /** Demo hosts (the /flythrough onboarding preview): pin canvas-baked texts
   *  (wing door labels via wings.*, plaques) to the demo-local language
   *  instead of the global stored locale. In-app (undefined) = unchanged. */
  localeOverride?: Locale;
}) {
  const { t } = useOverridableTranslation("entranceHall", localeOverride);
  const { t: tw } = useOverridableTranslation("wings", localeOverride);
  const WINGS = wingsProp || DEFAULT_WINGS;
  // ── MUSEO VIVO Wave-2 hall flag (WS4-6..10, WS7-7/10/15): Ancestral Wall,
  // bust plaque, living water/oculus pool, focus mode. Read once at mount
  // (declared before the fingerprint below, which folds the Wave-2 inputs in);
  // flag off = current Wave-1 behavior fully intact.
  const [w2] = useState<boolean>(() => { try { return flag3d("w2_hall"); } catch { return false; } });
  // W3 hall wave (La Sala degli Sguardi) — staging-ON / prod-OFF. Declared
  // before the fingerprint below, which folds the lunette photos in under it.
  const [w3h] = useState<boolean>(() => { try { return flag3d("w3_hall"); } catch { return false; } });
  // ── FINGERPRINT: rebuild the hall only when construction INPUT actually
  // changes (wing id/label/icon/accent, unlocked state, shared-wing doors,
  // translated plaque labels, era) — NOT on parent re-renders, where wingsProp
  // arrives with a fresh array identity from roomStore.getWings(). Same
  // pattern as InteriorScene's structuralFingerprint.
  const wingsFingerprint =
    WINGS.map(w => `${w.id}:${w.nameKey ? tw(w.nameKey) : ""}:${w.name}:${w.icon}:${w.accent}:${w.unlocked === false ? "L" : "U"}`).join("|") +
    "||" + (sharedWings || []).map(s => `${s.shareId}:${s.wingId}`).join("|") +
    `||${styleEra}||${t("sharedBadge")}` +
    // MUSEO VIVO W2 (WS4-6/7): the Ancestral Wall + name plaque rebuild when
    // their construction input changes — memories/name arrive async after the
    // first mount. Folded in ONLY under the w2 flag so flag-off keeps today's
    // rebuild cadence exactly.
    (w2
      ? "||AW:" + (ancestralMemories || []).map(m => `${m.id}:${m.title}:${m.visibility || ""}:${m.createdAt || ""}`).join(",") +
        `|${ancestralPublicOnly ? "P" : ""}|${bustName || ""}`
      : "") +
    // W3H: the door lunettes hang the newest photo per wing — rebuild when
    // that selection changes (memories arrive async after first mount).
    (w3h
      ? "||LUN:" + Object.entries(lunettePhotos || {}).map(([k, m]) => `${k}:${m.id}`).join(",")
      : "");
  const mountRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const onDoorClickRef = useRef(onDoorClick);
  useEffect(() => { onDoorClickRef.current = onDoorClick; }, [onDoorClick]);
  const highlightDoorRef = useRef(highlightDoor);
  useEffect(() => { highlightDoorRef.current = highlightDoor; }, [highlightDoor]);
  const autoWalkToRef = useRef(autoWalkTo);
  useEffect(() => { autoWalkToRef.current = autoWalkTo; }, [autoWalkTo]);
  const onboardingModeRef = useRef(onboardingMode);
  useEffect(() => { onboardingModeRef.current = onboardingMode; }, [onboardingMode]);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const readyFiredRef = useRef(false); // onReady fires EXACTLY once per mount (survives effect re-runs)
  const camDebugRef = useRef<HTMLPreElement | null>(null);
  const camDebug = false; // set true to show camera debug overlay
  const [blinkOpacity, setBlinkOpacity] = useState(0);
  const blinkRef = useRef(0); // updated every frame, React state synced periodically
  // Last value actually PUSHED to setBlinkOpacity. Component-level ref (NOT an
  // animate()-closure local) so it can never desync from the real React state
  // across effect rebuilds or skipCinematic — a desynced shadow made the
  // guarded zero-writes no-op and left a permanent semi-opaque BLACK curtain
  // over the hall (owner: "the entrance hall became very dark", 2026-08-23).
  // Every blinkOpacity write MUST go through pushBlink.
  const blinkPushedRef = useRef(0);
  const pushBlink = (v: number) => { blinkPushedRef.current = v; setBlinkOpacity(v); };
  const entranceCinematicRef = useRef(!!onboardingMode); // only play cinematic in onboarding
  const [cinematicActive, setCinematicActive] = useState(!!onboardingMode);
  // ── ONBOARDING ELEVATION §10 — overlay-UI reads at RENDER scope. The sealed
  // scene-construction effect keeps its own local `reduceMotion` read; this
  // one exists solely because the JSX overlay can't see that closure variable.
  const [reduceMotionUi] = useState(() => prefersReducedMotion());
  // Mobile stack (<48rem width) + short-viewport variant (<26rem height,
  // landscape phones — gated by HEIGHT, not width). Listeners only armed in
  // onboarding mode; the overlay never renders outside it.
  const [narrowCinematicUi, setNarrowCinematicUi] = useState<boolean>(() =>
    typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(max-width: 48rem)").matches);
  const [shortCinematicUi, setShortCinematicUi] = useState<boolean>(() =>
    typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(max-height: 26rem)").matches);
  useEffect(() => {
    if (!onboardingMode || typeof window === "undefined" || !window.matchMedia) return;
    const mqW = window.matchMedia("(max-width: 48rem)");
    const mqH = window.matchMedia("(max-height: 26rem)");
    const onW = () => setNarrowCinematicUi(mqW.matches);
    const onH = () => setShortCinematicUi(mqH.matches);
    onW(); onH();
    mqW.addEventListener("change", onW);
    mqH.addEventListener("change", onH);
    return () => { mqW.removeEventListener("change", onW); mqH.removeEventListener("change", onH); };
  }, [onboardingMode]);
  // ── MUSEO VIVO Wave-1 hall flag (WS4 steps 2-5, WS8, WS12-2/3) — read once at
  // mount per flags3d read-at-mount semantics; all visible Wave-1 changes gate on it.
  const [w1] = useState<boolean>(() => { try { return flag3d("w1_hall"); } catch { return false; } });
  const onAncestralClickRef = useRef(onAncestralMemoryClick);
  useEffect(() => { onAncestralClickRef.current = onAncestralMemoryClick; }, [onAncestralMemoryClick]);
  // Cream crossfade overlay (reduced-motion cinematic; NEVER black — WS12-2)
  const [creamFade, setCreamFade] = useState(0);

  // First-person camera refs (matching InteriorScene pattern)
  const lookA = useRef({ yaw: 0, pitch: 0 });
  const lookT = useRef({ yaw: 0, pitch: 0 });
  const pos = useRef(new THREE.Vector3());
  const posT = useRef(new THREE.Vector3());
  const _rc = useRef(new THREE.Raycaster()), _mouse = useRef(new THREE.Vector2());
  const _dir = useRef(new THREE.Vector3()), _yAxis = useRef(new THREE.Vector3(0, 1, 0));
  const _ld = useRef(new THREE.Vector3()), _lookTarget = useRef(new THREE.Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const drag = useRef(false);
  const prev = useRef({ x: 0, y: 0 });
  const hovMem = useRef<any>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const { w, h } = measure(el);

    // ── PERSISTENT-PORTAL MODE (desktop only) ──
    // MemoryPalace renders the hall into a body-level host carrying a data-paused
    // flag (mirror of the persistent ExteriorScene) ONLY on non-mobile GPUs. When
    // present, the hall stays mounted across entrance↔corridor/room/exterior
    // transitions and merely pauses its frame loop while hidden, so re-entering
    // never rebuilds the scene graph. It then owns a DEDICATED renderer (like the
    // exterior) so the shared pool renderer stays free for corridor/interior.
    const _pausedHost = el.closest<HTMLElement>("[data-paused]");
    const _persistent = !!_pausedHost;
    const _isHidden = () => _persistent && _pausedHost!.dataset.paused === "1";
    let _wasHidden = false;
    // WS10-2: the shared ambient score never stops across scene transitions, so
    // the hidden-edge hooks in animate() are no-ops now — resume just re-arms
    // the idempotent singleton in case autoplay was still blocked at mount.
    const ambientPause: () => void = () => {};
    const ambientResume: () => void = () => { mountAmbientMusic(); };

    const dlPreset = getLightingPreset();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(dlPreset.fogColor);
    // Owner feedback r2 (2026-08-06): thinner golden haze — depth back, no "gouden melk".
    scene.fog = new THREE.FogExp2(dlPreset.fogColor, (w1 ? 0.0042 : 0.006) * dlPreset.fogDensity);

    const Q = getQuality();
    let alive = true;
    // Wave-1 hall flag captured for this mount + the shared reduced-motion
    // singleton (WS12-1) — the w1 cinematic swaps its push-in for the cream
    // crossfade to the same end framing (shot B) when this reports true.
    const W1 = w1;
    // Wave-2 hall flag captured for this mount (WS4-6..10, WS7-7/10/15).
    const W2 = w2;
    // Wave-3 hall flag (La Sala degli Sguardi Wave A) — flag-off byte-identical.
    const W3H = w3h;
    const reduceMotion = prefersReducedMotion();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    // Owner feedback r2: env fill moderated under W1 (key-vs-ambient ratio up).
    const ENV_INT = W1 ? 0.28 : 0.35;
    // Persistent hall owns its renderer (mirrors ExteriorScene); transient
    // corridor/interior keep borrowing the shared pool untouched.
    let _ownRenderer = false;
    let ren: THREE.WebGLRenderer;
    if (_persistent) {
      try {
        ren = new THREE.WebGLRenderer({ antialias: Q.antialias, powerPreference: "high-performance" });
      } catch {
        ren = new THREE.WebGLRenderer({ antialias: false, powerPreference: "default" });
      }
      ren.setSize(w, h);
      ren.setPixelRatio(Math.min(window.devicePixelRatio, Q.maxPixelRatio));
      ren.outputColorSpace = THREE.SRGBColorSpace;
      _ownRenderer = true;
    } else {
      ren = borrowRenderer(w, h);
    }
    ren.shadowMap.enabled = Q.shadowsEnabled;
    if (Q.shadowsEnabled) {
      ren.shadowMap.type = Q.shadowMapSize >= 1024 ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
      ren.shadowMap.autoUpdate = false;
      ren.shadowMap.needsUpdate = true;
    }
    // Golden grade (MUSEO VIVO WS4-1): the 0.7 "eerie" underexposure is dead.
    // Tone mapping lives in the shared EffectPass (NeutralToneMapping @ canon EXPOSURE).
    ren.toneMapping = THREE.NoToneMapping;
    ren.toneMappingExposure = EXPOSURE;
    ren.setClearColor(CLEAR_COLOR, 1);
    ren.outputColorSpace = THREE.SRGBColorSpace;
    ren.localClippingEnabled = true;
    el.appendChild(ren.domElement);

    // ── ENVIRONMENT MAP (IBL) — procedural immediate, real HDRI async ──
    const envMapProc = createInteriorEnvMap(ren, { warmth: dlPreset.envWarmth, brightness: dlPreset.envBrightness });
    scene.environment = envMapProc;
    scene.environmentIntensity = ENV_INT;
    let envMapHDRI: THREE.Texture | null = null;
    if (Q.loadEnvHDRI) {
      loadHDRIProgressive(ren, HDRI_INTERIOR, {
        onProcedural: (p) => { if (!alive) return; scene.environment = p; scene.environmentIntensity = ENV_INT; },
        onFull: (hdr) => { if (!alive) { releaseEnvMap(hdr); return; } envMapHDRI = hdr; scene.environment = hdr; scene.environmentIntensity = ENV_INT; },
      }).catch(() => {}); // keep procedural fallback
    }

    // ── POST-PROCESSING — quality tier handles mobile stripping automatically ──
    // Bloom/vignette inherit the canon SCENE_PRESETS (bloom threshold 0.85,
    // vignette 0.35) — the old 0.25-threshold/0.7-vignette overrides are dead.
    // W3H WAVE C (Sguardi move 3): SELECTIVE HDR BLOOM — threshold 1.0 means
    // LDR-lit plaster/marble physically cannot bloom; only surfaces lifted
    // past 1.0 (the HDR sun disc through the oculus, hot env speculars) glow.
    // SSAO returns on desktop: the coffers/flutes/lunettes earn real contact
    // shading now the geometry exists.
    const composer = createPostProcessing(ren, scene, camera, "entrance", {
      ssao: (W3H && !isMobileGPU()) ? { intensity: 1.7, radius: 0.05, bias: 0.015, samples: 12 } : false,
      ...(W3H ? { bloom: { luminanceThreshold: 1.0, luminanceSmoothing: 0.25, intensity: 0.75 } } : {}),
    });
    const disposeFit = autoFit(el, { camera, renderer: ren, composer });

    // ══ ASSEMBLE-BEFORE-REVEAL (owner 2026-08-23, ExteriorScene parity) ══
    // The hall streams the dome/column hero GLBs, the eager PBR sets and the
    // lunette photo canvases asynchronously, so the rotunda visibly assembled
    // piece by piece after the overlay lifted. Every async attach with visible
    // pop-in registers its promise here; onReady (the overlay/veil-lift
    // contract MemoryPalace/the viewer use) now fires only when the FIRST
    // FRAME has rendered AND this barrier has settled (Promise.allSettled —
    // a single failed load must never strand the reveal) OR the 8s cap has
    // elapsed (slow networks reveal what's there). All loads stay exactly as
    // parallel as before — only the reveal moment moves. Deliberately NOT
    // gated: loadHDRIProgressive above (the procedural env shows from frame 0;
    // the full-HDR swap is a subtle lighting shift, not a pop-in).
    const revealGates: Promise<unknown>[] = [];
    let revealBarrierDone = false;
    // Painting canvases (paintTex) fill in async per image — a canvas gains
    // userData.naturalWidth on its first photo draw. Register each canvas that
    // WILL draw a photo (unlocked + paintable src, mirroring paintTex's own
    // source pick); the bounded poll registered before animate() caps at ~9s
    // so one dead image can never stall past the 8s barrier cap.
    const paintGateTexes: THREE.Texture[] = [];
    const gatePaintTex = <T extends THREE.Texture>(m: { dataUrl?: string | null; thumbnailUrl?: string | null; revealDate?: string } | undefined | null, tx: T): T => {
      if (m && !(m.revealDate && m.revealDate > new Date().toISOString().split("T")[0])) {
        const thumb = m.thumbnailUrl;
        const src = (typeof thumb === "string" && thumb && !thumb.startsWith("data:video")) ? thumb : m.dataUrl;
        if (src) paintGateTexes.push(tx);
      }
      return tx;
    };
    // ── REAL PBR TEXTURES (from Poly Haven) ──
    const marbleTex = loadMarbleTextures([6, 6]);
    const floorTileTex = loadFloorTileTextures([4, 4]);
    const woodDoorTex = loadDarkWoodTextures([2, 3]);
    const wallTex = loadPlasterWallTextures([4, 4]);
    const allTexSets: PBRTextureSet[] = [marbleTex, floorTileTex, woodDoorTex, wallTex];
    // Reveal gate: the eager PBR sets visibly RETEXTURE the biggest surfaces
    // (floor/walls/doors flip from flat colour to full maps). The sets are
    // sync clone-sharing textures (assetLoader loadPBRSet) with no promise
    // API, but a clone's `version` stays 0 until its base image lands
    // (cloneTex/finishBaseLoad) — poll that marker. Bounded: ~9s of attempts,
    // then resolve regardless (the 8s barrier cap fires first anyway).
    {
      const _gateTexes = allTexSets.flatMap((s) => [s.map, s.normalMap, s.roughnessMap, s.aoMap]);
      revealGates.push(new Promise<void>((resolve) => {
        let _tries = 0;
        const check = () => {
          if (_tries++ > 60 || _gateTexes.every((tx) => tx.version > 0)) resolve();
          else setTimeout(check, 150);
        };
        check();
      }));
    }
    // W3H (audit F03): the hall was the ONLY major scene with zero anisotropic
    // filtering — floor/wall maps smeared at grazing angles.
    if (W3H) {
      const maxAniso = ren.capabilities.getMaxAnisotropy();
      const aniso = Math.min(isMobileGPU() ? 4 : 8, maxAniso);
      for (const set of allTexSets) {
        for (const t of [set.map, set.normalMap, set.roughnessMap, set.aoMap]) {
          if (t) { t.anisotropy = aniso; t.needsUpdate = true; }
        }
      }
    }

    // ── MATERIALS (PBR-upgraded with real textures + env map) ──
    // Archetype materials — module-cached so compiled shader programs survive scene
    // transitions. Parameter-keyed on the daylight-preset values used below (lightBeam);
    // the rest are constant. Per-door materials stay per-mount and are disposed normally.
    const msKey = `entrance|zf1|${dlPreset.sunColor}|${dlPreset.sunIntensity}`; // zf1: floorAccent polygonOffset (cache-bust)
    const MS = acquireMaterialSet(msKey, () => ({
      marble: mkPhys(THREE,{ color: "#F5F0E8", roughness: 0.12, metalness: 0.0, envMapIntensity: 1.0, map: marbleTex.map, normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(.4, .4), roughnessMap: marbleTex.roughnessMap, aoMap: marbleTex.aoMap, aoMapIntensity: 0.8, clearcoat: 0.3, clearcoatRoughness: 0.15, reflectivity: 0.7 }),
      marbleWarm: mkPhys(THREE,{ color: "#EDE5D8", roughness: 0.18, metalness: 0.0, envMapIntensity: 0.9, map: floorTileTex.map, normalMap: floorTileTex.normalMap, normalScale: new THREE.Vector2(.3, .3), roughnessMap: floorTileTex.roughnessMap, aoMap: floorTileTex.aoMap, aoMapIntensity: 0.7, clearcoat: 0.2, clearcoatRoughness: 0.2 }),
      marbleDark: new THREE.MeshStandardMaterial({ color: "#C8B89A", roughness: 0.25, metalness: 0.0, envMapIntensity: 0.8, normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(.2, .2) }),
      gold: mkPhys(THREE,{ color: "#D4AF37", roughness: 0.15, metalness: 0.95, envMapIntensity: 1.5, emissive: "#D4AF37", emissiveIntensity: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.1 }),
      goldDark: new THREE.MeshStandardMaterial({ color: "#B8922E", roughness: 0.25, metalness: 0.85, envMapIntensity: 1.2, emissive: "#B8922E", emissiveIntensity: 0.1 }),
      goldBright: mkPhys(THREE,{ color: "#E8C84A", roughness: 0.1, metalness: 0.95, envMapIntensity: 1.8, emissive: "#E8C84A", emissiveIntensity: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.05 }),
      column: new THREE.MeshStandardMaterial({ color: "#F0E8DC", roughness: 0.2, metalness: 0.0, envMapIntensity: 0.9, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.3, .3) }),
      door: new THREE.MeshStandardMaterial({ color: "#8B5E3C", roughness: 0.40, metalness: 0.0, emissive: "#5A3E28", emissiveIntensity: 0.25, map: woodDoorTex.map, normalMap: woodDoorTex.normalMap, normalScale: new THREE.Vector2(.4, .4), roughnessMap: woodDoorTex.roughnessMap, aoMap: woodDoorTex.aoMap, aoMapIntensity: 0.6 }),
      doorFrame: mkPhys(THREE,{ color: "#E8C84A", roughness: 0.1, metalness: 0.95, envMapIntensity: 1.8, emissive: "#E8C84A", emissiveIntensity: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.05 }),
      dome: new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0, envMapIntensity: 0.8, side: THREE.BackSide, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.2, .2) }),
      domeGold: mkPhys(THREE,{ color: "#D4AF37", roughness: 0.15, metalness: 0.95, envMapIntensity: 1.5, clearcoat: 0.3, clearcoatRoughness: 0.1 }),
      floor: mkPhys(THREE,{ color: "#E8DDD0", roughness: 0.35, metalness: 0.02, envMapIntensity: 0.2, map: marbleTex.map, normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(.3, .3), roughnessMap: marbleTex.roughnessMap, aoMap: marbleTex.aoMap, aoMapIntensity: 0.8, clearcoat: 0.15, clearcoatRoughness: 0.4, reflectivity: 0.25 }),
      floorDark: mkPhys(THREE,{ color: "#C4B8A0", roughness: 0.4, metalness: 0.02, envMapIntensity: 0.18, normalMap: floorTileTex.normalMap, normalScale: new THREE.Vector2(.2, .2), clearcoat: 0.1, clearcoatRoughness: 0.45, reflectivity: 0.2 }),
      floorAccent: new THREE.MeshStandardMaterial({ color: "#A89878", roughness: 0.12, metalness: 0.05, envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      bust: new THREE.MeshStandardMaterial({ color: "#E8E0D4", roughness: 0.35, metalness: 0.0, envMapIntensity: 0.7, normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(.15, .15) }),
      bronze: mkPhys(THREE,{ color: "#8A7050", roughness: 0.25, metalness: 0.8, envMapIntensity: 1.1, clearcoat: 0.2, clearcoatRoughness: 0.3 }),
      wall: new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0, envMapIntensity: 0.8, side: THREE.BackSide, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.2, .2), roughnessMap: wallTex.roughnessMap }),
      lightBeam: new THREE.MeshBasicMaterial({ color: dlPreset.sunColor, transparent: true, opacity: 0.06 * dlPreset.sunIntensity, depthWrite: false, blending: THREE.AdditiveBlending }),
      atticDoor: new THREE.MeshStandardMaterial({ color: "#6A5040", roughness: 0.6, metalness: 0.0, map: woodDoorTex.map, normalMap: woodDoorTex.normalMap, normalScale: new THREE.Vector2(.3, .3), roughnessMap: woodDoorTex.roughnessMap }),
      frescoPanel: new THREE.MeshStandardMaterial({ color: "#C4A070", roughness: 0.5, metalness: 0.05, envMapIntensity: 0.5 }),
    }));

    // ── ROOM DIMENSIONS ──
    const RADIUS = 20;
    const WALL_H = 12;
    const DOME_H = 14;
    const TOTAL_H = WALL_H + DOME_H;
    const OCULUS_R = 3.0;
    const NUM_COLS = 24;
    // Build dynamic door list from actual wings (excluding attic)
    const userWings = WINGS.filter(w => w.id !== "attic");
    const doorDefs = userWings.map(w => ({ id: w.id, locked: false }));
    // Add locked slots for shared wings (up to 2)
    const maxSharedSlots = Math.max(0, 2 - Math.max(0, doorDefs.length - 5));
    for (let s = 0; s < maxSharedSlots; s++) doorDefs.push({ id: `locked${s + 1}`, locked: true });
    const NUM_DOORS = doorDefs.length;
    // Compute door angles dynamically
    const doorAngles = doorDefs.map((_, i) => {
      let a = (i / NUM_DOORS) * Math.PI * 2 - Math.PI / 2;
      while (a < 0) a += Math.PI * 2;
      return a;
    });

    // ── MUSEO VIVO W2 (WS4-6): Ancestral Wall bay geometry — the family wall
    // claims the first inter-door bay (between doors 0 and 1, inside the
    // entrance-spawn sightline). Columns/panels inside this arc are skipped so
    // the salon hang reads as one dedicated wall segment.
    const AW_ANGLE = (Math.PI * 1.5 + Math.PI / NUM_DOORS) % (Math.PI * 2);
    const AW_HALF = Math.max(0.15, Math.PI / NUM_DOORS - 0.17); // arc kept clear of door casings
    // Owner feedback 2026-08-06: the Ancestral Wall leaves the entrance hall
    // until it earns a proper redesign (concept approved, execution not).
    // Bust, living water, oculus pool and the focus rig stay live.
    // Ancestral Wall: briefly revived under W3H (privacy path verified:
    // getVisitorAncestralMemories server action + ancestralPublicOnly filter),
    // then ROLLED BACK by owner decision 2026-08-13. The verified privacy
    // notes stand for whenever it returns.
    const AW_ENABLED = false;
    const angDiff = (a: number, b: number) => { let d = Math.abs(a - b); if (d > Math.PI) d = Math.PI * 2 - d; return d; };
    // WS4-7 bust-moment anchor (left-front of the impluvium, facing the spawn).
    const W2_BUST = { x: -4.9, z: 1.7 };

    // ── DOOR DIMENSIONS (MASSIVE) ──
    const DOOR_H = 7.0;
    const DOOR_W = 3.5;
    const DOOR_PANEL_GAP = 0.08; // gap between double-door panels

    // ── LIGHTING (dramatic PBR upgrade) ──
    // Hemisphere: warm sky / cool dark ground for contrast
    // Warm sky + terracotta ground bounce (WS1-6): the near-black #1A0F05
    // ground and 0.15 intensity were a main cause of the "eerie" hall.
    // (W2/WS7-10: `hemi` is captured so focus mode can dim it 15% — same rig.)
    // Owner feedback r2: hemi 0.55→0.34 — ambient down so the oculus key carves depth
    // (same ratio shift the exterior just took: hemi 0.6→0.36).
    const hemi = new THREE.HemisphereLight(dlPreset.ambientColor, dlPreset.groundBounceColor, (W1 ? 0.34 : 0.4) * dlPreset.ambientIntensity / 0.5);
    scene.add(hemi);
    const hemiBase = hemi.intensity;
    if (!W1) {
      // (pre-Wave-1 rig) Main oculus directional light — deleted under w1_hall:
      // the oculus key spot below is THE one shadow caster (WS4-3 light budget).
      const sunLight = new THREE.DirectionalLight(dlPreset.sunColor, 2.4 * dlPreset.sunIntensity);
      sunLight.position.set(0, TOTAL_H + 10, 0);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(Q.shadowMapSize, Q.shadowMapSize);
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 60;
      sunLight.shadow.camera.left = -12;
      sunLight.shadow.camera.right = 12;
      sunLight.shadow.camera.top = 12;
      sunLight.shadow.camera.bottom = -12;
      sunLight.shadow.bias = -0.001;
      scene.add(sunLight);
      // Warm fill light (subtle, for depth)
      const fillLight = new THREE.DirectionalLight(dlPreset.fillColor, 0.2 * dlPreset.fillIntensity / 0.35);
      fillLight.position.set(-10, 8, 5);
      scene.add(fillLight);
    }
    // Oculus key spot — under w1_hall this is THE one shadow in the hall:
    // static 1024 map, normalBias 0.03, radius 6 (budget law; autoUpdate=false above).
    // Owner feedback r2: key 2.8→3.9 (~exterior's zon 3.2→4.4) — the shaft reads again.
    const oculusSpot = new THREE.SpotLight(dlPreset.sunColor, (W1 ? 3.9 : 2.4) * dlPreset.sunIntensity, 50, Math.PI / 4, 0.5, 0.8);
    oculusSpot.position.set(0, TOTAL_H - 1, 0);
    // W3H (Wave A graft "the one real sun"): tilt the shaft ~22° toward canon
    // SW so the light pool lands off-centre like a real sun — a straight-down
    // shaft reads as a stage light, not daylight.
    oculusSpot.target.position.set(W3H ? -4 : 0, 0, W3H ? 4 : 0);
    oculusSpot.castShadow = true;
    if (W1) {
      oculusSpot.shadow.mapSize.set(1024, 1024);
      oculusSpot.shadow.normalBias = 0.03;
      oculusSpot.shadow.radius = 4; // r2: crisper shadow edge now the key is stronger
    } else {
      oculusSpot.shadow.mapSize.set(Q.shadowMapSize, Q.shadowMapSize);
    }
    scene.add(oculusSpot);
    scene.add(oculusSpot.target);
    // Secondary warm fill from oculus (warm point 1 of max 2 under w1_hall)
    // Owner feedback r2: fill 0.9→0.55 — the flat gold wash came from here.
    const oculusFill = new THREE.PointLight(dlPreset.fillColor, (W1 ? 0.55 : 0.7) * dlPreset.sunIntensity, 40);
    oculusFill.position.set(0, TOTAL_H - 2, 0);
    scene.add(oculusFill);
    const oculusFillBase = oculusFill.intensity;

    // ── FLOOR — radial marble mosaic ──
    // W3H ROOT CAUSE (owner: "water komt niet door"): the floor was a SOLID
    // disc — the sunken impluvium and its water have always been UNDERNEATH
    // it, completely invisible. Cut a real 7×5 opening over the pool.
    let floorGeo: THREE.BufferGeometry;
    if (W3H) {
      const fShape = new THREE.Shape();
      fShape.absarc(0, 0, RADIUS + 1, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      // (shape is built in XY then rotated -90° about X: shape Y maps to -Z,
      // so the 7×5 pool rect keeps its aspect after rotation)
      hole.moveTo(-3.5, -2.5); hole.lineTo(3.5, -2.5);
      hole.lineTo(3.5, 2.5); hole.lineTo(-3.5, 2.5);
      hole.closePath();
      fShape.holes.push(hole);
      floorGeo = new THREE.ShapeGeometry(fShape, 64);
      // ShapeGeometry emits raw-coordinate UVs — normalise to the same 0..1
      // disc mapping CircleGeometry used, so the floor texture scale is
      // unchanged from the pre-W3H look.
      const uv = floorGeo.getAttribute("uv") as THREE.BufferAttribute;
      const span = 2 * (RADIUS + 1);
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) / span + 0.5, uv.getY(i) / span + 0.5);
      }
      uv.needsUpdate = true;
    } else {
      floorGeo = new THREE.CircleGeometry(RADIUS + 1, 64);
    }
    const floorMesh = new THREE.Mesh(floorGeo, MS.floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Radial floor rings — z-fight sweep r2: lifted (0.003→0.005) and the shared
    // floorAccent material carries polygonOffset against the grazing-angle floor.
    // W3H: rings start OUTSIDE the pool opening (r=2 ran straight across it)
    for (let r = W3H ? 5 : 2; r < RADIUS; r += 3) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.15, 64),
        MS.floorAccent
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.005;
      ring.receiveShadow = true;
      scene.add(ring);
    }
    // Radial spokes — r2: lifted above the ring plane (top 0.011 vs ring 0.005)
    // W3H: shortened so they start beyond the pool opening instead of
    // crossing the water.
    const spokeLen = W3H ? RADIUS - 6 : RADIUS - 2;
    const spokeMid = W3H ? (RADIUS + 3.5) / 2 : RADIUS / 2 - 1;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spoke = mk(new THREE.BoxGeometry(0.1, 0.004, spokeLen), MS.floorAccent,
        Math.sin(angle) * spokeMid, 0.009, Math.cos(angle) * spokeMid);
      spoke.rotation.y = -angle;
      scene.add(spoke);
    }
    // Center medallion — W3H: gone; the centre of the hall is the WATER now
    // (the gold disc + star drew on top of the covered pool — the "olive
    // disc" the owner kept seeing).
    if (!W3H) {
      const centerMedallion = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32), MS.floorDark);
      centerMedallion.rotation.x = -Math.PI / 2;
      centerMedallion.position.y = 0.005;
      centerMedallion.receiveShadow = true;
      scene.add(centerMedallion);
      const innerMedallion = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), MS.gold);
      innerMedallion.rotation.x = -Math.PI / 2;
      innerMedallion.position.y = 0.007;
      scene.add(innerMedallion);
      const starGeo = new THREE.CircleGeometry(1.5, 5);
      const starMesh = new THREE.Mesh(starGeo, MS.marbleDark);
      starMesh.rotation.x = -Math.PI / 2;
      starMesh.position.y = 0.009;
      scene.add(starMesh);
    }
    // Alternating floor tiles in rings — merged into single geometry
    {
      const tileShapes: THREE.Shape[] = [];
      // W3H: the pool rect corners reach r=4.30 — inner-ring tiles starting at
      // r=4 overhung the opening as pale triangles "biting" the water corners.
      const overPool = (x: number, z: number) => W3H && Math.abs(x) < 3.9 && Math.abs(z) < 2.9;
      for (let r = 4; r < RADIUS - 1; r += 3) {
        const segments = Math.floor(r * 2);
        for (let s = 0; s < segments; s++) {
          if (s % 2 === 0) continue;
          const a1 = (s / segments) * Math.PI * 2;
          const a2 = ((s + 1) / segments) * Math.PI * 2;
          if (overPool(Math.cos(a1) * r, Math.sin(a1) * r) || overPool(Math.cos(a2) * r, Math.sin(a2) * r)) continue;
          const shape = new THREE.Shape();
          shape.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
          shape.lineTo(Math.cos(a1) * (r + 2.5), Math.sin(a1) * (r + 2.5));
          shape.lineTo(Math.cos(a2) * (r + 2.5), Math.sin(a2) * (r + 2.5));
          shape.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
          shape.closePath();
          tileShapes.push(shape);
        }
      }
      const mergedTileGeos = tileShapes.map(s => new THREE.ShapeGeometry(s));
      const mergedTile = mergeGeometries(mergedTileGeos);
      if (mergedTile) {
        const tileMesh = new THREE.Mesh(mergedTile, MS.floorDark);
        tileMesh.rotation.x = -Math.PI / 2;
        tileMesh.position.y = 0.002;
        tileMesh.receiveShadow = true;
        scene.add(tileMesh);
      }
    }

    // ── CYLINDRICAL WALL ──
    const wallGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, WALL_H, 64, 1, true);
    const wallMesh = new THREE.Mesh(wallGeo, MS.wall);
    wallMesh.position.y = WALL_H / 2;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    // Base molding
    const baseMold = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS, 0.18, 8, 64),
      MS.marbleDark
    );
    baseMold.rotation.x = Math.PI / 2;
    baseMold.position.y = 0.18;
    scene.add(baseMold);

    // Top cornice (thicker)
    const cornice = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS - 0.1, 0.3, 8, 64),
      MS.gold
    );
    cornice.rotation.x = Math.PI / 2;
    cornice.position.y = WALL_H;
    scene.add(cornice);
    // Second cornice line
    const cornice2 = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS - 0.15, 0.15, 8, 64),
      MS.goldDark
    );
    cornice2.rotation.x = Math.PI / 2;
    cornice2.position.y = WALL_H - 0.4;
    scene.add(cornice2);

    // ── DOME ──
    const domeGeo = new THREE.SphereGeometry(RADIUS, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, MS.dome);
    domeMesh.position.y = WALL_H;
    scene.add(domeMesh);

    // Gold rim at dome base
    const domeRim = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS - 0.05, 0.35, 10, 64),
      MS.domeGold
    );
    domeRim.rotation.x = Math.PI / 2;
    domeRim.position.y = WALL_H + 0.1;
    scene.add(domeRim);

    // Dome coffered ribs
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let t = 0.06; t < 0.48; t += 0.015) {
        const phi = t * Math.PI;
        const r2 = RADIUS * Math.sin(phi);
        const y2 = WALL_H + RADIUS * Math.cos(phi);
        points.push(new THREE.Vector3(Math.cos(angle) * (r2 - 0.1), y2, Math.sin(angle) * (r2 - 0.1)));
      }
      const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.07, 6, false);
      const rib = new THREE.Mesh(ribGeo, MS.goldDark);
      scene.add(rib);
    }
    // Concentric dome rings (more rings)
    // W3H: the GLB dome carries its own coffer articulation — no gold hoops
    if (!W3H) for (let ring = 1; ring <= 4; ring++) {
      const phi = (ring / 8) * Math.PI / 2;
      const ringR = RADIUS * Math.sin(phi);
      const ringY = WALL_H + RADIUS * Math.cos(phi);
      const domeRing = new THREE.Mesh(
        new THREE.TorusGeometry(ringR, 0.05, 6, 48),
        MS.goldDark
      );
      domeRing.rotation.x = Math.PI / 2;
      domeRing.position.y = ringY;
      scene.add(domeRing);
    }
    // Coffer recesses (rosettes at intersections)
    // W3H (audit): these 36 discs face OUTWARD from the dome interior — they
    // are backface-culled and never render, they only burn 36 draw calls.
    if (!W3H) for (let ri = 1; ri <= 3; ri++) {
      const phi = (ri / 6) * Math.PI / 2;
      const ringR = RADIUS * Math.sin(phi);
      const ringY = WALL_H + RADIUS * Math.cos(phi);
      for (let i = 0; i < 12; i++) {
        const angle = ((i + 0.5) / 12) * Math.PI * 2;
        const rosette = new THREE.Mesh(
          new THREE.CircleGeometry(0.25, 8),
          MS.goldDark
        );
        rosette.position.set(
          Math.cos(angle) * (ringR - 0.15),
          ringY,
          Math.sin(angle) * (ringR - 0.15)
        );
        // face outward from center of dome
        rosette.lookAt(
          Math.cos(angle) * (ringR + 5),
          ringY,
          Math.sin(angle) * (ringR + 5)
        );
        scene.add(rosette);
      }
    }

    // Oculus opening
    const oculusGeo = new THREE.CircleGeometry(OCULUS_R, 32);
    const oculusMat = new THREE.MeshBasicMaterial({ color: "#F0E8D8" });
    const oculusMesh = new THREE.Mesh(oculusGeo, oculusMat);
    oculusMesh.rotation.x = Math.PI / 2;
    oculusMesh.position.y = TOTAL_H - 0.3;
    scene.add(oculusMesh);

    // ═══ W3H WAVE B — THE DOME HERO (La Sala degli Sguardi move 4) ═══
    // Blender-authored spherical-cap dome GLB: a TRUE oculus opening at the
    // apex (the old dome was a solid r=20 hemisphere with a flat cream disc
    // floating 6m BELOW its apex), 4 rings × 24 real recessed coffers with
    // proud frames, CPU-baked AO folded into the albedo. DRACO, 271KB, ~8k
    // tris. Canary pattern: procedural dome stays as the load-failure path.
    if (W3H) {
      revealGates.push(loadModel("/models/hall/dome_hall_w3.glb?v=1").then((g) => {
        g.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.side = THREE.DoubleSide;   // inward-facing shell, no winding risk
          mat.envMapIntensity = 0.45;
          m.material = mat;
          m.castShadow = false; m.receiveShadow = false;
        });
        g.position.y = WALL_H;
        scene.add(g);
        // GLB seated → retire the procedural dome + the floating fake disc
        domeMesh.visible = false;
        oculusMesh.visible = false;
        // warm sky through the REAL hole — the brightest surface in the hall.
        // Wave C: HDR-lifted past the 1.0 bloom threshold — in any screenshot
        // the blooming pixels ARE the sun (the enforcement mechanism of the
        // whole "memories/sun brightest" dogma).
        const skyDiscMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        skyDiscMat.color.setRGB(2.5, 1.95, 1.15);
        const skyDisc = new THREE.Mesh(
          new THREE.CircleGeometry(OCULUS_R + 1.8, 32),
          skyDiscMat
        );
        skyDisc.rotation.x = Math.PI / 2;
        skyDisc.position.y = WALL_H + 15.4;
        scene.add(skyDisc);
        // audit F02 generalized: the one-shot shadow bake ran before this
        // async GLB arrived — rebake so the new geometry participates.
        ren.shadowMap.needsUpdate = true;
      }).catch((err) => {
        console.warn("[W3H] dome GLB load failed, keeping procedural dome", err);
      }));
    }
    // Oculus ring (thicker)
    const oculusRing = new THREE.Mesh(
      new THREE.TorusGeometry(OCULUS_R, 0.35, 10, 32),
      MS.gold
    );
    oculusRing.rotation.x = Math.PI / 2;
    oculusRing.position.y = TOTAL_H - 0.3;
    scene.add(oculusRing);

    // ── VOLUMETRIC LIGHT CONE from oculus — deleted under w1_hall (WS4-5/WS10-3:
    // ONE oculus beam max; the createLightBeam system below is THE beam) ──
    let beamMesh: THREE.Mesh | null = null;
    if (!W1) {
      const beamGeo = new THREE.ConeGeometry(6, 22, 16, 1, true);
      beamMesh = new THREE.Mesh(beamGeo, MS.lightBeam);
      beamMesh.position.y = TOTAL_H - 11;
      scene.add(beamMesh);
    }

    // ── COLUMNS (skip columns that would block doors or exit portal) ──
    const colR = 0.4;
    const colH = WALL_H - 0.5;
    const COL_SKIP_THRESHOLD = 0.22; // skip columns within ~12.5° of a door center
    const EXIT_PORTAL_ANGLE = Math.PI / 2;
    const SKIP_ANGLES = [...doorAngles, EXIT_PORTAL_ANGLE]; // skip near doors AND exit
    const validColAngles: number[] = [];
    for (let i = 0; i < NUM_COLS; i++) {
      let colAngle = (i / NUM_COLS) * Math.PI * 2;
      let skip = false;
      for (const dA of SKIP_ANGLES) {
        let diff = Math.abs(colAngle - dA);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < COL_SKIP_THRESHOLD) { skip = true; break; }
      }
      // W2 (WS4-6): keep the Ancestral Wall bay open — no columns in front of
      // the family photos (mirrors the door/exit clearings above).
      if (W2 && AW_ENABLED && angDiff(colAngle, AW_ANGLE) < AW_HALF + 0.06) skip = true;
      if (!skip) validColAngles.push(colAngle);
    }
    const NUM_VALID_COLS = validColAngles.length;

    // Column shaft
    const colShaftGeo = new THREE.CylinderGeometry(colR, colR * 1.08, colH, 16);
    const colBaseMesh = new THREE.InstancedMesh(colShaftGeo, MS.column, NUM_VALID_COLS);
    colBaseMesh.castShadow = true;
    colBaseMesh.receiveShadow = true;
    const colMatrix = new THREE.Matrix4();
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH / 2, cz);
      colBaseMesh.setMatrixAt(idx, colMatrix);
    });
    colBaseMesh.instanceMatrix.needsUpdate = true;
    scene.add(colBaseMesh);

    // Column capitals
    const capGeo = new THREE.CylinderGeometry(colR * 1.8, colR * 1.1, 0.6, 16);
    const capMesh = new THREE.InstancedMesh(capGeo, MS.gold, NUM_VALID_COLS);
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH + 0.3, cz);
      capMesh.setMatrixAt(idx, colMatrix);
    });
    capMesh.instanceMatrix.needsUpdate = true;
    scene.add(capMesh);

    // Capital abacus
    const abacusGeo = new THREE.BoxGeometry(colR * 3.2, 0.12, colR * 3.2);
    const abacusMesh = new THREE.InstancedMesh(abacusGeo, MS.marbleWarm, NUM_VALID_COLS);
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH + 0.66, cz);
      abacusMesh.setMatrixAt(idx, colMatrix);
    });
    abacusMesh.instanceMatrix.needsUpdate = true;
    scene.add(abacusMesh);

    // Column bases
    const baseGeo = new THREE.CylinderGeometry(colR * 1.3, colR * 1.5, 0.35, 16);
    const baseMeshI = new THREE.InstancedMesh(baseGeo, MS.marbleDark, NUM_VALID_COLS);
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, 0.175, cz);
      baseMeshI.setMatrixAt(idx, colMatrix);
    });
    baseMeshI.instanceMatrix.needsUpdate = true;
    scene.add(baseMeshI);

    // Column fluting — simplified: just 2 rings per column (instanced)
    const fluteRingGeo = new THREE.TorusGeometry(colR + 0.02, 0.03, 6, 16);
    const fluteRingCount = NUM_VALID_COLS * 2;
    const fluteRingInst = new THREE.InstancedMesh(fluteRingGeo, MS.marbleWarm, fluteRingCount);
    const fMatrix = new THREE.Matrix4();
    const fQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      for (let ri = 0; ri < 2; ri++) {
        const ry = ri === 0 ? 0.7 : colH - 0.5;
        fMatrix.compose(new THREE.Vector3(cx, ry, cz), fQuat, new THREE.Vector3(1, 1, 1));
        fluteRingInst.setMatrixAt(idx * 2 + ri, fMatrix);
      }
    });
    fluteRingInst.instanceMatrix.needsUpdate = true;
    scene.add(fluteRingInst);

    // ═══ W3H WAVE B — COLUMN HERO KIT ═══
    // Blender-authored classical column (20-flute tapered shaft, attic base,
    // gold acanthus bell capital + abacus, CPU-baked AO in the albedo).
    // Two child meshes → two InstancedMeshes over the same validColAngles.
    // Canary: the 5 procedural instanced meshes hide only on load success.
    if (W3H) {
      revealGates.push(loadModel("/models/hall/column_hall_w3.glb?v=1").then((g) => {
        const parts: THREE.Mesh[] = [];
        g.updateMatrixWorld(true);
        g.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) parts.push(m); });
        if (!parts.length) return;
        const im4 = new THREE.Matrix4();
        for (const part of parts) {
          const mat = (part.material as THREE.MeshStandardMaterial).clone();
          mat.envMapIntensity = 0.55;
          // glTF puts the Z-up→Y-up conversion in the NODE transform, not the
          // vertices — bake it in, or every instanced column lies flat under
          // the floor.
          const geo = part.geometry.clone();
          geo.applyMatrix4(part.matrixWorld);
          const inst = new THREE.InstancedMesh(geo, mat, NUM_VALID_COLS);
          validColAngles.forEach((angle, idx) => {
            const cx = Math.cos(angle) * (RADIUS - 0.8);
            const cz = Math.sin(angle) * (RADIUS - 0.8);
            im4.makeTranslation(cx, 0, cz);
            inst.setMatrixAt(idx, im4);
          });
          inst.instanceMatrix.needsUpdate = true;
          inst.castShadow = true;
          inst.receiveShadow = true;
          scene.add(inst);
        }
        // GLB seated → retire the procedural column kit
        colBaseMesh.visible = false;
        capMesh.visible = false;
        abacusMesh.visible = false;
        baseMeshI.visible = false;
        fluteRingInst.visible = false;
        // audit F02 generalized: rebake the static shadow map now the real
        // columns exist — otherwise they cast nothing (bake ran pre-load).
        ren.shadowMap.needsUpdate = true;
      }).catch((err) => {
        console.warn("[W3H] column GLB load failed, keeping procedural columns", err);
      }));
    }

    // ── 7 GRAND DOORS ──
    const doorMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; wingId: string; angle: number }[] = [];
    const lunetteTextures: THREE.Texture[] = []; // scene-owned paintTex canvases (disposed in cleanup)

    // ── P2-6: hoisted per-door resources — geometry and constant-material
    // CONTENT is identical for every door (only the mesh transforms differ),
    // so build each once instead of 7x per construction. Materials that the
    // hover/glow code mutates per door (doorMat, nicheMat) stay per-door in
    // the loop below. Output is identical: optimizeMaterials() already merged
    // identical-fingerprint materials into shared instances at render time.
    const frameThick = 0.3;
    const frameDepth = 0.25;
    const panelW = (DOOR_W - DOOR_PANEL_GAP) / 2;
    const archW = DOOR_W / 2 + 0.3;
    const archH = 1.2;
    const archPoints = new THREE.EllipseCurve(0, 0, archW, archH, 0, Math.PI, false, 0)
      .getPoints(30).map(p => new THREE.Vector3(p.x, p.y, 0));
    const nicheArchW = DOOR_W / 2 - 0.15;
    const nicheArchH = 1.0;
    const nicheArchPts = new THREE.EllipseCurve(0, 0, nicheArchW, nicheArchH, 0, Math.PI, false, 0)
      .getPoints(24).map(p => new THREE.Vector3(p.x, p.y, 0));
    const DS = {
      // shared geometries
      recessGeo: new THREE.PlaneGeometry(DOOR_W + 0.8, DOOR_H + 0.6),
      lpGeo: new THREE.BoxGeometry(frameThick, DOOR_H + 0.3, frameDepth),
      lintelGeo: new THREE.BoxGeometry(DOOR_W + frameThick * 2 + 0.2, 0.35, frameDepth),
      threshGeo: new THREE.BoxGeometry(DOOR_W + frameThick * 2 + 0.2, 0.10, frameDepth),
      archGeo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 30, 0.08, 8, false),
      keystoneGeo: new THREE.BoxGeometry(0.25, 0.35, 0.15),
      panelGeo: new THREE.BoxGeometry(panelW, DOOR_H, 0.25),
      seamGeo: new THREE.BoxGeometry(0.04, DOOR_H - 0.3, 0.005),
      insetGeo: new THREE.BoxGeometry(panelW * 0.65, 1.8, 0.04),
      borderGeo: new THREE.BoxGeometry(panelW * 0.68, 1.8 + 0.06, 0.02),
      handleRingGeo: new THREE.TorusGeometry(0.14, 0.03, 10, 16),
      handlePlateGeo: new THREE.CircleGeometry(0.06, 10),
      nichePanelGeo: new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.15),
      nicheArchGeo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(nicheArchPts), 24, 0.035, 6, false),
      etchGeo: new THREE.BoxGeometry(0.06, DOOR_H * 0.75, 0.02),
      lockMedallionGeo: new THREE.CircleGeometry(0.22, 24),
      keyholeCircleGeo: new THREE.CircleGeometry(0.06, 12),
      keyholeSlotGeo: new THREE.PlaneGeometry(0.035, 0.1),
      labelGeo: new THREE.PlaneGeometry(2.8, 0.54),
      labelGeoShared: new THREE.PlaneGeometry(2.8, 0.72),
      // constant materials (never mutated after creation)
      recessUnlockedMat: new THREE.MeshStandardMaterial({ color: "#1A1008", roughness: 0.9, metalness: 0.0 }),
      recessLockedMat: new THREE.MeshStandardMaterial({ color: "#D8D0C4", roughness: 0.35, metalness: 0.0, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.15, .15) }),
      insetMat: new THREE.MeshStandardMaterial({
        color: W3H ? "#6E4826" : "#5A3A1E", roughness: 0.55, metalness: 0.0,
        // W3H: recessed panels carry the same real wood grain as the leaves
        ...(W3H ? { map: woodDoorTex.map, normalMap: woodDoorTex.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughnessMap: woodDoorTex.roughnessMap } : {}),
      }),
      handlePlateMat: new THREE.MeshStandardMaterial({ color: "#8A7040", roughness: 0.3, metalness: 0.7 }),
      nicheArchOutlineMat: new THREE.MeshStandardMaterial({ color: "#B8A070", roughness: 0.3, metalness: 0.5, emissive: "#B8A070", emissiveIntensity: 0.08 }),
      etchMat: new THREE.MeshStandardMaterial({ color: "#B8A070", roughness: 0.35, metalness: 0.4, emissive: "#B8A070", emissiveIntensity: 0.06 }),
      lockMedallionMat: new THREE.MeshStandardMaterial({ color: "#C8B080", roughness: 0.25, metalness: 0.7, emissive: "#C8B080", emissiveIntensity: 0.05 }),
      keyholeDarkMat: new THREE.MeshStandardMaterial({ color: "#2A2010", roughness: 0.8, metalness: 0.0 }),
    };

    // ── WAVE-1 SHARED DOOR RESOURCES (WS4-3/4): the deleted doorFill/doorFaceSpot
    // rigs are compensated with ONE shared additive glow texture (sprite above each
    // door + warm pool decal at each threshold — zero dynamic-light cost), ink door
    // casings, an ember hover outline, and a gold walkthrough ring decal (replaces
    // the 7 intensity-0 hlDoorLights). All disposed by the scene traversal below.
    let w1GlowSpriteMat: THREE.SpriteMaterial | null = null;
    let w1PoolMat: THREE.MeshBasicMaterial | null = null;
    let w1PoolGeo: THREE.PlaneGeometry | null = null;
    let w1InkCasingMat: THREE.MeshStandardMaterial | null = null;
    let w1HoverPlane: THREE.Mesh | null = null;
    let w1HlRing: THREE.Mesh | null = null;
    if (W1) {
      const gc = document.createElement("canvas");
      gc.width = gc.height = 128;
      const gctx = gc.getContext("2d")!;
      const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,216,168,0.85)");
      grad.addColorStop(0.5, "rgba(255,196,130,0.30)");
      grad.addColorStop(1, "rgba(255,184,112,0)");
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, 128, 128);
      const glowTex = new THREE.CanvasTexture(gc);
      glowTex.colorSpace = THREE.SRGBColorSpace;
      // r2: baked compensation eases off (0.5→0.42 / 0.35→0.28) now the key is stronger;
      // polygonOffset keeps the floor pool clear of the mosaic Greek-key tops (z-fight).
      // W3H: the 0.42 additive glow bleached the middle of every door — any
      // wood grain was blown to flat orange. The gilded labels + real wood
      // carry the door read now, so the compensation glow steps way back.
      w1GlowSpriteMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: W3H ? 0.16 : 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
      w1PoolMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: W3H ? 0.2 : 0.28, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      w1PoolGeo = new THREE.PlaneGeometry(4.2, 4.2);
      w1InkCasingMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.4 });
      // Ember hover outline plane — the ONLY interactive accent (dogma 3); moved to
      // the hovered door each frame, replaces the emissive hover/proximity glow loop.
      w1HoverPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(DOOR_W + 0.5, DOOR_H + 0.5),
        new THREE.MeshBasicMaterial({ color: EMBER, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      w1HoverPlane.visible = false;
      scene.add(w1HoverPlane);
      // Gold walkthrough ring decal (no PointLight)
      w1HlRing = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.45, 48),
        // z-fight sweep r2: offset + lifted above the floor decal stack (spokes 0.011)
        new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      );
      w1HlRing.rotation.x = -Math.PI / 2;
      w1HlRing.position.y = 0.04;
      w1HlRing.renderOrder = 1;
      scene.add(w1HlRing);
    }

    // W3H (owner: door texture "komt niet door"): a HIGH-CONTRAST procedural
    // plank albedo — vertical planks with grain streaks and per-plank tone —
    // guaranteed to read at hall distance (the subtle 1k PBR diffuse did not).
    // The dark_wood normal/roughness maps stay for relief.
    let w3DoorWoodTex: THREE.CanvasTexture | null = null;
    if (W3H) {
      const wc = document.createElement("canvas"); wc.width = 256; wc.height = 512;
      const wctx = wc.getContext("2d");
      if (wctx) {
        const PLANKS = 4, pw = 256 / PLANKS;
        for (let p = 0; p < PLANKS; p++) {
          const h2 = Math.sin(p * 127.1 + 7.7) * 43758.5453;
          const v2 = (h2 - Math.floor(h2)) * 52 - 26; // strong plank-to-plank tone
          wctx.fillStyle = `rgb(${112 + v2 | 0},${76 + v2 * 0.7 | 0},${46 + v2 * 0.5 | 0})`;
          wctx.fillRect(p * pw, 0, pw, 512);
          // rail shading top/bottom so the leaf reads constructed, not painted
          const railG = wctx.createLinearGradient(0, 0, 0, 512);
          railG.addColorStop(0, "rgba(30,18,8,0.35)");
          railG.addColorStop(0.12, "rgba(30,18,8,0)");
          railG.addColorStop(0.88, "rgba(30,18,8,0)");
          railG.addColorStop(1, "rgba(30,18,8,0.4)");
          wctx.fillStyle = railG;
          wctx.fillRect(p * pw, 0, pw, 512);
          // grain: wavy vertical streaks (owner round 2: "duidelijker")
          for (let s2 = 0; s2 < 14; s2++) {
            const h3 = Math.sin((p * 13 + s2) * 91.7) * 4375.5;
            const gx2 = p * pw + (h3 - Math.floor(h3)) * pw;
            const dark = s2 % 3 === 0 ? 0.45 : 0.25;
            wctx.strokeStyle = `rgba(48,28,12,${dark})`;
            wctx.lineWidth = s2 % 4 === 0 ? 3.2 : 1.6;
            wctx.beginPath();
            wctx.moveTo(gx2, 0);
            for (let yy = 0; yy <= 512; yy += 32) {
              wctx.lineTo(gx2 + Math.sin(yy * 0.02 + s2 * 2 + p) * 3.5, yy);
            }
            wctx.stroke();
          }
          // plank seam
          wctx.fillStyle = "rgba(40,24,10,0.55)";
          wctx.fillRect(p * pw, 0, 2, 512);
        }
      }
      w3DoorWoodTex = new THREE.CanvasTexture(wc);
      w3DoorWoodTex.colorSpace = THREE.SRGBColorSpace;
      w3DoorWoodTex.anisotropy = 8;
    }

    // Map shared wings to locked door slots
    const sharedWingsArr = sharedWings || [];
    const lockedSlots = doorDefs.map((d, idx) => ({ ...d, idx })).filter(d => d.locked);
    const sharedDoorMap: Record<number, SharedWingDoor> = {};
    lockedSlots.forEach((slot, si) => {
      if (si < sharedWingsArr.length) sharedDoorMap[slot.idx] = sharedWingsArr[si];
    });

    doorDefs.forEach((doorDef, i) => {
      const sharedWingForSlot = sharedDoorMap[i];
      const wingId = sharedWingForSlot ? `shared:${sharedWingForSlot.wingId}:${sharedWingForSlot.shareId}` : doorDef.id;
      const wing = WINGS.find(ww => ww.id === doorDef.id);
      const isPlaceholderLocked = doorDef.locked && !sharedWingForSlot;
      const isSharedDoor = !!sharedWingForSlot;
      const isUnlocked = (!doorDef.locked && wing && wing.unlocked !== false) || isSharedDoor;
      const sharedWingRef = isSharedDoor ? DEFAULT_WINGS.find(w => w.id === sharedWingForSlot!.wingId) : null;
      const sharedAccent = sharedWingRef?.accent || "#7AA0C8";
      const accent = wing?.accent;
      const angle = (i / NUM_DOORS) * Math.PI * 2 - Math.PI / 2;
      const dx = Math.cos(angle) * (RADIUS - 0.4);
      const dz = Math.sin(angle) * (RADIUS - 0.4);

      // Inward normal (pointing to center)
      const inN = new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle));
      // Lateral (perpendicular to door)
      const latN = new THREE.Vector3(Math.cos(angle + Math.PI / 2), 0, Math.sin(angle + Math.PI / 2));

      // Door recess / alcove — flat plane only (no side walls that protrude)
      const recessMesh = mk(DS.recessGeo, isUnlocked ? DS.recessUnlockedMat : DS.recessLockedMat,
        dx - inN.x * 0.15, (DOOR_H + 0.6) / 2, dz - inN.z * 0.15);
      recessMesh.lookAt(0, (DOOR_H + 0.6) / 2, 0);
      scene.add(recessMesh);

      // ── DOOR CASING — ink under w1_hall (WS4-4: ink casings, canon INK),
      // marble otherwise ──
      const frameMat = (W1 && w1InkCasingMat) ? w1InkCasingMat : MS.marbleDark;
      // Left frame pillar
      const lp = new THREE.Mesh(DS.lpGeo, frameMat);
      lp.position.set(
        dx + latN.x * (DOOR_W / 2 + frameThick / 2) + inN.x * 0.05,
        (DOOR_H + 0.3) / 2,
        dz + latN.z * (DOOR_W / 2 + frameThick / 2) + inN.z * 0.05
      );
      lp.lookAt(new THREE.Vector3(0, (DOOR_H + 0.3) / 2, 0));
      scene.add(lp);
      // Right frame pillar
      const rp = new THREE.Mesh(DS.lpGeo, frameMat);
      rp.position.set(
        dx - latN.x * (DOOR_W / 2 + frameThick / 2) + inN.x * 0.05,
        (DOOR_H + 0.3) / 2,
        dz - latN.z * (DOOR_W / 2 + frameThick / 2) + inN.z * 0.05
      );
      rp.lookAt(new THREE.Vector3(0, (DOOR_H + 0.3) / 2, 0));
      scene.add(rp);
      // Top lintel
      const lintel = new THREE.Mesh(DS.lintelGeo, frameMat);
      lintel.position.set(dx + inN.x * 0.05, DOOR_H + 0.3, dz + inN.z * 0.05);
      lintel.lookAt(new THREE.Vector3(0, DOOR_H + 0.3, 0));
      scene.add(lintel);
      // Bottom threshold (raised above floor to avoid z-fighting)
      const thresh = new THREE.Mesh(DS.threshGeo, MS.marbleDark);
      thresh.position.set(dx + inN.x * 0.05, 0.08, dz + inN.z * 0.05);
      thresh.lookAt(new THREE.Vector3(0, 0.06, 0));
      scene.add(thresh);

      // ── SUBTLE ARCH above door (thin, elegant) ──
      const archMesh = new THREE.Mesh(DS.archGeo, MS.goldDark);
      archMesh.position.set(dx + inN.x * 0.05, DOOR_H + 0.45, dz + inN.z * 0.05);
      archMesh.lookAt(new THREE.Vector3(0, DOOR_H + 0.45, 0));
      archMesh.rotateY(Math.PI);
      scene.add(archMesh);
      // Small keystone
      const keystone = mk(DS.keystoneGeo, MS.goldDark,
        dx + inN.x * 0.3, DOOR_H + 0.45 + archH, dz + inN.z * 0.3);
      keystone.lookAt(new THREE.Vector3(0, DOOR_H + 0.45 + archH, 0));
      scene.add(keystone);

      // W3H (Wave B move 7 — v1 empty state): recessed LUNETTE above each
      // door: a carved-relief half-moon faintly tinted to the wing accent,
      // ringed by a gilded arc. The wing's memory photo hangs here once the
      // per-wing data plumbing lands (masterplan lunette workstream).
      if (W3H) {
        const lunR = 1.35, lunY = DOOR_H + 2.0;
        const lx2 = Math.cos(angle) * (RADIUS - 0.22);
        const lz2 = Math.sin(angle) * (RADIUS - 0.22);
        // The wing's NEWEST photo memory hangs in the lunette (Sguardi move 7
        // — every sightline ends in a memory). Unlit MeshBasic + a slight
        // over-unity lift: photo highlights cross the 1.0 bloom threshold and
        // read as picture-lit. No photo (or locked/shared slot) → carved
        // relief empty state.
        const lunMem = !isPlaceholderLocked && !isSharedDoor ? lunettePhotos?.[doorDef.id] : undefined;
        let lunMat: THREE.Material;
        if (lunMem) {
          const ltex = gatePaintTex(lunMem, paintTex(lunMem)); // reveal gate: lunette photo draw
          lunetteTextures.push(ltex);
          const pm = new THREE.MeshBasicMaterial({ map: ltex });
          pm.color.setRGB(1.12, 1.12, 1.12);
          lunMat = pm;
        } else {
          const lunTint = new THREE.Color("#3A3226").lerp(new THREE.Color((wing?.accent || sharedAccent || "#8B7355")), 0.22);
          lunMat = new THREE.MeshStandardMaterial({ color: lunTint, roughness: 0.9, metalness: 0 });
        }
        const lun = new THREE.Mesh(
          new THREE.CircleGeometry(lunR, 24, 0, Math.PI),
          lunMat
        );
        lun.position.set(lx2, lunY, lz2);
        lun.lookAt(new THREE.Vector3(0, lunY, 0));
        scene.add(lun);
        const lunRim = new THREE.Mesh(new THREE.TorusGeometry(lunR + 0.06, 0.05, 6, 24, Math.PI), MS.goldDark);
        lunRim.position.set(Math.cos(angle) * (RADIUS - 0.28), lunY, Math.sin(angle) * (RADIUS - 0.28));
        lunRim.lookAt(new THREE.Vector3(0, lunY, 0));
        scene.add(lunRim);
      }

      if (isUnlocked) {
      // ── DOUBLE DOOR PANELS (unlocked wing) ──
      // Shared doors get an ethereal translucent look with wing accent color
      // (doorMat stays PER-DOOR — the hover/glow loop mutates its emissive)
      const doorMat = isSharedDoor
        ? new THREE.MeshStandardMaterial({
            color: sharedAccent, roughness: 0.2, metalness: 0.3,
            // w1_hall: colored emissive door glows are dead (WS4-4) — the shared
            // door keeps its accent ALBEDO identity, not a glow.
            emissive: sharedAccent, emissiveIntensity: W1 ? 0.05 : 0.15,
            transparent: true, opacity: 0.85,
          })
        : new THREE.MeshStandardMaterial({
            // Neutral warm-wood self-illumination (fixture compensation, not a
            // wing-accent glow) — static under w1_hall; pre-W1 the animate loop
            // overwrites it with the accent proximity glow.
            // W3H (owner: "meer textuur op de deuren"): high-contrast plank
            // canvas as albedo (white multiplier — the canvas carries the
            // tone) + dark_wood normal/roughness for relief; emissive wash
            // halved so the grain isn't flattened.
            // W3H round 2 (owner): every door leans its OWN wood species —
            // subtle warm shifts (walnut/oak/mahogany/chestnut...) per slot.
            color: W3H ? ["#D8CCBC", "#E4D4B4", "#CFB9A9", "#DCC8A4", "#C9B6A6", "#E2CFC4", "#D2C0A4"][i % 7] : "#7A5030",
            roughness: 0.45, metalness: 0.0,
            emissive: "#5A3A20", emissiveIntensity: W3H ? 0.06 : 0.2,
            ...(W3H && w3DoorWoodTex ? {
              map: w3DoorWoodTex, normalMap: woodDoorTex.normalMap,
              normalScale: new THREE.Vector2(0.85, 0.85),
              roughnessMap: woodDoorTex.roughnessMap,
            } : {}),
          });

      const leftPanel = new THREE.Mesh(DS.panelGeo, doorMat);
      leftPanel.position.set(
        dx + latN.x * (panelW / 2 + DOOR_PANEL_GAP / 2) + inN.x * 0.2,
        DOOR_H / 2,
        dz + latN.z * (panelW / 2 + DOOR_PANEL_GAP / 2) + inN.z * 0.2
      );
      leftPanel.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      leftPanel.castShadow = true;
      leftPanel.userData = { wingId };
      scene.add(leftPanel);

      const rightPanel = new THREE.Mesh(DS.panelGeo, doorMat);
      rightPanel.position.set(
        dx - latN.x * (panelW / 2 + DOOR_PANEL_GAP / 2) + inN.x * 0.2,
        DOOR_H / 2,
        dz - latN.z * (panelW / 2 + DOOR_PANEL_GAP / 2) + inN.z * 0.2
      );
      rightPanel.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      rightPanel.castShadow = true;
      rightPanel.userData = { wingId };
      scene.add(rightPanel);

      doorMeshes.push({ mesh: leftPanel, mat: doorMat, wingId, angle });
      doorMeshes.push({ mesh: rightPanel, mat: doorMat, wingId, angle });

      // Thin seam line between panels
      const seam = new THREE.Mesh(DS.seamGeo, MS.goldDark);
      seam.position.set(dx + inN.x * 0.35, DOOR_H / 2, dz + inN.z * 0.35);
      seam.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      scene.add(seam);

      // ── SIMPLE INSET PANELS (2 per door panel, subtle depth) ──
      for (const side of [-1, 1]) {
        const panelCenterLat = latN.clone().multiplyScalar(side * (panelW / 2 + DOOR_PANEL_GAP / 2));
        // Upper and lower inset
        for (const py of [2.0, 4.8]) {
          // Recessed darker wood panel
          const inset = new THREE.Mesh(DS.insetGeo, DS.insetMat);
          inset.position.set(
            dx + panelCenterLat.x + inN.x * 0.36,
            py,
            dz + panelCenterLat.z + inN.z * 0.36
          );
          inset.lookAt(new THREE.Vector3(0, py, 0));
          scene.add(inset);
          // Thin gold border around inset
          const border = new THREE.Mesh(DS.borderGeo, MS.goldDark);
          border.position.set(
            dx + panelCenterLat.x + inN.x * 0.35,
            py,
            dz + panelCenterLat.z + inN.z * 0.35
          );
          border.lookAt(new THREE.Vector3(0, py, 0));
          scene.add(border);
        }
      }

      // ── SIMPLE RING HANDLES (one per panel, centered) ──
      for (const side of [-1, 1]) {
        const handleLat = latN.clone().multiplyScalar(side * 0.35);
        const handleRing = new THREE.Mesh(DS.handleRingGeo, MS.goldDark);
        handleRing.position.set(
          dx + handleLat.x + inN.x * 0.42,
          DOOR_H * 0.48,
          dz + handleLat.z + inN.z * 0.42
        );
        handleRing.lookAt(new THREE.Vector3(0, DOOR_H * 0.48, 0));
        scene.add(handleRing);
        // Small mount plate
        const handlePlate = new THREE.Mesh(DS.handlePlateGeo, DS.handlePlateMat);
        handlePlate.position.set(
          dx + handleLat.x + inN.x * 0.41,
          DOOR_H * 0.48 + 0.14,
          dz + handleLat.z + inN.z * 0.41
        );
        handlePlate.lookAt(new THREE.Vector3(0, DOOR_H * 0.48 + 0.14, 0));
        scene.add(handlePlate);
      }
      } else {
      // ── SEALED WALL NICHE (locked wing) ──
      // Flat stone panel filling the alcove — slightly recessed from wall surface
      // (nicheMat stays PER-DOOR — the hover/glow loop mutates its emissive)
      const nicheMat = new THREE.MeshStandardMaterial({
        color: "#E0D8CC", roughness: 0.3, metalness: 0.0,
        envMapIntensity: 0.6,
        normalMap: wallTex.normalMap,
        normalScale: new THREE.Vector2(.2, .2),
      });
      const nichePanel = new THREE.Mesh(DS.nichePanelGeo, nicheMat);
      nichePanel.position.set(
        dx + inN.x * 0.1,
        DOOR_H / 2,
        dz + inN.z * 0.1
      );
      nichePanel.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      nichePanel.castShadow = true;
      nichePanel.userData = { wingId };
      scene.add(nichePanel);

      // Register niche as clickable (still triggers door click for upgrade prompt)
      doorMeshes.push({ mesh: nichePanel, mat: nicheMat, wingId, angle });

      // Subtle recessed arch outline on the sealed surface (thin gold line)
      const nicheArchOutline = new THREE.Mesh(DS.nicheArchGeo, DS.nicheArchOutlineMat);
      nicheArchOutline.position.set(dx + inN.x * 0.19, DOOR_H * 0.75, dz + inN.z * 0.19);
      nicheArchOutline.lookAt(new THREE.Vector3(0, DOOR_H * 0.75, 0));
      nicheArchOutline.rotateY(Math.PI);
      scene.add(nicheArchOutline);

      // Vertical side lines connecting arch to floor (faint etched lines)
      for (const side of [-1, 1]) {
        const etchLine = new THREE.Mesh(DS.etchGeo, DS.etchMat);
        etchLine.position.set(
          dx + latN.x * side * (nicheArchW - 0.02) + inN.x * 0.19,
          DOOR_H * 0.75 / 2,
          dz + latN.z * side * (nicheArchW - 0.02) + inN.z * 0.19
        );
        etchLine.lookAt(new THREE.Vector3(0, DOOR_H * 0.75 / 2, 0));
        scene.add(etchLine);
      }

      // Small lock medallion in center of niche
      const lockMedallion = new THREE.Mesh(DS.lockMedallionGeo, DS.lockMedallionMat);
      lockMedallion.position.set(
        dx + inN.x * 0.20,
        DOOR_H * 0.45,
        dz + inN.z * 0.20
      );
      lockMedallion.lookAt(new THREE.Vector3(0, DOOR_H * 0.45, 0));
      scene.add(lockMedallion);

      // Lock keyhole shape (small dark circle + triangle below)
      const keyholeCircle = new THREE.Mesh(DS.keyholeCircleGeo, DS.keyholeDarkMat);
      keyholeCircle.position.set(
        dx + inN.x * 0.21,
        DOOR_H * 0.45 + 0.03,
        dz + inN.z * 0.21
      );
      keyholeCircle.lookAt(new THREE.Vector3(0, DOOR_H * 0.45 + 0.03, 0));
      scene.add(keyholeCircle);
      // Keyhole slot (small narrow rect below circle)
      const keyholeSlot = new THREE.Mesh(DS.keyholeSlotGeo, DS.keyholeDarkMat);
      keyholeSlot.position.set(
        dx + inN.x * 0.21,
        DOOR_H * 0.45 - 0.06,
        dz + inN.z * 0.21
      );
      keyholeSlot.lookAt(new THREE.Vector3(0, DOOR_H * 0.45 - 0.06, 0));
      scene.add(keyholeSlot);
      }

      if (!W1) {
        // (pre-Wave-1) Warm fill light for door visibility (dimmer for locked niches)
        const doorFillColor = isSharedDoor ? sharedAccent : dlPreset.sunColor;
        const doorFill = new THREE.PointLight(doorFillColor, (isUnlocked ? 1.5 : 0.5) * dlPreset.sunIntensity, 10);
        doorFill.position.set(dx + inN.x * 2.5, DOOR_H * 0.5, dz + inN.z * 2.5);
        scene.add(doorFill);

        // (pre-Wave-1) Spotlight on door face (dimmer for locked niches, skip on mobile)
        if (!isMobileGPU()) {
          const doorFaceSpot = new THREE.SpotLight(isSharedDoor ? sharedAccent : dlPreset.sunColor, (isUnlocked ? 2.0 : 0.6) * dlPreset.sunIntensity, 16, Math.PI / 4.5, 0.4, 0.7);
          doorFaceSpot.position.set(dx + inN.x * 6.0, DOOR_H * 0.55, dz + inN.z * 6.0);
          doorFaceSpot.target.position.set(dx, DOOR_H * 0.42, dz);
          scene.add(doorFaceSpot);
          scene.add(doorFaceSpot.target);
        }
      } else {
        // w1_hall: doorFill/doorFaceSpot deleted — baked compensation so no door
        // reads dark (dogma: walls/floors ≥0.5 relative luminance): one additive
        // glow sprite above the door face + one warm pool decal at the threshold.
        if (w1GlowSpriteMat) {
          const glow = new THREE.Sprite(w1GlowSpriteMat);
          glow.position.set(dx + inN.x * 1.1, DOOR_H * 0.72, dz + inN.z * 1.1);
          glow.scale.set(isUnlocked ? 5.5 : 4.0, isUnlocked ? 5.5 : 4.0, 1);
          scene.add(glow);
        }
        if (w1PoolMat && w1PoolGeo) {
          const pool = new THREE.Mesh(w1PoolGeo, w1PoolMat);
          pool.rotation.x = -Math.PI / 2;
          // z-fight sweep r2: 0.012 tied the Greek-key border tops exactly (also 0.012);
          // 0.024 clears the key (0.012) and stays under the threshold bottom (0.03).
          pool.position.set(dx + inN.x * 1.7, 0.024, dz + inN.z * 1.7);
          pool.renderOrder = 1; // deterministic order among stacked floor decals
          scene.add(pool);
        }
      }

      // ── ELEGANT WING NAME LABEL (upper portion of door/niche) ──
      const effectiveLabel = isSharedDoor
        ? (sharedWingRef?.name?.toUpperCase() || sharedWingForSlot!.wingId.toUpperCase())
        : (wing ? (() => { if (wing.nameKey) { const tr = tw(wing.nameKey); if (tr && tr !== wing.nameKey) return tr.toUpperCase(); } return wing.name.toUpperCase(); })() : "");
      if (effectiveLabel) {
        if (W1) {
        // w1_hall (WS4-4): Fraunces lintel lettering — carved museum capitals.
        // W3H (owner: "naamkaartjes veel te onduidelijk"): larger + GILDED —
        // incised letters with a gold-leaf infill (classic Roman inscription)
        // read clearly from across the hall without becoming a plate.
        const plaque: THREE.Object3D = W3H
          ? makeFrauncesLabel(effectiveLabel, { width: 3.6, height: 0.7, gilded: true })
          : makeFrauncesLabel(effectiveLabel, { width: 2.6, height: 0.5 });
        const plaqueY = DOOR_H + (W3H ? 0.44 : 0.32);
        plaque.position.set(dx + inN.x * 0.5, plaqueY, dz + inN.z * 0.5);
        plaque.lookAt(new THREE.Vector3(0, plaqueY, 0));
        scene.add(plaque);
        } else {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 1024;
        labelCanvas.height = isSharedDoor ? 256 : 192;
        const lctx = labelCanvas.getContext("2d")!;
        if (isSharedDoor) {
          // Ethereal translucent background for shared wing
          lctx.fillStyle = "#1A2838";
          lctx.fillRect(0, 0, 1024, 256);
          // Subtle glowing border
          lctx.strokeStyle = sharedAccent;
          lctx.lineWidth = 3;
          lctx.strokeRect(12, 12, 1000, 232);
          // Wing name
          lctx.fillStyle = "#FFFFFF";
          lctx.font = "bold 80px Georgia, 'Times New Roman', serif";
          lctx.textAlign = "center";
          lctx.textBaseline = "middle";
          lctx.fillText(effectiveLabel, 512, 90);
          // Subtle "shared" badge
          lctx.fillStyle = "#7A9AB8";
          lctx.font = "italic 36px Georgia, 'Times New Roman', serif";
          lctx.fillText(t("sharedBadge"), 512, 170);
          // Decorative line
          lctx.strokeStyle = sharedAccent;
          lctx.lineWidth = 2;
          lctx.beginPath();
          lctx.moveTo(200, 210);
          lctx.lineTo(824, 210);
          lctx.stroke();
        } else if (isUnlocked) {
          // Transparent dark wood background
          lctx.fillStyle = "#3A2818";
          lctx.fillRect(0, 0, 1024, 192);
          // Thin elegant gold border
          lctx.strokeStyle = "#C8A050";
          lctx.lineWidth = 3;
          lctx.strokeRect(12, 12, 1000, 168);
          // Wing name in refined serif
          const eyeLabel = effectiveLabel;
          lctx.fillStyle = "#D4B878";
          lctx.font = "bold 100px Georgia, 'Times New Roman', serif";
          lctx.textAlign = "center";
          lctx.textBaseline = "middle";
          lctx.fillText(eyeLabel, 512, 96);
          // Subtle decorative line under text
          lctx.strokeStyle = "#C8A050";
          lctx.lineWidth = 2;
          lctx.beginPath();
          lctx.moveTo(280, 155);
          lctx.lineTo(744, 155);
          lctx.stroke();
        } else {
          // Muted stone-colored label for locked niche
          lctx.fillStyle = "#C8BFA8";
          lctx.fillRect(0, 0, 1024, 192);
          // Subtle border
          lctx.strokeStyle = "#A89878";
          lctx.lineWidth = 2;
          lctx.strokeRect(12, 12, 1000, 168);
          // Wing name — dimmer, with lock symbol
          const eyeLabel = effectiveLabel;
          lctx.fillStyle = "#8A7E68";
          lctx.font = "bold 90px Georgia, 'Times New Roman', serif";
          lctx.textAlign = "center";
          lctx.textBaseline = "middle";
          lctx.fillText(eyeLabel, 512, 96);
        }

        const labelTex = new THREE.CanvasTexture(labelCanvas);
        labelTex.colorSpace = THREE.SRGBColorSpace;
        const labelPlaneH = isSharedDoor ? 0.72 : 0.54;
        const labelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2.8, labelPlaneH),
          new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.DoubleSide, transparent: true, opacity: isSharedDoor ? 0.95 : (isUnlocked ? 1.0 : 0.7) })
        );
        // Position at upper third of door/niche
        const labelY = isSharedDoor ? 5.4 : (isUnlocked ? 5.5 : 5.2);
        labelMesh.position.set(
          dx + inN.x * 0.40,
          labelY,
          dz + inN.z * 0.40
        );
        labelMesh.lookAt(new THREE.Vector3(0, labelY, 0));
        scene.add(labelMesh);
        }
      }
    });

    // (Inlay panels removed — locked doors are now part of the 7-door ring above)
    const inlayMeshes: THREE.Mesh[] = []; // kept for click handler compatibility

    // ── BUST PEDESTALS — disabled for now, will revisit later ──
    const bustMeshes: THREE.Mesh[] = [];

    // ── MUSEO VIVO W2 living-light handles (WS4-8/9) — assigned by the era
    // branch / W2 block below; the frame loop drifts them on capable GPUs and
    // leaves the static variant on mobile (budget: zero dynamic lights).
    const w2Anim = W2 && !isMobileGPU();
    let w2WaterNormal: THREE.Texture | null = null;
    let w2CausticA: THREE.Texture | null = null;
    let w2CausticB: THREE.Texture | null = null;
    let w2PoolTex: THREE.Texture | null = null;

    // ── ERA-SPECIFIC MODIFICATIONS ──
    if (styleEra === "renaissance") {
      // ═══ RENAISSANCE CORTILE ═══

      // ── Brunelleschi Arcade: round arches between ALL columns ──
      const COL_R_POS = RADIUS - 0.8; // column center radius (matches column placement)
      for (let ci = 0; ci < validColAngles.length; ci++) {
        const a1 = validColAngles[ci];
        const a2 = validColAngles[(ci + 1) % validColAngles.length];
        const x1 = Math.cos(a1) * COL_R_POS, z1 = Math.sin(a1) * COL_R_POS;
        const x2 = Math.cos(a2) * COL_R_POS, z2 = Math.sin(a2) * COL_R_POS;
        const midX = (x1 + x2) / 2, midZ = (z1 + z2) / 2;
        const span = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const archY = colH + 0.3; // top of capital
        const archRadius = span / 2;

        // Semicircular arch (TorusGeometry, half-ring)
        const archGeo = new THREE.TorusGeometry(archRadius, 0.12, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, MS.column);
        arch.position.set(midX, archY, midZ);
        // Orient arch to face center and stand upright
        arch.lookAt(0, archY, 0);
        arch.rotateX(Math.PI / 2);
        arch.rotateZ(Math.PI / 2);
        arch.castShadow = true;
        scene.add(arch);

        // Springer stones where arch meets columns
        const springerGeo = new THREE.BoxGeometry(0.25, 0.2, 0.25);
        const sp1 = mk(springerGeo, MS.marble, x1, archY, z1);
        sp1.lookAt(0, archY, 0);
        scene.add(sp1);
        const sp2 = mk(springerGeo, MS.marble, x2, archY, z2);
        sp2.lookAt(0, archY, 0);
        scene.add(sp2);

        // Spandrel medallion between arches (above arch peak)
        const medallionY = archY + archRadius + 0.3;
        const spandrelMat = ci % 2 === 0 ? MS.gold : MS.marble;
        const medallion = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), spandrelMat);
        medallion.position.set(midX, medallionY, midZ);
        medallion.lookAt(0, medallionY, 0);
        scene.add(medallion);

        // Entablature beam spanning columns
        const entGeo = new THREE.BoxGeometry(span, 0.2, 0.35);
        const ent = mk(entGeo, MS.column, midX, archY + archRadius + 0.08, midZ);
        ent.lookAt(0, archY + archRadius + 0.08, 0);
        ent.rotateY(Math.PI / 2);
        scene.add(ent);
      }

      // ── Column Enhancement: Corinthian capitals + Attic bases ──
      validColAngles.forEach((angle) => {
        const cx = Math.cos(angle) * COL_R_POS;
        const cz = Math.sin(angle) * COL_R_POS;

        // Corinthian capital: flared box
        const capFlare = mk(new THREE.BoxGeometry(0.65, 0.15, 0.65), MS.column, cx, colH + 0.05, cz);
        scene.add(capFlare);
        // Abacus plate
        const abacus = mk(new THREE.BoxGeometry(0.75, 0.06, 0.75), MS.marble, cx, colH + 0.18, cz);
        scene.add(abacus);
        // 4 volute details at corners
        const voluteGeo = new THREE.SphereGeometry(0.06, 6, 4);
        for (let v = 0; v < 4; v++) {
          const va = (v / 4) * Math.PI * 2 + Math.PI / 4;
          const vx = cx + Math.cos(va) * 0.28;
          const vz = cz + Math.sin(va) * 0.28;
          scene.add(mk(voluteGeo, MS.gold, vx, colH + 0.1, vz));
        }

        // Attic base: wider cylinder + torus molding
        const atkBase = mk(new THREE.CylinderGeometry(colR * 1.6, colR * 1.8, 0.15, 16), MS.marble, cx, 0.075, cz);
        scene.add(atkBase);
        const torusMold = new THREE.Mesh(new THREE.TorusGeometry(colR * 1.4, 0.04, 6, 16), MS.column);
        torusMold.position.set(cx, 0.18, cz);
        torusMold.rotation.x = Math.PI / 2;
        scene.add(torusMold);
      });

      // ── Groin Vault Ribs: cross-ribs on ceiling between column bays ──
      for (let ci = 0; ci < validColAngles.length; ci++) {
        const a1 = validColAngles[ci];
        const a2 = validColAngles[(ci + 1) % validColAngles.length];
        const aMid = (a1 + a2) / 2;
        // Inner and outer points for the bay
        const outerR = COL_R_POS;
        const innerR = COL_R_POS - 4;
        const ribY = WALL_H - 0.3;
        const ribPeak = WALL_H + 1.0;

        // Two diagonal ribs per bay
        for (let d = 0; d < 2; d++) {
          const startA = d === 0 ? a1 : a1;
          const endA = d === 0 ? a2 : a2;
          const startR = d === 0 ? outerR : innerR;
          const endR = d === 0 ? innerR : outerR;

          const p0 = new THREE.Vector3(Math.cos(startA) * startR, ribY, Math.sin(startA) * startR);
          const p3 = new THREE.Vector3(Math.cos(endA) * endR, ribY, Math.sin(endA) * endR);
          const mid = new THREE.Vector3((p0.x + p3.x) / 2, ribPeak, (p0.z + p3.z) / 2);
          const curve = new THREE.CatmullRomCurve3([p0, mid, p3]);
          const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.06, 6, false);
          const rib = new THREE.Mesh(tubeGeo, MS.column);
          rib.castShadow = true;
          scene.add(rib);
        }

        // Central boss at intersection
        const bossX = Math.cos(aMid) * ((outerR + innerR) / 2);
        const bossZ = Math.sin(aMid) * ((outerR + innerR) / 2);
        scene.add(mk(new THREE.SphereGeometry(0.08, 8, 6), MS.gold, bossX, ribPeak, bossZ));
      }

      // ── Checkerboard Floor: diamond-rotated 45° in center, alternating tiles ──
      {
        const tileSz = 1.0;
        const darkFloorMat = new THREE.MeshStandardMaterial({ color: "#4A4A42", roughness: 0.15, metalness: 0.05, envMapIntensity: 0.8 });
        const lightFloorMat = new THREE.MeshStandardMaterial({ color: "#E8E0D4", roughness: 0.12, metalness: 0.03, envMapIntensity: 0.9 });
        const tileGeo = new THREE.BoxGeometry(tileSz, 0.02, tileSz);

        // Use InstancedMesh for performance
        const darkPositions: THREE.Matrix4[] = [];
        const lightPositions: THREE.Matrix4[] = [];
        const mat4 = new THREE.Matrix4();
        const rot45 = new THREE.Matrix4().makeRotationY(Math.PI / 4);

        for (let tx = -18; tx <= 18; tx += 1) {
          for (let tz = -18; tz <= 18; tz += 1) {
            const dist = Math.sqrt(tx * tx + tz * tz);
            if (dist > RADIUS - 2) continue;
            const isDark = (tx + tz) % 2 !== 0;
            const m = new THREE.Matrix4();
            if (dist < 5) {
              // Diamond rotation in center zone
              m.multiply(new THREE.Matrix4().makeTranslation(tx * tileSz, 0.003, tz * tileSz));
              m.multiply(rot45);
            } else {
              m.makeTranslation(tx * tileSz, 0.003, tz * tileSz);
            }
            (isDark ? darkPositions : lightPositions).push(m);
          }
        }

        const darkInst = new THREE.InstancedMesh(tileGeo, darkFloorMat, darkPositions.length);
        darkPositions.forEach((m, i) => darkInst.setMatrixAt(i, m));
        darkInst.instanceMatrix.needsUpdate = true;
        darkInst.receiveShadow = true;
        scene.add(darkInst);

        const lightInst = new THREE.InstancedMesh(tileGeo, lightFloorMat, lightPositions.length);
        lightPositions.forEach((m, i) => lightInst.setMatrixAt(i, m));
        lightInst.instanceMatrix.needsUpdate = true;
        lightInst.receiveShadow = true;
        scene.add(lightInst);
      }

      // ── Upper Gallery: windows with pietra serena surrounds + portrait medallions ──
      {
        const galleryY = colH + 3.0;
        const pietraSerenaMat = new THREE.MeshStandardMaterial({ color: "#8A8A80", roughness: 0.4, metalness: 0.0 });
        for (let ci = 0; ci < validColAngles.length; ci++) {
          const a = validColAngles[ci];
          const aNext = validColAngles[(ci + 1) % validColAngles.length];
          const aMid = (a + aNext) / 2;
          const wR = RADIUS - 0.3;

          // Window surround
          const wx = Math.cos(aMid) * wR, wz = Math.sin(aMid) * wR;
          const surround = mk(new THREE.BoxGeometry(0.12, 1.6, 1.0), pietraSerenaMat, wx, galleryY, wz);
          surround.lookAt(0, galleryY, 0);
          scene.add(surround);
          // Window opening (lighter recessed area)
          const windowPane = mk(new THREE.BoxGeometry(0.06, 1.2, 0.7), MS.marble, wx, galleryY, wz);
          windowPane.lookAt(0, galleryY, 0);
          scene.add(windowPane);

          // Portrait medallion roundel between windows
          const pmY = galleryY + 1.4;
          const pmx = Math.cos(aMid) * (wR + 0.05), pmz = Math.sin(aMid) * (wR + 0.05);
          const pm = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), MS.bronze);
          pm.position.set(pmx, pmY, pmz);
          pm.lookAt(0, pmY, 0);
          scene.add(pm);
        }
      }

      // ── Coat of Arms above entrance ──
      {
        const entranceAngle = doorAngles[0]; // first door
        const coaR = RADIUS - 0.15;
        const coaX = Math.cos(entranceAngle) * coaR;
        const coaZ = Math.sin(entranceAngle) * coaR;
        const coaY = DOOR_H + 1.2;

        // Shield
        const shield = mk(new THREE.BoxGeometry(0.1, 1.0, 0.8), MS.gold, coaX, coaY, coaZ);
        shield.lookAt(0, coaY, 0);
        scene.add(shield);

        // Flanking scroll brackets
        for (const side of [-1, 1]) {
          const perpX = -Math.sin(entranceAngle) * 0.6 * side;
          const perpZ = Math.cos(entranceAngle) * 0.6 * side;
          const scroll = mk(new THREE.TorusGeometry(0.15, 0.04, 6, 8, Math.PI), MS.gold,
            coaX + perpX, coaY, coaZ + perpZ);
          scroll.lookAt(0, coaY, 0);
          scene.add(scroll);
        }
      }

      // ── Candelabra Wall Sconces (6 pieces) ──
      {
        const candelPositions: number[] = [];
        // Pick 6 evenly-spaced column bays that don't overlap doors
        for (let ci = 0; ci < validColAngles.length && candelPositions.length < 6; ci += Math.max(1, Math.floor(validColAngles.length / 6))) {
          const a = validColAngles[ci];
          const aNext = validColAngles[(ci + 1) % validColAngles.length];
          candelPositions.push((a + aNext) / 2);
        }

        const candleTipMat = new THREE.MeshStandardMaterial({
          color: "#FFE8A0", emissive: "#FFE8A0", emissiveIntensity: 0.5, roughness: 0.3,
        });

        candelPositions.forEach((cAngle) => {
          const cR = RADIUS - 0.4;
          const cx = Math.cos(cAngle) * cR, cz = Math.sin(cAngle) * cR;
          const baseY = 3.5;

          // Vertical stem
          scene.add(mk(new THREE.CylinderGeometry(0.02, 0.03, 0.8, 6), MS.bronze, cx, baseY, cz));

          // Three branches
          for (let b = -1; b <= 1; b++) {
            const perpX = -Math.sin(cAngle) * 0.15 * b;
            const perpZ = Math.cos(cAngle) * 0.15 * b;
            const branchY = baseY + 0.3 + Math.abs(b) * 0.1;
            // Horizontal arm
            const arm = mk(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4), MS.bronze,
              cx + perpX, branchY, cz + perpZ);
            arm.rotation.z = Math.PI / 2;
            scene.add(arm);
            // Candle tip (emissive cone)
            scene.add(mk(new THREE.ConeGeometry(0.025, 0.08, 6), candleTipMat,
              cx + perpX, branchY + 0.06, cz + perpZ));
          }

          // PointLight per candelabra (skip on mobile; deleted under w1_hall —
          // the emissive candle tips are the fixture)
          if (!isMobileGPU() && !W1) {
            const candleLight = new THREE.PointLight("#FFF5E0", 0.3, 4);
            candleLight.position.set(cx, baseY + 0.5, cz);
            scene.add(candleLight);
          }
        });
      }

    } else {
      // ═══ ROMAN ATRIUM ═══

      // ── Grand Impluvium: recessed pool 7×5 ──
      const implW = 7, implD = 5, implDepth = 0.35;
      // W2 (WS4-8, joint WS3-7): dead teal → canon-warm living water. A tileable
      // procedural normal map is scrolled ~0.02/s in the frame loop (desktop;
      // static on mobile) and envMapIntensity catches the golden PMREM — one
      // material tweak, zero extra lights.
      // W3H (owner: "mogelijk om water in midden te doen?" — the basin read
      // as a solid olive disc, not water): deeper glassy tone, stronger
      // ripple normals and doubled reflection pickup so it reads WET.
      const waterMat = mkPhys(THREE,{
        color: W3H ? "#3A6B64" : (W2 ? "#7BA48E" : "#4A8A7A"), roughness: 0.02, metalness: 0.1, transparent: true, opacity: W3H ? 0.72 : 0.65,
        envMapIntensity: W3H ? 1.3 : 1.4, clearcoat: 0.6, clearcoatRoughness: 0.05,
      });
      if (W2) {
        w2WaterNormal = makeWaterNormalTexture();
        w2WaterNormal.repeat.set(3, 2);
        (waterMat as THREE.MeshPhysicalMaterial).normalMap = w2WaterNormal;
        (waterMat as THREE.MeshPhysicalMaterial).normalScale = W3H ? new THREE.Vector2(0.65, 0.65) : new THREE.Vector2(0.35, 0.35);
      }

      // Pool bottom + walls — W3H: a DEEP dark basin lining. Water over a
      // near-white marble bottom reads as milky glass; over a dark green
      // basin it instantly reads as standing water (and the caustics glow).
      const basinMat = W3H
        ? new THREE.MeshStandardMaterial({ color: "#22403B", roughness: 0.35, metalness: 0.0, envMapIntensity: 0.5 })
        : MS.marble;
      scene.add(mk(new THREE.BoxGeometry(implW, 0.06, implD), basinMat, 0, -implDepth, 0));
      // Pool walls (4 sides)
      scene.add(mk(new THREE.BoxGeometry(implW, implDepth, 0.08), basinMat, 0, -implDepth / 2, implD / 2));
      scene.add(mk(new THREE.BoxGeometry(implW, implDepth, 0.08), basinMat, 0, -implDepth / 2, -implD / 2));
      scene.add(mk(new THREE.BoxGeometry(0.08, implDepth, implD), basinMat, implW / 2, -implDepth / 2, 0));
      scene.add(mk(new THREE.BoxGeometry(0.08, implDepth, implD), basinMat, -implW / 2, -implDepth / 2, 0));

      // Water surface — W3H: raised nearly flush with the rim so the pool
      // unmistakably reads as standing water from eye level.
      const water = mk(new THREE.BoxGeometry(implW - 0.1, 0.03, implD - 0.1), waterMat, 0, W3H ? -0.005 : -0.05, 0);
      scene.add(water);

      // W2 (WS4-8/9): living caustic web over the water — two counter-drifting
      // additive layers of ONE seeded texture (mobile: a single static layer).
      // Additive decals, depthWrite off, no light — the 4-light budget holds.
      if (W2) {
        w2CausticA = makeCausticsTexture(isMobileGPU() ? 128 : 256);
        const cGeo = new THREE.PlaneGeometry(implW - 0.4, implD - 0.4);
        // z-fight sweep r2: explicit renderOrder — the two caustic layers always
        // draw AFTER the alpha-blended water surface (no distance-sort flicker).
        const mkCaustic = (tex: THREE.Texture, op: number, y: number, order: number) => {
          const m = new THREE.Mesh(cGeo, new THREE.MeshBasicMaterial({
            map: tex, transparent: true, opacity: op,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }));
          m.rotation.x = -Math.PI / 2;
          m.position.y = y;
          m.renderOrder = order;
          scene.add(m);
        };
        // W3H (audit graft "honest water"): caustics belong on the pool
        // BOTTOM, seen through the surface — they previously floated ABOVE
        // the water plane as a glowing film in mid-air.
        // (renderOrder: under W3H the layers sit BELOW the water plane, so
        // they must draw BEFORE it — distance sort handles it at order 0;
        // forcing them after the water would depth-test them away.)
        const cA = W3H ? -implDepth + 0.035 : -0.028;
        const cB = W3H ? -implDepth + 0.05 : -0.022;
        mkCaustic(w2CausticA, W3H ? 0.42 : 0.3, cA, W3H ? 0 : 1);
        if (w2Anim) {
          w2CausticB = w2CausticA.clone();
          w2CausticB.needsUpdate = true;
          mkCaustic(w2CausticB, W3H ? 0.3 : 0.2, cB, W3H ? 0 : 2);
        }
      }

      // Marble rim with double molding
      const rimH = 0.12;
      // Outer rim
      scene.add(mk(new THREE.BoxGeometry(implW + 0.6, rimH, 0.2), MS.marble, 0, rimH / 2, implD / 2 + 0.2));
      scene.add(mk(new THREE.BoxGeometry(implW + 0.6, rimH, 0.2), MS.marble, 0, rimH / 2, -(implD / 2 + 0.2)));
      scene.add(mk(new THREE.BoxGeometry(0.2, rimH, implD + 0.6), MS.marble, implW / 2 + 0.2, rimH / 2, 0));
      scene.add(mk(new THREE.BoxGeometry(0.2, rimH, implD + 0.6), MS.marble, -(implW / 2 + 0.2), rimH / 2, 0));
      // Inner rim (second molding)
      scene.add(mk(new THREE.BoxGeometry(implW + 0.3, rimH * 0.7, 0.1), MS.marble, 0, rimH * 0.35, implD / 2 + 0.05));
      scene.add(mk(new THREE.BoxGeometry(implW + 0.3, rimH * 0.7, 0.1), MS.marble, 0, rimH * 0.35, -(implD / 2 + 0.05)));
      scene.add(mk(new THREE.BoxGeometry(0.1, rimH * 0.7, implD + 0.3), MS.marble, implW / 2 + 0.05, rimH * 0.35, 0));
      scene.add(mk(new THREE.BoxGeometry(0.1, rimH * 0.7, implD + 0.3), MS.marble, -(implW / 2 + 0.05), rimH * 0.35, 0));

      // Central fountain pedestal with bust figure — W3H: gone (owner removed
      // the bust/statue concept); the pool reads as clean standing water.
      if (!W3H) {
        scene.add(mk(new THREE.CylinderGeometry(0.25, 0.35, 0.8, 8), MS.marble, 0, -implDepth + 0.4, 0));
        scene.add(mk(new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8), MS.marble, 0, -implDepth + 0.95, 0));
        scene.add(mk(new THREE.SphereGeometry(0.12, 8, 6), MS.bust, 0, -implDepth + 1.2, 0));
      }

      // 4 short columns at impluvium corners
      const implCorners = [
        [implW / 2 + 0.4, implD / 2 + 0.4],
        [-(implW / 2 + 0.4), implD / 2 + 0.4],
        [implW / 2 + 0.4, -(implD / 2 + 0.4)],
        [-(implW / 2 + 0.4), -(implD / 2 + 0.4)],
      ];
      implCorners.forEach(([icx, icz]) => {
        scene.add(mk(new THREE.CylinderGeometry(0.12, 0.14, 1.2, 8), MS.column, icx, 0.6, icz));
        scene.add(mk(new THREE.SphereGeometry(0.08, 6, 4), MS.marble, icx, 1.24, icz));
      });

      // ── Mosaic Floor: concentric rings + Greek key border ──
      {
        const mosaicBlack = new THREE.MeshStandardMaterial({ color: "#1A1A18", roughness: 0.2, metalness: 0.0 });
        const mosaicWhite = new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0 });
        const terracottaMat = new THREE.MeshStandardMaterial({ color: "#C17040", roughness: 0.4, metalness: 0.0 });
        const creamMat = new THREE.MeshStandardMaterial({ color: "#F0E8D8", roughness: 0.3, metalness: 0.0 });
        const tileGeo = new THREE.BoxGeometry(0.4, 0.01, 0.4);

        // Concentric ring tiles around impluvium
        const ringDark: THREE.Matrix4[] = [];
        const ringLight: THREE.Matrix4[] = [];
        for (let ring = 0; ring < 6; ring++) {
          const rDist = 4.5 + ring * 1.2;
          const numSegs = Math.floor(rDist * 4);
          for (let s = 0; s < numSegs; s++) {
            const a = (s / numSegs) * Math.PI * 2;
            const tx = Math.cos(a) * rDist;
            const tz = Math.sin(a) * rDist;
            if (Math.sqrt(tx * tx + tz * tz) > RADIUS - 3) continue;
            const m = new THREE.Matrix4().makeTranslation(tx, 0.002, tz);
            (ring % 2 === 0 ? ringDark : ringLight).push(m);
          }
        }

        if (ringDark.length > 0) {
          const darkRingInst = new THREE.InstancedMesh(tileGeo, mosaicBlack, ringDark.length);
          ringDark.forEach((m, i) => darkRingInst.setMatrixAt(i, m));
          darkRingInst.instanceMatrix.needsUpdate = true;
          darkRingInst.receiveShadow = true;
          scene.add(darkRingInst);
        }
        if (ringLight.length > 0) {
          const lightRingInst = new THREE.InstancedMesh(tileGeo, mosaicWhite, ringLight.length);
          ringLight.forEach((m, i) => lightRingInst.setMatrixAt(i, m));
          lightRingInst.instanceMatrix.needsUpdate = true;
          lightRingInst.receiveShadow = true;
          scene.add(lightRingInst);
        }

        // Greek key border: meander pattern around edge of floor
        const borderR = RADIUS - 2;
        const keySegGeo = new THREE.BoxGeometry(0.3, 0.012, 0.12);
        const keyPositionsTerra: THREE.Matrix4[] = [];
        const keyPositionsCream: THREE.Matrix4[] = [];
        const keySegments = 80;
        for (let s = 0; s < keySegments; s++) {
          const a = (s / keySegments) * Math.PI * 2;
          const kx = Math.cos(a) * borderR;
          const kz = Math.sin(a) * borderR;
          const m = new THREE.Matrix4();
          m.makeTranslation(kx, 0.006, kz);
          m.multiply(new THREE.Matrix4().makeRotationY(-a));
          (s % 2 === 0 ? keyPositionsTerra : keyPositionsCream).push(m);
        }

        if (keyPositionsTerra.length > 0) {
          const terraInst = new THREE.InstancedMesh(keySegGeo, terracottaMat, keyPositionsTerra.length);
          keyPositionsTerra.forEach((m, i) => terraInst.setMatrixAt(i, m));
          terraInst.instanceMatrix.needsUpdate = true;
          terraInst.receiveShadow = true;
          scene.add(terraInst);
        }
        if (keyPositionsCream.length > 0) {
          const creamInst = new THREE.InstancedMesh(keySegGeo, creamMat, keyPositionsCream.length);
          keyPositionsCream.forEach((m, i) => creamInst.setMatrixAt(i, m));
          creamInst.instanceMatrix.needsUpdate = true;
          creamInst.receiveShadow = true;
          scene.add(creamInst);
        }
      }

      // ── Pompeian Wall Paintings (12 panels between columns) ──
      {
        // Authentic Pompeian palette
        const dadoMat = new THREE.MeshStandardMaterial({ color: "#D0C8B8", roughness: 0.4, metalness: 0.0 }); // faux marble dado
        const pomRedMat = new THREE.MeshStandardMaterial({ color: "#A42A2E", roughness: 0.45, metalness: 0.0 }); // Pompeian red
        const ochreMat = new THREE.MeshStandardMaterial({ color: "#C9A961", roughness: 0.45, metalness: 0.0 }); // yellow ochre
        const blackPanelMat = new THREE.MeshStandardMaterial({ color: "#2B2B2B", roughness: 0.4, metalness: 0.0 }); // Roman black
        const friezeMat = new THREE.MeshStandardMaterial({ color: "#F0ECD8", roughness: 0.35, metalness: 0.0 }); // cream frieze
        const panelColors = [pomRedMat, ochreMat, blackPanelMat];
        const wallPanelR = RADIUS - 0.12;

        for (let ci = 0; ci < validColAngles.length; ci++) {
          const a1 = validColAngles[ci];
          const a2 = validColAngles[(ci + 1) % validColAngles.length];
          const aMid = (a1 + a2) / 2;
          // Skip panels that overlap with doors or exit portal
          const tooCloseToDoor = doorAngles.some(da => {
            let diff = Math.abs(aMid - da); if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < 0.28; // ~16° clearance
          });
          const EXIT_A = Math.PI / 2;
          let diffExit = Math.abs(aMid - EXIT_A); if (diffExit > Math.PI) diffExit = Math.PI * 2 - diffExit;
          if (tooCloseToDoor || diffExit < 0.28) continue;
          // W2 (WS4-6): the Ancestral Wall bay replaces its Pompeian panels —
          // real family photos hang there instead of colored boxes.
          if (W2 && AW_ENABLED && angDiff(aMid, AW_ANGLE) < AW_HALF + 0.1) continue;
          const px = Math.cos(aMid) * wallPanelR;
          const pz = Math.sin(aMid) * wallPanelR;

          // Dado zone (bottom 0.8m)
          const dado = mk(new THREE.BoxGeometry(2.0, 0.8, 0.04), dadoMat, px, 0.4, pz);
          dado.lookAt(0, 0.4, 0);
          scene.add(dado);

          // Main panel (middle ~4m)
          const mainPanelMat = panelColors[ci % 3];
          const mainPanel = mk(new THREE.BoxGeometry(2.0, 4.0, 0.04), mainPanelMat, px, 2.8, pz);
          mainPanel.lookAt(0, 2.8, 0);
          scene.add(mainPanel);

          // Gold frame border (thin strips around main panel)
          const frameThick = 0.05;
          // Top frame
          const ft = mk(new THREE.BoxGeometry(2.1, frameThick, 0.05), MS.gold, px, 4.8, pz);
          ft.lookAt(0, 4.8, 0);
          scene.add(ft);
          // Bottom frame
          const fb = mk(new THREE.BoxGeometry(2.1, frameThick, 0.05), MS.gold, px, 0.8, pz);
          fb.lookAt(0, 0.8, 0);
          scene.add(fb);
          // Left frame
          const fl = mk(new THREE.BoxGeometry(frameThick, 4.1, 0.05), MS.gold, px, 2.8, pz);
          fl.lookAt(0, 2.8, 0);
          fl.rotateY(Math.PI / 2);
          scene.add(fl);
          // Right frame
          const fr = mk(new THREE.BoxGeometry(frameThick, 4.1, 0.05), MS.gold, px, 2.8, pz);
          fr.lookAt(0, 2.8, 0);
          fr.rotateY(-Math.PI / 2);
          scene.add(fr);

          // Upper frieze (top 1m)
          const frieze = mk(new THREE.BoxGeometry(2.0, 1.0, 0.04), friezeMat, px, 5.3, pz);
          frieze.lookAt(0, 5.3, 0);
          scene.add(frieze);
        }
      }

      // ── Garland festoons between columns (authentic peristylium decoration) ──
      {
        const garlandMat = new THREE.MeshStandardMaterial({ color: "#4A6B3A", roughness: 0.6, metalness: 0.0 });
        const garlandGoldMat = new THREE.MeshStandardMaterial({ color: "#C8A050", roughness: 0.3, metalness: 0.5 });
        const garlandY = colH - 0.3; // hang from just below capitals
        for (let ci = 0; ci < validColAngles.length; ci++) {
          const a1 = validColAngles[ci];
          const a2 = validColAngles[(ci + 1) % validColAngles.length];
          // Skip garlands that cross door openings
          const gMid = (a1 + a2) / 2;
          const crossesDoor = doorAngles.some(da => {
            let diff = Math.abs(gMid - da); if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < 0.25;
          });
          if (crossesDoor) continue;

          const colRPos = RADIUS - 0.8;
          const x1 = Math.cos(a1) * colRPos, z1 = Math.sin(a1) * colRPos;
          const x2 = Math.cos(a2) * colRPos, z2 = Math.sin(a2) * colRPos;
          // Catenary curve between columns
          const pts: THREE.Vector3[] = [];
          const segments = 12;
          for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const x = x1 + (x2 - x1) * t;
            const z = z1 + (z2 - z1) * t;
            const sag = Math.sin(t * Math.PI) * 0.6; // droop amount
            pts.push(new THREE.Vector3(x, garlandY - sag, z));
          }
          const garlandGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.06, 6, false);
          scene.add(new THREE.Mesh(garlandGeo, garlandMat));
          // Gold rosette knots at attachment points
          for (const [px, pz] of [[x1, z1], [x2, z2]]) {
            const rosette = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), garlandGoldMat);
            rosette.position.set(px, garlandY, pz);
            scene.add(rosette);
          }
        }
      }

      // ── Oil Lamp Illumination (8 lamps between every other column) ──
      {
        const lampBronzeMat = MS.bronze;
        const lampGlowMat = new THREE.MeshStandardMaterial({
          // w1_hall: lamp PointLights die — the emissive dish glow IS the fixture
          color: "#FF9040", emissive: "#FF9040", emissiveIntensity: W1 ? 0.9 : 0.3, roughness: 0.4,
        });

        for (let ci = 0; ci < validColAngles.length && ci < 16; ci += 2) {
          const a = validColAngles[ci];
          const aNext = validColAngles[(ci + 1) % validColAngles.length];
          const lAngle = (a + aNext) / 2;
          // Skip if lamp would land on a door or exit portal
          const tooCloseToOpening = SKIP_ANGLES.some(sa => {
            let diff = Math.abs(lAngle - sa); if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < 0.25;
          });
          if (tooCloseToOpening) continue;
          // W2 (WS4-6): no oil lamp floating in front of the Ancestral Wall.
          if (W2 && AW_ENABLED && angDiff(lAngle, AW_ANGLE) < AW_HALF + 0.05) continue;
          const lR = RADIUS - 0.35;
          const lx = Math.cos(lAngle) * lR, lz = Math.sin(lAngle) * lR;
          const lY = 3.2;

          // Wall bracket (horizontal arm)
          const arm = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), lampBronzeMat, lx, lY, lz);
          arm.lookAt(0, lY, 0);
          arm.rotateX(Math.PI / 2);
          scene.add(arm);

          // Dish
          const inwardX = Math.cos(lAngle) * (lR - 0.35);
          const inwardZ = Math.sin(lAngle) * (lR - 0.35);
          scene.add(mk(new THREE.CylinderGeometry(0.1, 0.08, 0.04, 8), lampBronzeMat, inwardX, lY, inwardZ));

          // Emissive glow on dish
          scene.add(mk(new THREE.SphereGeometry(0.04, 6, 4), lampGlowMat, inwardX, lY + 0.05, inwardZ));

          // PointLight per lamp (skip on mobile; deleted under w1_hall)
          if (!isMobileGPU() && !W1) {
            const lampLight = new THREE.PointLight("#FF9040", 0.4, 6);
            lampLight.position.set(inwardX, lY + 0.15, inwardZ);
            scene.add(lampLight);
          }
        }
      }

      // ── Marble Benches (4 benches between bust pedestals) ──
      {
        const benchAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
        benchAngles.forEach((bAngle) => {
          const benchR = RADIUS - 3.5;
          const bx = Math.cos(bAngle) * benchR;
          const bz = Math.sin(bAngle) * benchR;

          // Seat
          const seat = mk(new THREE.BoxGeometry(1.2, 0.08, 0.4), MS.marble, bx, 0.54, bz);
          seat.lookAt(0, 0.54, 0);
          seat.rotateY(Math.PI / 2);
          scene.add(seat);

          // Two slab legs
          for (const offset of [-0.4, 0.4]) {
            const perpX = -Math.sin(bAngle) * offset;
            const perpZ = Math.cos(bAngle) * offset;
            const leg = mk(new THREE.BoxGeometry(0.35, 0.5, 0.06), MS.marble, bx + perpX, 0.25, bz + perpZ);
            leg.lookAt(0, 0.25, 0);
            leg.rotateY(Math.PI / 2);
            scene.add(leg);
          }
        });
      }

      // ── Decorative Amphorae (4 pieces) ──
      {
        const terracottaMat = new THREE.MeshStandardMaterial({ color: "#C17040", roughness: 0.5, metalness: 0.0 });
        const amphoraAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        amphoraAngles.forEach((aAngle) => {
          // Check not too close to a door
          const tooClose = doorAngles.some(da => {
            let diff = Math.abs(aAngle - da);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < Math.PI / 6;
          });
          if (tooClose) return;

          const aR = RADIUS - 1.8;
          const ax = Math.cos(aAngle) * aR, az = Math.sin(aAngle) * aR;

          // Body (tapered cylinder)
          scene.add(mk(new THREE.CylinderGeometry(0.12, 0.18, 0.6, 8), terracottaMat, ax, 0.3, az));
          // Neck
          scene.add(mk(new THREE.CylinderGeometry(0.06, 0.1, 0.2, 8), terracottaMat, ax, 0.7, az));
          // Lip
          scene.add(mk(new THREE.CylinderGeometry(0.08, 0.06, 0.04, 8), terracottaMat, ax, 0.82, az));
          // Handles (torus on each side)
          for (const side of [-1, 1]) {
            const hx = ax + (-Math.sin(aAngle) * 0.16 * side);
            const hz = az + (Math.cos(aAngle) * 0.16 * side);
            const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8, Math.PI), terracottaMat);
            handle.position.set(hx, 0.5, hz);
            handle.lookAt(ax, 0.5, az);
            handle.rotateX(Math.PI / 2);
            scene.add(handle);
          }
        });
      }

      // ── Ceiling Coffers around Oculus ──
      // W3H (audit): the 12 coffer slabs + frames + rosettes hang in MID-AIR
      // below the dome shell (floating ring) — dropped; real coffers arrive
      // with the Wave-B dome GLB.
      if (!W3H) {
        const OCULUS_R_LOCAL = OCULUS_R || 3.0;
        const cofferRingR = OCULUS_R_LOCAL + 2.5;
        const numCoffers = 12;
        const cofferGeo = new THREE.BoxGeometry(1.8, 0.15, 1.2);
        const cofferFrameGeo = new THREE.BoxGeometry(1.9, 0.06, 1.3);

        for (let c = 0; c < numCoffers; c++) {
          const cAngle = (c / numCoffers) * Math.PI * 2;
          const ccx = Math.cos(cAngle) * cofferRingR;
          const ccz = Math.sin(cAngle) * cofferRingR;
          const cofferY = WALL_H - 0.5;

          // Recessed panel
          const coffer = mk(cofferGeo, MS.wall, ccx, cofferY, ccz);
          coffer.lookAt(0, cofferY, 0);
          scene.add(coffer);

          // Gold trim frame
          const frame = mk(cofferFrameGeo, MS.gold, ccx, cofferY + 0.1, ccz);
          frame.lookAt(0, cofferY + 0.1, 0);
          scene.add(frame);

          // Rosette in alternating coffers
          if (c % 2 === 0) {
            const rosetteR2 = OCULUS_R_LOCAL + 2.5;
            const rx = Math.cos(cAngle) * rosetteR2;
            const rz = Math.sin(cAngle) * rosetteR2;
            const rosette = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), MS.gold);
            rosette.position.set(rx, cofferY + 0.12, rz);
            rosette.lookAt(0, cofferY + 0.12, 0);
            scene.add(rosette);
          }
        }
      }
    }

    // Storage room removed — kept virtual (accessible via menu only)

    // ═══ MUSEO VIVO WAVE 2 — w2_hall (WS4-6/7/9, WS7-7/10/15) ═══
    // The Ancestral Wall (salon hang of auto-selected family photos), the
    // owner's bust moment with a Fraunces name plaque, the baked oculus light
    // pool, and dolly-to-frame focus mode. Everything below is additive and
    // budget-neutral: zero new dynamic lights, decals additive/depthWrite:false.
    let awMountHandle: SalonHangMount | null = null;
    const awTextures: THREE.Texture[] = [];
    const awHitMeshes: THREE.Mesh[] = [];
    const awOwnedGeos: THREE.BufferGeometry[] = [];
    let awHitMat: THREE.MeshBasicMaterial | null = null;
    let focus: FocusMode | null = null;
    let focusFadeTimer: number | null = null;
    if (W2) {
      // ── WS4-6 THE ANCESTRAL WALL ──
      // Selection = owner decision 4 (favorites → oldest, cap 3 mobile / 5
      // desktop) + decision 7 (visitor routes hang PUBLIC only via the
      // ancestralPublicOnly prop — WS7-15).
      if (AW_ENABLED) {
      const awMax = isMobileGPU() ? 3 : 5;
      const awSelected = selectAncestralMemories(ancestralMemories ?? [], {
        max: awMax,
        publicOnly: !!ancestralPublicOnly,
      });
      const awCos = Math.cos(AW_ANGLE), awSin = Math.sin(AW_ANGLE);
      // Flat family-wall segment inside the curved rotunda: chord width from the
      // cleared arc, distance chosen so the flat panel's edges never poke
      // through the cylinder wall.
      const awRun = 2 * (RADIUS - 0.9) * Math.sin(AW_HALF);
      const awPanelW = awRun + 0.8;
      const awDist = Math.min(RADIUS - 1.0, Math.sqrt(Math.max(1, (RADIUS - 0.2) ** 2 - (awPanelW / 2) ** 2)));
      // Warm plaster backing (canon PLASTER — the wall reads ≥0.5 luminance by
      // albedo, per dogma 1) with an ink base strip grounding the segment.
      const awBackGeo = new THREE.PlaneGeometry(awPanelW, 8.6);
      const awBackMat = new THREE.MeshStandardMaterial({ color: PLASTER, roughness: 0.92, metalness: 0 });
      const awBack = new THREE.Mesh(awBackGeo, awBackMat);
      awBack.position.set(awCos * (awDist + 0.05), 4.3, awSin * (awDist + 0.05));
      awBack.lookAt(0, 4.3, 0);
      awBack.receiveShadow = true;
      scene.add(awBack);
      const awTrimGeo = new THREE.BoxGeometry(awPanelW, 0.22, 0.08);
      const awTrimMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.7, metalness: 0 });
      const awTrim = new THREE.Mesh(awTrimGeo, awTrimMat);
      awTrim.position.set(awCos * (awDist - 0.02), 0.11, awSin * (awDist - 0.02));
      awTrim.lookAt(0, 0.11, 0);
      scene.add(awTrim);

      // Salon hang — deterministic (seeded from memory ids inside salonHang),
      // photo textures scene-owned via paintTex (disposed in cleanup below,
      // per the salonHang texture-ownership contract). paintTex composes a
      // cover-cropped 4:3 canvas, so aspect 4/3 matches the texture exactly.
      const awById = new Map(awSelected.map((m) => [m.id, m]));
      const awRefs: SalonMemoryRef[] = awSelected.map((m) => ({
        id: m.id,
        aspect: 4 / 3,
        title: m.title,
        year: m.createdAt ? m.createdAt.slice(0, 4) : undefined,
      }));
      const awLayout = computeSalonHang(
        awRefs,
        { width: Math.max(3, awRun - 1.1), height: 6.4, yBase: 0 },
        { maxPieces: awMax, maxPieceWidth: 2.6 }
      );
      awHitMat = new THREE.MeshBasicMaterial({ visible: false }); // raycast-only — zero draw calls
      awMountHandle = mountSalonHang(awLayout, {
        getTexture: (ref) => {
          const tex = gatePaintTex(awById.get(ref.id)!, paintTex(awById.get(ref.id)!)); // reveal gate: AW photo draw
          awTextures.push(tex);
          return tex;
        },
        quality: isMobileGPU() ? "low" : "high",
        // 0 family photos → warm cream easel, never colored boxes (i18n ×5, flat key).
        emptyText: t("ancestralEmpty"),
        onPiece: (art, p) => {
          const mem = awById.get(p.memory.id)!;
          // Raycast contract identical to the interior scenes: userData.memory
          // on EVERY mesh of the piece, so memory interactions keep working.
          art.group.traverse((o) => { o.userData.memory = mem; });
          // Invisible hit plane (~1.4x, bounded so salon neighbours don't overlap).
          const hitGeo = new THREE.PlaneGeometry(p.width * 1.4, (p.height + 0.5) * 1.2);
          const hit = new THREE.Mesh(hitGeo, awHitMat!);
          hit.position.set(0, -0.15, 0.06);
          hit.userData.memory = mem;
          awOwnedGeos.push(hitGeo);
          awHitMeshes.push(hit);
          art.group.add(hit);
        },
      });
      awMountHandle.group.position.set(awCos * (awDist - 0.09), 0, awSin * (awDist - 0.09));
      awMountHandle.group.lookAt(0, 0, 0);
      scene.add(awMountHandle.group);
      awMountHandle.group.updateMatrixWorld(true);
      // WS7-10 focus targets: world pose per piece; the wall's outward normal
      // points at the hall centre. Hit meshes were pushed in placement order.
      const awNormal = new THREE.Vector3(-awCos, 0, -awSin).normalize();
      awLayout.placements.forEach((p, i) => {
        const target: FocusTarget = {
          position: awMountHandle!.group.localToWorld(new THREE.Vector3(p.x, p.y, 0.02)),
          normal: awNormal.clone(),
          planeHeight: p.height,
          planeWidth: p.width,
          data: awById.get(p.memory.id),
        };
        if (awHitMeshes[i]) awHitMeshes[i].userData.awTarget = target;
      });
      } // end AW_ENABLED

      // ── WS4-7 bust + Fraunces name plaque (canon pedestal) ──
      // W3H: the whole bust/statue concept is REMOVED (owner 2026-08-13).
      if (!W3H) {
        const { x: bx, z: bz } = W2_BUST;
        const pedBase = mk(new THREE.BoxGeometry(1.05, 0.16, 1.05), MS.marbleDark, bx, 0.08, bz);
        scene.add(pedBase);
        const pedShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1.02, 20), MS.marbleWarm);
        pedShaft.position.set(bx, 0.67, bz);
        pedShaft.castShadow = true;
        scene.add(pedShaft);
        const pedCap = mk(new THREE.BoxGeometry(0.92, 0.1, 0.92), MS.marbleDark, bx, 1.23, bz);
        scene.add(pedCap);
        addBustToScene(
          scene, bx, bz, 0,
          styleEra === "renaissance" ? "renaissance" : "roman",
          1.28, bustTextureUrl, marbleTex,
          (bustGender as BustGender) || "male", ren
        );
        const ownerName = (bustName || "").trim();
        if (ownerName) {
          const plaque = makeFrauncesLabel(ownerName, { width: 1.0, height: 0.26 });
          // Face the entrance spawn (0, 7.3) — the name reads on the walk-in.
          const pd = new THREE.Vector3(0 - bx, 0, 7.3 - bz).normalize();
          plaque.position.set(bx + pd.x * 0.56, 0.86, bz + pd.z * 0.56);
          plaque.lookAt(bx + pd.x * 8, 0.86, bz + pd.z * 8);
          scene.add(plaque);
        }
      }

      // ── WS4-9 oculus light pool — baked additive floor decal where the shaft
      // lands (transparent core over the sunken impluvium, warm glow on the
      // rim). Slow texture-rotation drift on desktop; static on mobile.
      w2PoolTex = makeOculusPoolTexture(isMobileGPU() ? 128 : 256);
      const poolGeo = new THREE.PlaneGeometry(11.5, 9.5);
      // r2: opacity 0.5→0.42 (stronger key carries it) + polygonOffset/lift off the
      // mosaic tile tops (z-fight sweep) + explicit renderOrder above the w1 pools.
      const poolMat = new THREE.MeshBasicMaterial({
        map: w2PoolTex, transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      });
      const w2Pool = new THREE.Mesh(poolGeo, poolMat);
      w2Pool.rotation.x = -Math.PI / 2;
      // W3H: the baked light pool follows the TILTED sun shaft — it lands
      // where the oculusSpot target points (−4, 4), not dead centre.
      w2Pool.position.set(W3H ? -4 : 0, 0.035, W3H ? 4 : 0);
      w2Pool.renderOrder = 2;
      scene.add(w2Pool);

      // ── WS7-10 focus mode: dolly-to-frame on the Ancestral Wall. ONE camera
      // authority: while focus.update(dt) returns true the walk/autoWalk
      // integrators in animate() are skipped; any manual input cancels.
      focus = createFocusMode({
        rig: {
          getPosition: () => pos.current.clone(),
          getLookAt: () => {
            const d = new THREE.Vector3(
              Math.sin(lookA.current.yaw) * Math.cos(lookA.current.pitch),
              Math.sin(lookA.current.pitch),
              -Math.cos(lookA.current.yaw) * Math.cos(lookA.current.pitch)
            );
            return pos.current.clone().add(d.multiplyScalar(4));
          },
          setPose: (p, look) => {
            // Write BOTH actual and target refs: the glide provides its own
            // easing, so the scene's smoothing must not double-filter it.
            posT.current.copy(p);
            pos.current.copy(p);
            const d = new THREE.Vector3().subVectors(look, p);
            const len = Math.max(d.length(), 1e-6);
            const yaw = Math.atan2(d.x, -d.z);
            const pitch = Math.asin(Math.max(-1, Math.min(1, d.y / len)));
            lookT.current.yaw = yaw; lookT.current.pitch = pitch;
            lookA.current.yaw = yaw; lookA.current.pitch = pitch;
          },
        },
        setDimmed: (dimmed) => {
          // 15% dim on hemi + env + oculus fill. Photos are unlit MeshBasic —
          // they stay the brightest pixels; PLASTER walls stay ≥0.5 luminance.
          const k = dimmed ? 1 - FOCUS_DIM : 1;
          hemi.intensity = hemiBase * k;
          oculusFill.intensity = oculusFillBase * k;
          scene.environmentIntensity = ENV_INT * k;
        },
        openMemory: (tg) => {
          const mem = tg.data as Mem | undefined;
          if (mem) onAncestralClickRef.current?.(mem);
        },
        // Reduced-motion: cream veil (never black) around the instant cut.
        fade: (applyCut) => {
          setCreamFade(1);
          if (focusFadeTimer !== null) window.clearTimeout(focusFadeTimer);
          focusFadeTimer = window.setTimeout(() => {
            focusFadeTimer = null;
            applyCut();
            setCreamFade(0);
          }, 240);
        },
        floorY: 0,
      });
    }

    // ── DUST PARTICLES — duplicate 300-pt system deleted under w1_hall
    // (WS4-5/WS10-3: ONE 150-sprite system per scene — createDustParticles below) ──
    const dustN = 300;
    let dustGeo: THREE.BufferGeometry | null = null;
    if (!W1) {
      dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(dustN * 3);
      const dustSizes = new Float32Array(dustN);
      for (let i = 0; i < dustN; i++) {
        const a = Math.random() * Math.PI * 2;
        // 70% of particles concentrated in the light beam area
        const inBeam = Math.random() < 0.7;
        const r2 = inBeam ? Math.random() * OCULUS_R * 1.5 : Math.random() * RADIUS * 0.8;
        dustPos[i * 3] = Math.cos(a) * r2;
        dustPos[i * 3 + 1] = 1 + Math.random() * (TOTAL_H - 2);
        dustPos[i * 3 + 2] = Math.sin(a) * r2;
        dustSizes[i] = 0.02 + Math.random() * 0.13; // varied sizes 0.02 to 0.15
      }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      dustGeo.setAttribute("size", new THREE.BufferAttribute(dustSizes, 1));
      const dustMat = new THREE.PointsMaterial({
        color: dlPreset.sunColor, size: 0.1, transparent: true, opacity: 0.5 * dlPreset.sunIntensity,
        blending: THREE.AdditiveBlending, depthWrite: false,
        sizeAttenuation: true,
      });
      scene.add(new THREE.Points(dustGeo, dustMat));
    }

    // ── GRAND EXIT PORTAL (back to exterior) — larger and more imposing than wing doors ──
    const exitAngle = Math.PI / 2;
    const exitX = Math.cos(exitAngle) * (RADIUS - 0.3);
    const exitZ = Math.sin(exitAngle) * (RADIUS - 0.3);
    const exitInN = new THREE.Vector3(-Math.cos(exitAngle), 0, -Math.sin(exitAngle));
    const exitLatN = new THREE.Vector3(Math.cos(exitAngle + Math.PI / 2), 0, Math.sin(exitAngle + Math.PI / 2));
    const EXIT_W = 4.0, EXIT_H = 8.5;

    // Bright outdoor light plane (sky visible through opening)
    const portalGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(EXIT_W - 0.4, EXIT_H - 0.5),
      new THREE.MeshBasicMaterial({ color: dlPreset.sunColor, transparent: true, opacity: 0.08 * dlPreset.sunIntensity })
    );
    portalGlow.position.set(exitX, EXIT_H / 2, exitZ);
    portalGlow.lookAt(0, EXIT_H / 2, 0);
    scene.add(portalGlow);

    // Massive marble columns flanking the entrance (thicker than wing door frames)
    const exitColR = 0.55;
    for (const side of [-1, 1]) {
      const cx = exitX + exitLatN.x * side * (EXIT_W / 2 + exitColR / 2);
      const cz = exitZ + exitLatN.z * side * (EXIT_W / 2 + exitColR / 2);
      // Column shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(exitColR, exitColR * 1.08, EXIT_H - 1, 16), MS.marble);
      shaft.position.set(cx, (EXIT_H - 1) / 2, cz);
      shaft.castShadow = true;
      scene.add(shaft);
      // Corinthian capital
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(exitColR * 1.9, exitColR * 1.1, 0.7, 16), MS.gold);
      cap.position.set(cx, EXIT_H - 0.65, cz);
      scene.add(cap);
      // Abacus
      const ab = mk(new THREE.BoxGeometry(exitColR * 3.5, 0.15, exitColR * 3.5), MS.marbleWarm, cx, EXIT_H - 0.2, cz);
      scene.add(ab);
      // Base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(exitColR * 1.4, exitColR * 1.6, 0.4, 16), MS.marbleDark);
      base.position.set(cx, 0.2, cz);
      scene.add(base);
    }

    // Grand arch above entrance (semicircular, larger than wing arches)
    const exitArchW = EXIT_W / 2 + 0.5;
    const exitArchH = 1.8;
    const exitArchCurve = new THREE.EllipseCurve(0, 0, exitArchW, exitArchH, 0, Math.PI, false, 0);
    const exitArchPoints = exitArchCurve.getPoints(36).map(p => new THREE.Vector3(p.x, p.y, 0));
    const exitArchGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(exitArchPoints), 36, 0.14, 8, false);
    const exitArch = new THREE.Mesh(exitArchGeo, MS.gold);
    exitArch.position.set(exitX + exitInN.x * 0.1, EXIT_H, exitZ + exitInN.z * 0.1);
    exitArch.lookAt(new THREE.Vector3(0, EXIT_H, 0));
    exitArch.rotateY(Math.PI);
    scene.add(exitArch);

    // Keystone at arch apex
    const exitKeystone = mk(new THREE.BoxGeometry(0.4, 0.5, 0.2), MS.goldDark,
      exitX + exitInN.x * 0.3, EXIT_H + exitArchH, exitZ + exitInN.z * 0.3);
    exitKeystone.lookAt(new THREE.Vector3(0, EXIT_H + exitArchH, 0));
    scene.add(exitKeystone);

    // Heavy marble lintel/entablature
    const exitLintel = mk(new THREE.BoxGeometry(EXIT_W + 1.8, 0.5, 0.4), MS.marble,
      exitX + exitInN.x * 0.05, EXIT_H + 0.05, exitZ + exitInN.z * 0.05);
    exitLintel.lookAt(new THREE.Vector3(0, EXIT_H + 0.05, 0));
    scene.add(exitLintel);

    // Threshold step (marble)
    const exitThresh = mk(new THREE.BoxGeometry(EXIT_W + 1.0, 0.2, 0.6), MS.marbleDark,
      exitX + exitInN.x * 0.1, 0.1, exitZ + exitInN.z * 0.1);
    exitThresh.lookAt(new THREE.Vector3(0, 0.1, 0));
    scene.add(exitThresh);

    // Gradient visible through doorway (suggests outdoors).
    // W3H (audit P0): the cool #87CEEB sky was a triple canon violation — the
    // brightest, coolest pixel in a golden-hour hall. Now the doorway shows
    // the same golden-hour world the visitor just walked through.
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 256; skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext("2d")!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
    if (W3H) {
      skyGrad.addColorStop(0, "#BFD4E4");   // pale warm-blue zenith
      skyGrad.addColorStop(0.45, "#EAD9B8"); // golden haze band
      skyGrad.addColorStop(0.8, "#E8C87A");  // low sun glow
      skyGrad.addColorStop(1, "#C9A96A");    // golden wheat ground
    } else {
      skyGrad.addColorStop(0, "#87CEEB");   // sky blue top
      skyGrad.addColorStop(0.5, "#B8DCF0"); // lighter middle
      skyGrad.addColorStop(0.85, "#E8DCC8"); // warm horizon
      skyGrad.addColorStop(1, "#C8B89A");   // ground hint
    }
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 256, 512);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(EXIT_W - 0.6, EXIT_H - 0.5),
      new THREE.MeshBasicMaterial({ map: skyTex, transparent: true, opacity: 0.6 })
    );
    skyPlane.position.set(exitX + exitInN.x * 0.05, EXIT_H / 2, exitZ + exitInN.z * 0.05);
    skyPlane.lookAt(0, EXIT_H / 2, 0);
    scene.add(skyPlane);

    // Click target
    const portalHit = new THREE.Mesh(
      new THREE.BoxGeometry(EXIT_W, EXIT_H, 0.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    portalHit.position.set(exitX, EXIT_H / 2, exitZ);
    portalHit.lookAt(0, EXIT_H / 2, 0);
    scene.add(portalHit);

    // Outdoor light streaming in — under w1_hall this is warm point 2 of 2
    // (portalSpot deleted; the emissive portalGlow/sky planes carry the read).
    let portalLight: THREE.PointLight | null = null;
    if (W1) {
      portalLight = new THREE.PointLight(dlPreset.sunColor, 0.8 * dlPreset.sunIntensity, 12); // r2: fill down with the ratio shift
      portalLight.position.set(exitX - exitInN.x * 1.0, EXIT_H * 0.6, exitZ - exitInN.z * 1.0);
      scene.add(portalLight);
    } else {
      if(!isMobileGPU()){portalLight = new THREE.PointLight(dlPreset.sunColor, 1.2 * dlPreset.sunIntensity, 12);
      portalLight.position.set(exitX - exitInN.x * 1.0, EXIT_H * 0.6, exitZ - exitInN.z * 1.0);
      scene.add(portalLight);}
      if(!isMobileGPU()){const portalSpot = new THREE.SpotLight(dlPreset.sunColor, 1.5 * dlPreset.sunIntensity, 18, Math.PI / 5, 0.5, 0.7);
      portalSpot.position.set(exitX + exitInN.x * 3, EXIT_H * 0.5, exitZ + exitInN.z * 3);
      portalSpot.target.position.set(exitX - exitInN.x * 4, 0, exitZ - exitInN.z * 4);
      scene.add(portalSpot);
      scene.add(portalSpot.target);}
    }

    // ── ENVIRONMENT MAP (critical for PBR reflections) ──
    // The fromScene PMREM bake is deterministic given the hall construction inputs
    // (wings fingerprint + daylight preset), so cache it per renderer and skip the
    // bake on repeat mounts. Only cache once the shared PBR textures have finished
    // loading — an early bake without textures must stay per-mount (as today) so a
    // later fully-textured mount isn't served the texture-less snapshot.
    const bakeFromScene = () => {
      const pmrem = new THREE.PMREMGenerator(ren);
      pmrem.compileEquirectangularShader();
      const rt = pmrem.fromScene(scene, 0, 0.1, 100);
      pmrem.dispose();
      return rt;
    };
    const pbrTexturesReady = allTexSets.every(s =>
      [s.map, s.normalMap, s.roughnessMap, s.aoMap].every(tx => {
        const img = tx.image as { complete?: boolean } | undefined;
        return !!img && img.complete !== false;
      })
    );
    let envRT: THREE.WebGLRenderTarget | null = null; // per-mount bake (textures not ready yet)
    let envFromScene: THREE.Texture;
    if (pbrTexturesReady) {
      envFromScene = acquireEnvMap(ren, `entrance-fromScene|${wingsFingerprint}|${JSON.stringify(dlPreset)}`, () => {
        const rt = bakeFromScene();
        return { texture: rt.texture, dispose: () => { rt.texture.dispose(); rt.dispose(); } };
      });
    } else {
      envRT = bakeFromScene();
      envFromScene = envRT.texture;
    }
    scene.environment = envFromScene;

    // ── FIRST-PERSON CAMERA ──
    // Player starts near the exit portal (entrance), facing toward the room center.
    // The look-direction formula uses: x = sin(yaw), z = -cos(yaw).
    // From angle A on the circle, direction to center is (-cos(A), 0, -sin(A)),
    // so the correct yaw to face inward is A - PI/2.
    const startAngle = exitAngle - Math.PI / 2;
    // Always start with entrance cinematic position (eye height = the single
    // shared EYE_HEIGHT constant from cameraComfort — dogma 5)
    pos.current.set(0, EYE_HEIGHT, 7.3);
    posT.current.set(0, EYE_HEIGHT, 7.3);
    lookT.current = { yaw: 0.0270, pitch: 0.0360 };
    lookA.current = { yaw: 0.0270, pitch: 0.0360 };

    // Store collision obstacles: column positions
    const colPositions: { x: number; z: number; r: number }[] = [];
    for (const angle of validColAngles) {
      colPositions.push({
        x: Math.cos(angle) * (RADIUS - 0.8),
        z: Math.sin(angle) * (RADIUS - 0.8),
        r: 0.7,
      });
    }
    // W2 (WS4-7): the bust pedestal is solid — no ghost-walking through it.
    // W3H: pedestal removed with the bust concept → no collider either.
    if (W2 && !W3H) colPositions.push({ x: W2_BUST.x, z: W2_BUST.z, r: 0.95 });
    // W3H: the impluvium is open water — WADABLE by owner decree (no collider).

    // ── WALKTHROUGH HIGHLIGHT — golden glow on target door meshes ──
    // Under w1_hall the 7 intensity-0 PointLights are deleted (WS4-3); the gold
    // ring decal (w1HlRing) marks the walkthrough target instead.
    const hlDoorLights: Map<string,THREE.PointLight>=new Map();
    if (!W1) {
      const seenWings=new Set<string>();
      doorMeshes.forEach(d=>{
        if(seenWings.has(d.wingId))return;seenWings.add(d.wingId);
        const dx2=Math.cos(d.angle)*(RADIUS-2);const dz2=Math.sin(d.angle)*(RADIUS-2);
        const light=new THREE.PointLight("#D4AF37",0,15);light.position.set(dx2,3,dz2);scene.add(light);
        hlDoorLights.set(d.wingId,light);
      });
    }
    const goldColor=new THREE.Color("#D4AF37");

    // ── DUST PARTICLES (oculus light beam) ──
    // W3H: motes live INSIDE the tilted shaft volume (mid-beam centre,
    // tighter bounds) so they ignite where the light is, not everywhere.
    const dust = createDustParticles(W3H
      ? { count: 220, bounds: { x: 4.5, y: 11, z: 4.5 }, center: new THREE.Vector3(-1.8, 11, 1.8), opacity: 0.28 * dlPreset.sunIntensity, size: 0.045, color: dlPreset.sunColor }
      : { count: 150, bounds: { x: 8, y: 10, z: 8 }, center: new THREE.Vector3(0, 12, 0), opacity: 0.2 * dlPreset.sunIntensity, size: 0.04, color: dlPreset.sunColor });
    scene.add(dust.points);

    // ── VOLUMETRIC LIGHT BEAM from oculus ──
    // W3H: the beam follows the tilted sun vector (same target as oculusSpot),
    // and gains a brighter INNER CORE cone — the layered falloff reads as a
    // real shaft of dusty air instead of a single faint ghost cone.
    const beamDir = W3H ? new THREE.Vector3(-4, -(TOTAL_H - 1), 4).normalize() : new THREE.Vector3(0, -1, 0);
    const oculusBeam = createLightBeam({ position: new THREE.Vector3(0, TOTAL_H, 0), direction: beamDir, length: TOTAL_H - 1, radius: 3.5, color: dlPreset.sunColor, opacity: (W3H ? 0.05 : 0.04) * dlPreset.sunIntensity });
    scene.add(oculusBeam.mesh);
    let oculusBeamCore: ReturnType<typeof createLightBeam> | null = null;
    if (W3H) {
      oculusBeamCore = createLightBeam({ position: new THREE.Vector3(0, TOTAL_H, 0), direction: beamDir, length: TOTAL_H - 1, radius: 1.7, color: dlPreset.sunColor, opacity: 0.075 * dlPreset.sunIntensity });
      scene.add(oculusBeamCore.mesh);
    }

    // WS10-4 (w1_hall): footsteps return as procedural marble taps — fired from
    // the walk integrator on real position delta (playFootstep cadence-caps).
    const w1StepPrev = { x: 0, z: 7.3 };

    // ── Optimize: deduplicate materials to reduce GPU state changes ──
    optimizeMaterials(scene);

    const clock = new THREE.Clock();
    // Tap-is-travel click target (WS8-4, w1_hall): any-distance door/portal tap
    // auto-walks (comfort-capped) then enters — the 15m dead-click gate is gone.
    const awClick: { id: string | null; x: number; z: number } = { id: null, x: 0, z: 0 };
    const startAutoWalk = (id: string) => {
      const ang = id === "__exterior__" ? exitAngle : doorMeshes.find(d => d.wingId === id)?.angle;
      if (ang === undefined) { onDoorClickRef.current(id); return; }
      awClick.id = id;
      awClick.x = Math.cos(ang) * (RADIUS - 4);
      awClick.z = Math.sin(ang) * (RADIUS - 4);
    };
    // ═══ W3H SHELL MERGE (masterplan interim perf step — the "dead
    // mergeStaticMeshes" audit finding, done SELECTIVELY) ═══
    // Collapse the hundreds of static opaque decor meshes into one mesh per
    // shared material. Excluded: raycast targets (userData.wingId/awTarget),
    // anything transparent/alphaTest or with a renderOrder (blend-order
    // sensitive), instanced meshes, and the procedural dome/oculus disc whose
    // .visible is toggled when the GLB hero lands. Async GLBs arrive after
    // this pass and are untouched.
    if (W3H) {
      const KEEP = new Set<THREE.Object3D>([domeMesh, oculusMesh]);
      const mergeBuckets = new Map<string, { mat: THREE.Material; meshes: THREE.Mesh[] }>();
      scene.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh) return;
        if ((m as THREE.InstancedMesh).isInstancedMesh) return;
        if (KEEP.has(m)) return;
        if (m.userData && (m.userData.wingId || m.userData.awTarget)) return;
        if (Array.isArray(m.material)) return;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (!mat || mat.transparent || (mat.alphaTest ?? 0) > 0) return;
        if (m.renderOrder !== 0) return;
        const key = mat.uuid;
        if (!mergeBuckets.has(key)) mergeBuckets.set(key, { mat, meshes: [] });
        mergeBuckets.get(key)!.meshes.push(m);
      });
      let shellMerged = 0, shellRemoved = 0;
      mergeBuckets.forEach(({ mat, meshes }) => {
        if (meshes.length < 4) return; // singles/pairs aren't worth the bake
        const geos: THREE.BufferGeometry[] = [];
        for (const src of meshes) {
          src.updateWorldMatrix(true, false);
          const g = src.geometry.clone();
          g.applyMatrix4(src.matrixWorld);
          geos.push(g);
        }
        const merged = mergeGeometries(geos, false);
        geos.forEach((g) => g.dispose());
        if (!merged) return; // mixed attribute sets — leave this bucket as-is
        const mm = new THREE.Mesh(merged, mat);
        mm.castShadow = meshes.some((x) => x.castShadow);
        mm.receiveShadow = meshes.some((x) => x.receiveShadow);
        scene.add(mm);
        meshes.forEach((x) => { x.parent?.remove(x); x.geometry.dispose(); });
        shellMerged++;
        shellRemoved += meshes.length;
      });
      console.info(`[W3H] shell merge: ${shellRemoved} static meshes → ${shellMerged} merged draws`);
      ren.shadowMap.needsUpdate = true;
    }

    let _lastCream = 0; // cream veil state throttle (reduced-motion crossfade)
    // Blink hygiene at (re)build: force the curtain fully open and re-sync the
    // shared shadow (blinkPushedRef) — a rebuild mid-blink otherwise inherited
    // a stuck nonzero blinkOpacity that no guarded write would ever clear.
    // (The per-frame throttle itself lives on blinkPushedRef, component-level.)
    blinkRef.current = 0;
    pushBlink(0);
    setCreamFade(0);
    let w3hCinT = 0;    // W3H: stall-proof cinematic time (accumulated clamped dt)
    // Touch-move vector — hoisted above animate() so the w1_hall movement block
    // can read it directly per frame (replaces the 16ms synthetic-WASD poll).
    const touchMoveDir = { x: 0, z: 0 };
    let hoveredWing: string | null = null;
    // W2 (WS7-10): the Ancestral Wall focus target under the cursor (fed by the
    // per-frame hover raycast; consumed by the click/tap handlers).
    let hovAWTarget: FocusTarget | null = null;
    const _isMobile = window.innerWidth < 768 || window.innerHeight < 500;
    let _frameCount = 0;
    // First frame of every build always presents, even when document.hidden —
    // on a hidden/occluded tab rAF is never serviced, so the synchronous
    // animate() call below is the only render this build gets. The old
    // unconditional `if (document.hidden) return` before composer.render()
    // defeated the "first frame still runs so onReady fires" intent stated in
    // the pause block below (2026-08-20, ExteriorScene _firstFrameDone parity).
    let _presented = false;
    // ── Hover-raycast hygiene: onMove only records the cursor position; the actual
    // raycast runs at most once per frame inside animate() (same behavior, less work).
    const _hoverPt = { x: 0, y: 0 };
    let _hoverDirty = false;
    const _lastRayPos = { x: -1e3, y: -1e3 };
    let _lastCursor = "";
    let _elRect = el.getBoundingClientRect();
    const _refreshRect = () => { _elRect = el.getBoundingClientRect(); };
    window.addEventListener("resize", _refreshRect);
    const _rectRO = typeof ResizeObserver !== "undefined" ? new ResizeObserver(_refreshRect) : null;
    _rectRO?.observe(el);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      // Persistent-portal pause: after the warm-up frame, skip the entire pass
      // while hidden. The first frame still runs (readyFired false) so onReady
      // fires and the hall is ready to show instantly on first entrance.
      if (readyFiredRef.current && _isHidden()) {
        if (!_wasHidden) { _wasHidden = true; ambientPause(); }
        return;
      }
      if (_wasHidden) {
        // Re-shown: reset to the entrance spawn (the transition overlay masks the
        // cut, exactly as a fresh mount would), resume ambient audio, and re-fire
        // onReady so MemoryPalace dismisses its loading overlay on real readiness.
        _wasHidden = false;
        // W2 (WS7-10): a hidden→shown cycle resets to the spawn — never resume
        // a stale focus hold (undims via cancel's setDimmed(false)).
        focus?.cancel();
        // A mid-flight cinematic from an ABORTED onboarding leg must not
        // resume on a later re-entry (persistent hall: the wizard can advance
        // past the leg without skipCinematic; a fresh mount only arms the
        // cinematic from onboardingMode). Active onboarding resumes normally;
        // anything else cancels — the blink-curtain failsafe below then clears
        // any leftover black overlay on this same frame.
        if (entranceCinematicRef.current && !onboardingModeRef.current) {
          entranceCinematicRef.current = false;
          setCinematicActive(false);
        }
        pos.current.set(0, EYE_HEIGHT, 7.3); posT.current.set(0, EYE_HEIGHT, 7.3);
        lookT.current = { yaw: 0.0270, pitch: 0.0360 };
        lookA.current = { yaw: 0.0270, pitch: 0.0360 };
        ambientResume();
        try { onReadyRef.current?.(); } catch {}
      }
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      _frameCount++;
      // W3H (audit): the cinematic ran on ABSOLUTE clock time — a 3s shader
      // compile stall ate 3s of the 6s intro. Accumulate the clamped dt
      // instead: a stall advances the cinematic by at most 0.05s.
      if (entranceCinematicRef.current) w3hCinT += dt;

      // Walkthrough highlight
      const hlTarget=highlightDoorRef.current;
      if (W1) {
        // w1_hall (WS4-3/4): gold ring decal marks the target — no PointLight,
        // no colored emissive pulse on the door material.
        if (w1HlRing) {
          const rm = w1HlRing.material as THREE.MeshBasicMaterial;
          const hlDoor = hlTarget ? doorMeshes.find(d => d.wingId === hlTarget) : undefined;
          if (hlDoor) {
            w1HlRing.position.set(Math.cos(hlDoor.angle) * (RADIUS - 3), 0.04, Math.sin(hlDoor.angle) * (RADIUS - 3));
            rm.opacity = 0.45 + Math.sin(t * 2.5) * 0.2;
          } else if (rm.opacity > 0.005) {
            rm.opacity += (0 - rm.opacity) * 0.08;
          }
        }
      } else {
      // (pre-Wave-1) pulse golden emissive on target door
      doorMeshes.forEach(d=>{
        if(hlTarget===d.wingId){
          const pulse=0.6+Math.sin(t*2.5)*.25;
          d.mat.emissive.copy(goldColor);
          d.mat.emissiveIntensity+=(pulse-d.mat.emissiveIntensity)*.12;
        }
      });
      hlDoorLights.forEach((light,id)=>{
        if(hlTarget===id)light.intensity=3+Math.sin(t*2)*1.5;
        else light.intensity+=(0-light.intensity)*.05;
      });
      }

      // ── Entrance cinematic (onboarding only) ──
      // Guided-walkthrough restore (2026-08-21): the owner explicitly wants the
      // BLINK choreography back (settle → look left → blink ×2 → look right →
      // blink → walk to the roots door), so branch selection is reduced-motion
      // only — the retired W1 ~6s push-in variant is deleted. Both paths end by
      // firing onDoorClick("roots"), exactly like skipCinematic().
      if (entranceCinematicRef.current && !autoWalkToRef.current && !awClick.id) {
        const ot = w3hCinT; // stall-proof accumulated time (W3H audit) — a compile stall advances ≤0.05s/frame
        const CIN_DUR = 6.0;
        const START_Z = 7.3, END_Z = 3.2;
          if (reduceMotion) {
            // Reduced motion: crossfade sequence of the same two composed shots
            // (spawn framing → final push-in framing) via a CREAM veil — no
            // camera motion, never black.
            const FADE = 0.4, HOLD_A = 2.6;
            let cream = 0;
            if (ot < HOLD_A) {
              cream = 0; // shot A: hold the spawn framing
            } else if (ot < HOLD_A + FADE) {
              cream = (ot - HOLD_A) / FADE; // veil in
            } else {
              // shot B: the final composed framing, set under full veil
              pos.current.set(0, EYE_HEIGHT, END_Z);
              posT.current.set(0, EYE_HEIGHT, END_Z);
              lookT.current.yaw = 0; lookT.current.pitch = 0.02;
              lookA.current.yaw = 0; lookA.current.pitch = 0.02;
              cream = Math.max(0, 1 - (ot - HOLD_A - FADE) / FADE); // veil out
            }
            if (Math.abs(cream - _lastCream) > 0.02 || (cream === 0 && _lastCream !== 0)) {
              _lastCream = cream; setCreamFade(cream);
            }
            if (ot >= CIN_DUR) {
              if (_lastCream !== 0) { _lastCream = 0; setCreamFade(0); }
              entranceCinematicRef.current = false;
              setCinematicActive(false);
              if (onboardingModeRef.current) {
                onboardingModeRef.current = false;
                onDoorClickRef.current("roots");
              }
            }
          } else {
        // Guided walkthrough: look around with blinks → slow walk to the roots
        // door. Geometry verified against the CURRENT hall (2026-08-21): spawn
        // is (0, EYE_HEIGHT, START_Z=7.3); roots door = doorDefs[0] at angle
        // −π/2 with the approach point at (0, −(RADIUS−4)) — the formulas below
        // are radius-relative so they track RADIUS/NUM_DOORS; the centre
        // impluvium is WADABLE by owner decree (no collider), so the straight
        // walk through the water is intentional; benches (±π/4 diagonals) and
        // amphorae (skipped near door angles) never sit on the x=0 path.
        // Single blink helper — slow, deliberate (x2 original speed: close 0.4s, hold 0.2s, open 0.4s)
        const singleBlink = (localT: number): number => {
          const bClose = 0.4, bHold = 0.2, bOpen = 0.4, bTotal = bClose + bHold + bOpen;
          if (localT < 0 || localT >= bTotal) return 0;
          if (localT < bClose) return localT / bClose;
          if (localT < bClose + bHold) return 1;
          return (bTotal - localT) / bOpen;
        };
        // Two blinks with gap
        const twoBlinks = (localT: number): number => {
          const gap = 0.5; // gap between blinks
          return Math.min(Math.max(singleBlink(localT), singleBlink(localT - 1.0 - gap)), 1);
        };
        // Timings (ITEM 3, owner: slow the look-around by ~2.5s): settle(0.8) →
        // look left(2.6) → blink 2x + hold(2.7) → look right(2.6) → blink 1x +
        // hold(1.2) → center(0.4). Holds at the extremes are slightly longer
        // than the blink envelopes (2.5s/1.0s) so the doors actually register.
        const T1 = 0.8, T2 = T1 + 2.6, T3 = T2 + 2.7, T4 = T3 + 2.6, T5 = T4 + 1.2, T6 = T5 + 0.4;
        const LOOK_DUR = T6; // ~10.3s (was 7.7) → leg total ≈ 22.3s with the 12s walk
        const WALK_DUR = 12.0; // x3 slower walk to door
        // Smoothstep helper
        const ss = (a: number, b: number, p: number) => { const t2 = p * p * (3 - 2 * p); return a + (b - a) * t2; };

        if (ot < LOOK_DUR) {
          // Step 1 (0-0.8s): arrive at initial gaze, settle in
          if (ot < T1) {
            lookT.current.yaw = 0.0270;
            lookT.current.pitch = 0.0360;
          }
          // Step 2 (0.8-3.4s): slowly look left
          else if (ot < T2) {
            const p = Math.min((ot - T1) / 2.6, 1);
            lookT.current.yaw = ss(0.0270, -0.9090, p);
            lookT.current.pitch = ss(0.0360, 0.3240, p);
          }
          // Step 3 (3.4-6.1s): blink twice while holding left gaze
          else if (ot < T3) {
            lookT.current.yaw = -0.9090;
            lookT.current.pitch = 0.3240;
            blinkRef.current = twoBlinks(ot - T2);
          }
          // Step 4 (6.1-8.7s): slowly look right
          else if (ot < T4) {
            blinkRef.current = 0;
            const p = Math.min((ot - T3) / 2.6, 1);
            lookT.current.yaw = ss(-0.9090, 1.0380, p);
            lookT.current.pitch = ss(0.3240, 0.3510, p);
          }
          // Step 5 (8.7-9.9s): blink once while holding right gaze
          else if (ot < T5) {
            lookT.current.yaw = 1.0380;
            lookT.current.pitch = 0.3510;
            blinkRef.current = singleBlink(ot - T4);
          }
          // Step 6 (9.9-10.3s): readjust gaze to center
          else {
            blinkRef.current = 0;
            const p = Math.min((ot - T5) / 0.4, 1);
            lookT.current.yaw = ss(1.0380, 0.0360, p);
            lookT.current.pitch = ss(0.3510, 0.0540, p);
          }
          // Sync blink opacity to React state — thresholded (ITEM 2): a raw
          // per-frame setState re-rendered the whole component tree at 60fps
          // during the look phase, and those main-thread hitches read as
          // camera shake. _lastCream pattern; endpoints (0/1) always land.
          const bo = blinkRef.current;
          if (Math.abs(bo - blinkPushedRef.current) > 0.02 || (bo === 0 && blinkPushedRef.current !== 0) || (bo === 1 && blinkPushedRef.current !== 1)) {
            pushBlink(bo);
          }
        }
        // Walk phase: slow walk to roots door (12s)
        else if (ot < LOOK_DUR + WALK_DUR) {
          blinkRef.current = 0;
          // Phase boundary: the zero endpoint ALWAYS lands (threshold applies
          // to mid-animation frames only; the shared shadow can't desync).
          if (blinkPushedRef.current !== 0) pushBlink(0);
          const rootsDoorAngle = (0 / NUM_DOORS) * Math.PI * 2 - Math.PI / 2;
          const approachR = RADIUS - 4;
          const targetX = Math.cos(rootsDoorAngle) * approachR;
          const targetZ = Math.sin(rootsDoorAngle) * approachR;
          const wp = Math.min((ot - LOOK_DUR) / WALK_DUR, 1);
          const wEase = wp * wp * (3 - 2 * wp);
          posT.current.x = ss(0, targetX, wEase);
          posT.current.z = ss(START_Z, targetZ, wEase);
          const faceDoorAngle = Math.atan2(targetX - posT.current.x, -(targetZ - posT.current.z));
          // ITEM 2: the raw per-frame factors (.04/.03) were framerate-dependent —
          // at 120Hz the gaze snapped twice as fast, at fps dips it lagged then
          // jumped. Framerate-independent 1-exp(-k*dt), same feel at 60fps.
          lookT.current.yaw += (faceDoorAngle - lookT.current.yaw) * (1 - Math.exp(-2.4487 * dt)); // f=.04 @60fps
          lookT.current.pitch += (0 - lookT.current.pitch) * (1 - Math.exp(-1.8271 * dt)); // f=.03 @60fps
        } else {
          blinkRef.current = 0;
          // Leg end: the zero endpoint ALWAYS lands before the roots handoff.
          if (blinkPushedRef.current !== 0) pushBlink(0);
          entranceCinematicRef.current = false;
          setCinematicActive(false);
          if (onboardingModeRef.current) {
            onboardingModeRef.current = false;
            onDoorClickRef.current("roots");
          }
        }
        } // end blink cinematic branch
      } else if (blinkRef.current !== 0 || blinkPushedRef.current !== 0 || _lastCream !== 0) {
        // FAILSAFE (owner "hall became very dark", 2026-08-23): the cinematic
        // is NOT driving this frame — finished, skipped, or interrupted
        // mid-blink by an autoWalk/door-tap (awClick)/external cancel. The
        // black blink curtain and the reduced-motion cream veil must never
        // survive it: an interruption while the eyes were "closed" previously
        // left a permanent semi-opaque black overlay over the hall. Keyed on
        // _lastCream (not creamFade) so the focus-mode cream cut is untouched.
        blinkRef.current = 0;
        if (blinkPushedRef.current !== 0) pushBlink(0);
        if (_lastCream !== 0) { _lastCream = 0; setCreamFade(0); }
      }

      // ── W2 (WS7-10): focus mode owns the camera while active — ONE camera
      // authority. Manual input (keys/joystick) or a pending autoWalk cancels;
      // while focusOwns the walk/autoWalk integrators below are skipped.
      let focusOwns = false;
      if (focus) {
        if (focus.state() !== "idle") {
          const k = keys.current;
          const manualMove =
            !!(k["w"] || k["a"] || k["s"] || k["d"] || k["arrowup"] || k["arrowdown"] || k["arrowleft"] || k["arrowright"]) ||
            Math.abs(touchMoveDir.x) > 0.2 || Math.abs(touchMoveDir.z) > 0.2;
          if (manualMove || autoWalkToRef.current) focus.cancel();
        }
        focusOwns = focus.update(dt);
      }

      // ── Smooth look interpolation ──
      // Framerate-independent: 1-exp(-k*dt) with k=-ln(1-f)*60 preserves the old
      // per-frame factors (f=.08 look, f=.1 pos) exactly at 60fps (dt clamped above).
      const kLook = 1 - Math.exp(-5.0029 * dt), kPos = 1 - Math.exp(-6.3216 * dt);
      lookA.current.yaw += (lookT.current.yaw - lookA.current.yaw) * kLook;
      lookA.current.pitch += (lookT.current.pitch - lookA.current.pitch) * kLook;

      // ── Auto-walk toward target door ──
      const awTarget = autoWalkToRef.current;
      if (awTarget && !focusOwns) {
        const doorIdx = doorDefs.findIndex(d => d.id === awTarget);
        if (doorIdx >= 0) {
          const doorAngle = (doorIdx / NUM_DOORS) * Math.PI * 2 - Math.PI / 2;
          const approachR = RADIUS - 4;
          const targetX = Math.cos(doorAngle) * approachR;
          const targetZ = Math.sin(doorAngle) * approachR;
          const dx = targetX - posT.current.x;
          const dz = targetZ - posT.current.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist > 0.8) {
            // WS12-5 (w1_hall): comfort-capped — legacy ran 5.0 m/s
            // ITEM 2: easeInOutCubic deceleration into arrival (awClick-integrator
            // parity) — the constant speed hard-stopped at the 0.8m gate.
            const speed = (W1 ? Math.max(0.5, MAX_WALK_SPEED * easeInOutCubic(Math.min(1, dist / 2.5))) : 5.0) * dt;
            posT.current.x += (dx / dist) * speed;
            posT.current.z += (dz / dist) * speed;
            // Face the door using atan2 (look toward target position)
            const faceDoorAngle = Math.atan2(targetX - posT.current.x, -(targetZ - posT.current.z));
            // ITEM 2: framerate-independent (was a raw per-frame .06 factor)
            lookT.current.yaw += (faceDoorAngle - lookT.current.yaw) * (1 - Math.exp(-3.7123 * dt)); // f=.06 @60fps
          } else {
            autoWalkToRef.current = null;
            onDoorClickRef.current(awTarget);
          }
        }
      }

      // ── Tap-is-travel walk-then-enter (WS8-4, w1_hall): consume awClick ──
      if (W1 && awClick.id && !awTarget && !focusOwns) {
        const dxC = awClick.x - posT.current.x;
        const dzC = awClick.z - posT.current.z;
        const distC = Math.sqrt(dxC * dxC + dzC * dzC);
        if (distC > 0.8) {
          const stepC = Math.min(MAX_WALK_SPEED * dt, distC);
          posT.current.x += (dxC / distC) * stepC;
          posT.current.z += (dzC / distC) * stepC;
          const faceC = Math.atan2(awClick.x - posT.current.x, -(awClick.z - posT.current.z));
          let dyaw = faceC - lookT.current.yaw;
          dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
          const maxYaw = (MAX_YAW_DEG_S * Math.PI / 180) * dt;
          lookT.current.yaw += Math.max(-maxYaw, Math.min(maxYaw, dyaw));
        } else {
          const idC = awClick.id;
          awClick.id = null;
          onDoorClickRef.current(idC);
        }
      }

      // ── Movement (WASD / Arrow keys; w1_hall adds the direct analog touch vector) ──
      if (!awTarget && !focusOwns) {
      // Owner 2026-08-06: sprint restored as an explicit Shift modifier
      // (comfort-capped SPRINT_SPEED, not the legacy 12 m/s)
      const spd = (W1 ? (keys.current["shift"] ? SPRINT_SPEED : MAX_WALK_SPEED) : (keys.current["shift"] ? 12.0 : 4.0)) * dt;
      _dir.current.set(0, 0, 0);
      const k = keys.current;
      if (k["w"] || k["arrowup"]) _dir.current.z -= 1;
      if (k["s"] || k["arrowdown"]) _dir.current.z += 1;
      if (k["a"] || k["arrowleft"]) _dir.current.x -= 1;
      if (k["d"] || k["arrowright"]) _dir.current.x += 1;
      // WS8-2 (w1_hall): direct joystick vector — no 16ms synthetic-WASD poll
      if (W1) { _dir.current.x += touchMoveDir.x; _dir.current.z += touchMoveDir.z; }
      if (_dir.current.length() > (W1 ? 0.15 : 0)) {
        if (awClick.id) awClick.id = null; // manual input cancels tap-travel
        const mag = W1 ? Math.min(1, _dir.current.length()) : 1;
        _dir.current.normalize().multiplyScalar(spd * mag);
        _dir.current.applyAxisAngle(_yAxis.current, -lookA.current.yaw);
        posT.current.add(_dir.current);
      }
      }

      // ── Collision detection ──
      // Wall: stay within circular room
      const distFromCenter = Math.sqrt(posT.current.x ** 2 + posT.current.z ** 2);
      if (distFromCenter > RADIUS - 1.2) {
        const ang = Math.atan2(posT.current.z, posT.current.x);
        posT.current.x = Math.cos(ang) * (RADIUS - 1.2);
        posT.current.z = Math.sin(ang) * (RADIUS - 1.2);
      }
      // Columns
      for (const col of colPositions) {
        const dx2 = posT.current.x - col.x;
        const dz2 = posT.current.z - col.z;
        const dist = Math.sqrt(dx2 * dx2 + dz2 * dz2);
        if (dist < col.r) {
          const pushAng = Math.atan2(dz2, dx2);
          posT.current.x = col.x + Math.cos(pushAng) * col.r;
          posT.current.z = col.z + Math.sin(pushAng) * col.r;
        }
      }
      // Keep at eye level (shared EYE_HEIGHT constant)
      posT.current.y = EYE_HEIGHT;

      // Smooth position interpolation
      pos.current.lerp(posT.current, kPos);
      // WS10-4 (w1_hall): marble footsteps while actually moving — per-frame
      // position delta above ~0.5 m/s equivalent; cadence capped in playFootstep.
      if (W1) {
        const sdx = pos.current.x - w1StepPrev.x, sdz = pos.current.z - w1StepPrev.z;
        if (dt > 0 && sdx * sdx + sdz * sdz > (0.5 * dt) * (0.5 * dt)) playFootstep();
        w1StepPrev.x = pos.current.x; w1StepPrev.z = pos.current.z;
      }
      camera.position.copy(pos.current);

      // Look direction
      _ld.current.set(
        Math.sin(lookA.current.yaw) * Math.cos(lookA.current.pitch),
        Math.sin(lookA.current.pitch),
        -Math.cos(lookA.current.yaw) * Math.cos(lookA.current.pitch)
      );
      _lookTarget.current.copy(camera.position).add(_ld.current);
      camera.lookAt(_lookTarget.current);

      // ── Camera debug overlay ──
      if (camDebugRef.current) {
        camDebugRef.current.textContent = `yaw: ${lookA.current.yaw.toFixed(4)}\npitch: ${lookA.current.pitch.toFixed(4)}\npos: ${pos.current.x.toFixed(1)}, ${pos.current.y.toFixed(1)}, ${pos.current.z.toFixed(1)}`;
      }

      // ── Hover raycast — coalesced to at most one per rendered frame ──
      if (_hoverDirty) {
        _hoverDirty = false;
        _mouse.current.set(
          ((_hoverPt.x - _elRect.left) / _elRect.width) * 2 - 1,
          -((_hoverPt.y - _elRect.top) / _elRect.height) * 2 + 1
        );
        _rc.current.setFromCamera(_mouse.current, camera);
        let found: string | null = null;
        let portalHov = false;
        let inlayHov = false;
        let bustHov: number | null = null;
        // WS8-4 (w1_hall): doors/portal respond at ANY distance — the 15m
        // dead-click gate only survives on the legacy path.
        doorMeshes.forEach(d => {
          const hits = _rc.current.intersectObject(d.mesh);
          if (hits.length > 0 && (W1 || hits[0].distance < 15)) found = d.wingId;
        });
        const pHits = _rc.current.intersectObject(portalHit);
        if (pHits.length > 0 && (W1 || pHits[0].distance < 15)) portalHov = true;
        // Check inlay clicks
        inlayMeshes.forEach(im => {
          const hits = _rc.current.intersectObject(im);
          if (hits.length > 0 && hits[0].distance < 15) inlayHov = true;
        });
        // Check bust clicks
        bustMeshes.forEach(bm => {
          const hits = _rc.current.intersectObject(bm);
          if (hits.length > 0 && hits[0].distance < 15) bustHov = bm.userData.pedestalIndex;
        });
        // W2 (WS7-10): Ancestral Wall pieces respond at ANY distance (tap-is-
        // travel dogma — no distance gate on artworks).
        let awHov: FocusTarget | null = null;
        if (awHitMeshes.length > 0) {
          const aHits = _rc.current.intersectObjects(awHitMeshes, false);
          if (aHits.length > 0) awHov = (aHits[0].object.userData.awTarget as FocusTarget) || null;
        }
        hovAWTarget = awHov;
        hoveredWing = found;
        hovMem.current = found || (portalHov ? "__exterior__" : (inlayHov ? "__inlay__" : (bustHov !== null ? `__bust_${bustHov}__` : null)));
        const newCursor = (found || portalHov || inlayHov || bustHov !== null || awHov) ? "pointer" : "grab";
        if (newCursor !== _lastCursor) { _lastCursor = newCursor; el.style.cursor = newCursor; }
      }

      // ── Distance-based door glow (strong baseline) ──
      // W3H (audit P0, critic §1): this per-frame loop overrode every door's
      // material with its wing-ACCENT emissive at ≥0.25 — the wood tints
      // shipped this wave were instantly repainted (the glowing BLUE door).
      // Under W3H the static warm-wood emissive stands, and hover feedback is
      // the EMBER outline plane (WS4-4 contract, finally wired below).
      if (!W3H) doorMeshes.forEach(d => {
        // Skip normal glow for walkthrough-highlighted door
        if(hlTarget===d.wingId)return;
        const wing = WINGS.find(ww => ww.id === d.wingId);
        const accent = wing?.accent || "#C8A858";
        const doorAngle = d.angle;
        const doorX = Math.cos(doorAngle) * (RADIUS - 0.4);
        const doorZ = Math.sin(doorAngle) * (RADIUS - 0.4);
        const distToDoor = Math.sqrt(
          (pos.current.x - doorX) ** 2 + (pos.current.z - doorZ) ** 2
        );
        const isHover = hoveredWing === d.wingId;
        const baseGlow = 0.25;
        const proximityGlow = Math.max(0, 1 - distToDoor / 10) * 0.35;
        const hoverGlow = isHover ? 0.35 + Math.sin(t * 3) * 0.12 : 0;
        d.mat.emissive.set(accent);
        d.mat.emissiveIntensity = Math.max(baseGlow, proximityGlow, hoverGlow);
      });
      if (W3H && w1HoverPlane) {
        const hd = hoveredWing ? doorMeshes.find(dd => dd.wingId === hoveredWing) : null;
        if (hd) {
          const hx = Math.cos(hd.angle) * (RADIUS - 0.75);
          const hz = Math.sin(hd.angle) * (RADIUS - 0.75);
          w1HoverPlane.position.set(hx, DOOR_H / 2, hz);
          w1HoverPlane.lookAt(0, DOOR_H / 2, 0);
          w1HoverPlane.visible = true;
          (w1HoverPlane.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(t * 3) * 0.05;
        } else {
          w1HoverPlane.visible = false;
        }
      }

      // Portal pulse
      portalGlow.material.opacity = 0.03 + Math.sin(t * 2) * 0.015;
      if(portalLight)portalLight.intensity = 0.35 + Math.sin(t * 1.5) * 0.1;

      // Animate particles — throttle to every 2nd frame on mobile for performance
      const _doParticles = !_isMobile || (_frameCount & 1) === 0;
      if (_doParticles) {
        // Dust float (upward drift, stronger in beam area) — legacy duplicate
        // system, only mounted when w1_hall is off
        if (dustGeo) {
          const dp = dustGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < dustN; i++) {
            const px = dp[i * 3], pz = dp[i * 3 + 2];
            const distFromCenter = Math.sqrt(px * px + pz * pz);
            const inBeamArea = distFromCenter < OCULUS_R * 2;
            const upDrift = inBeamArea ? 0.0025 : 0.0006;
            dp[i * 3] += Math.sin(t * 0.15 + i * 0.7) * 0.002;
            dp[i * 3 + 1] += Math.sin(t * 0.2 + i * 0.5) * 0.001 + upDrift;
            dp[i * 3 + 2] += Math.cos(t * 0.15 + i * 0.3) * 0.002;
            if (dp[i * 3 + 1] > TOTAL_H - 1) dp[i * 3 + 1] = 1;
          }
          dustGeo.attributes.position.needsUpdate = true;
        }
        dust.update(t, dt);
      }

      // Light beam breathing (legacy duplicate cone, only mounted when w1_hall is off)
      if (beamMesh) (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(t * 0.5) * 0.02;
      oculusBeam.update(t);

      // ── W2 (WS4-8/9): living light — slow UV drift on the water normal map,
      // counter-drifting caustic layers, and a lazy rotation of the oculus
      // pool decal. Desktop only (w2Anim); mobile keeps the static variant.
      if (w2Anim) {
        if (w2WaterNormal) { w2WaterNormal.offset.set(t * 0.02, t * 0.011); }
        if (w2CausticA) { w2CausticA.offset.set(t * 0.013, t * 0.009); }
        if (w2CausticB) { w2CausticB.offset.set(-t * 0.01, -t * 0.007); }
        if (w2PoolTex) { w2PoolTex.rotation = t * 0.015; }
      }

      // Skip GPU render when tab is hidden (saves CPU/GPU on mobile) — but
      // the first frame of every build always presents (see _presented above).
      if (document.hidden && _presented) return;
      composer.render();
      if (!_presented) { _presented = true; console.log("[hall] first frame at", Math.round(performance.now() - _mountStart), "ms"); }
      if (!readyFiredRef.current) fireRevealWhenAssembled();
    };
    // ASSEMBLE-BEFORE-REVEAL: onReady (the overlay/veil-lift contract) fires
    // only when the first frame has rendered AND the reveal barrier is done —
    // GLBs/lunettes/eager textures settled (see revealGates) or the 8s cap.
    // The first-frame _presented guarantee above is untouched, and so is the
    // hidden→shown onReady re-fire (readyFiredRef is already true by then).
    // Nothing about the loads themselves is serialized or delayed.
    if (paintGateTexes.length) {
      revealGates.push(new Promise<void>((resolve) => {
        let _tries = 0;
        const check = () => {
          if (_tries++ > 60 || paintGateTexes.every((tx) => tx.userData.naturalWidth !== undefined)) resolve();
          else setTimeout(check, 150);
        };
        check();
      }));
    }
    const fireRevealWhenAssembled = () => {
      if (readyFiredRef.current || !_presented || !revealBarrierDone) return;
      readyFiredRef.current = true;
      try { onReadyRef.current?.(); } catch {}
      console.log("[hall] reveal (assembled) at", Math.round(performance.now() - _mountStart), "ms");
    };
    if (readyFiredRef.current) {
      // Effect re-run on an already-revealed mount (persistent hall rebuild):
      // the barrier is moot — never park a rebuild behind it.
      revealBarrierDone = true;
    } else {
      const REVEAL_CAP_MS = 8000; // slow networks: reveal what's there (MemoryPalace WS9-7 watchdog parity)
      Promise.race([
        Promise.allSettled(revealGates),
        new Promise((res) => setTimeout(res, REVEAL_CAP_MS)),
      ]).then(() => { if (!alive) return; revealBarrierDone = true; fireRevealWhenAssembled(); });
    }
    const _mountStart = performance.now();
    animate();

    // ── MOUSE CONTROLS (first-person look + click) ──
    const onDown = (e: MouseEvent) => {
      drag.current = false;
      prev.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      const dx2 = e.clientX - prev.current.x;
      const dy2 = e.clientY - prev.current.y;
      if (Math.abs(dx2) > 2 || Math.abs(dy2) > 2) drag.current = true;
      if (e.buttons === 1) {
        // Drag-look: apply the look math and skip hover raycasting (cursor is grabbed)
        // W2 (WS7-10): manual look input cancels focus mode (input contract).
        if (drag.current && focus && focus.state() !== "idle") focus.cancel();
        lookT.current.yaw -= dx2 * 0.003;
        lookT.current.pitch = Math.max(-0.6, Math.min(0.6, lookT.current.pitch + dy2 * 0.003));
        prev.current = { x: e.clientX, y: e.clientY };
        return;
      }
      // 3px movement guard (same as CorridorScene) — skip micro-movements
      const rdx = e.clientX - _lastRayPos.x, rdy = e.clientY - _lastRayPos.y;
      if (rdx * rdx + rdy * rdy < 9) return;
      _lastRayPos.x = e.clientX;
      _lastRayPos.y = e.clientY;
      // Record the position — the raycast itself runs once per frame in animate()
      _hoverPt.x = e.clientX;
      _hoverPt.y = e.clientY;
      _hoverDirty = true;
    };
    const onClick = () => {
      if (drag.current) return;
      // W2 (WS7-10): Ancestral Wall taps drive the focus state machine — tap →
      // dolly-to-frame, second tap on the same piece → open the memory, tap on
      // empty space while focused → exit. Tapping a door while focused releases
      // the camera first, then travels (one authority, no fighting).
      if (focus) {
        if (hovAWTarget) { focus.handleTap(hovAWTarget); return; }
        if (focus.state() !== "idle") {
          if (!hovMem.current) { focus.handleTap(null); return; }
          focus.cancel();
        }
      }
      if (hovMem.current) {
        if (hovMem.current === "__inlay__") onInlayClick?.();
        else if (hovMem.current.startsWith("__bust_")) onBustClick?.(parseInt(hovMem.current.replace("__bust_","").replace("__","")));
        // WS8-4 (w1_hall): doors + exit portal walk-then-enter from any distance
        else if (W1) startAutoWalk(hovMem.current);
        else if (hovMem.current === "__exterior__") onDoorClickRef.current("__exterior__");
        else onDoorClickRef.current(hovMem.current);
      }
    };
    const onKD = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
      // W2 (WS7-10): Escape exits focus mode (movement keys cancel in animate()).
      if (e.key === "Escape" && focus && focus.state() !== "idle") focus.cancel();
    };
    const onKU = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClick);
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);

    // ── TOUCH SUPPORT (first-person: left side = move, right side = look) ──
    let touchTap = true;
    let touchLookId: number | null = null;
    let touchMoveId: number | null = null;
    // (touchMoveDir is hoisted above animate() — see the w1_hall movement block)
    const onTS = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        const rect = el.getBoundingClientRect();
        const rx = (tch.clientX - rect.left) / rect.width;
        const ry = (tch.clientY - rect.top) / rect.height;
        if (rx < 0.25 && ry > 0.75 && touchMoveId === null && !document.querySelector('[data-mp-joystick]')) {
          touchMoveId = tch.identifier;
          touchMoveDir.x = 0;
          touchMoveDir.z = 0;
          prev.current = { x: tch.clientX, y: tch.clientY };
        } else if (touchLookId === null) {
          touchLookId = tch.identifier;
          drag.current = false;
          prev.current = { x: tch.clientX, y: tch.clientY };
          touchTap = true;
        }
      }
    };
    const onTM = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        if (tch.identifier === touchMoveId) {
          const rect = el.getBoundingClientRect();
          const dx2 = tch.clientX - prev.current.x;
          const dy2 = tch.clientY - prev.current.y;
          const maxR = rect.width * 0.12;
          touchMoveDir.x = Math.max(-1, Math.min(1, dx2 / maxR));
          touchMoveDir.z = Math.max(-1, Math.min(1, dy2 / maxR));
        } else if (tch.identifier === touchLookId) {
          const dx2 = tch.clientX - prev.current.x;
          const dy2 = tch.clientY - prev.current.y;
          if (Math.abs(dx2) > 2 || Math.abs(dy2) > 2) { drag.current = true; touchTap = false; }
          // W2 (WS7-10): manual touch-look cancels focus mode (input contract).
          if (drag.current && focus && focus.state() !== "idle") focus.cancel();
          lookT.current.yaw -= dx2 * 0.003;
          lookT.current.pitch = Math.max(-0.6, Math.min(0.6, lookT.current.pitch + dy2 * 0.003));
          prev.current = { x: tch.clientX, y: tch.clientY };
        }
      }
    };
    const onTE = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        if (tch.identifier === touchMoveId) {
          touchMoveId = null;
          touchMoveDir.x = 0;
          touchMoveDir.z = 0;
        }
        if (tch.identifier === touchLookId) {
          if (touchTap) {
            const rect = el.getBoundingClientRect();
            _mouse.current.set(
              ((tch.clientX - rect.left) / rect.width) * 2 - 1,
              -((tch.clientY - rect.top) / rect.height) * 2 + 1
            );
            _rc.current.setFromCamera(_mouse.current, camera);
            // W2 (WS7-10): Ancestral Wall taps route through the focus state
            // machine, any distance (tap → dolly, second tap → open).
            let awTapped = false;
            if (focus && awHitMeshes.length > 0) {
              const aHits = _rc.current.intersectObjects(awHitMeshes, false);
              if (aHits.length > 0) {
                focus.handleTap((aHits[0].object.userData.awTarget as FocusTarget) || null);
                awTapped = true;
              }
            }
            let found: string | null = null;
            if (!awTapped) {
              doorMeshes.forEach(d => {
                const hits = _rc.current.intersectObject(d.mesh);
                if (hits.length > 0 && (W1 || hits[0].distance < 15)) found = d.wingId;
              });
            }
            if (found) {
              // Tapping a door while focused releases the camera, then travels.
              if (focus && focus.state() !== "idle") focus.cancel();
              // WS8-4 (w1_hall): walk-then-enter from any distance
              if (W1) startAutoWalk(found); else onDoorClickRef.current(found);
            } else if (!awTapped) {
              const pHits = _rc.current.intersectObject(portalHit);
              if (pHits.length > 0 && (W1 || pHits[0].distance < 15)) {
                if (focus && focus.state() !== "idle") focus.cancel();
                if (W1) startAutoWalk("__exterior__"); else onDoorClickRef.current("__exterior__");
              } else if (focus && focus.state() !== "idle") {
                // Tap on empty space while focused → exit focus (undim).
                focus.handleTap(null);
              }
            }
          }
          touchLookId = null;
        }
      }
    };
    // Touch-to-keys polling (for joystick integration from MobileJoystick)
    const touchKeys = () => {
      if (touchMoveId !== null) {
        const k = keys.current;
        k.w = touchMoveDir.z < -0.2;
        k.s = touchMoveDir.z > 0.2;
        k.a = touchMoveDir.x < -0.2;
        k.d = touchMoveDir.x > 0.2;
      }
    };
    // WS8-2 (w1_hall): no synthetic-WASD polling — animate() reads touchMoveDir directly
    const touchTick = W1 ? null : setInterval(touchKeys, 16);
    el.addEventListener("touchstart", onTS, { passive: true });
    el.addEventListener("touchmove", onTM, { passive: false });
    el.addEventListener("touchend", onTE, { passive: true });

    // ── AUDIO (WS10-1/2) — the ONE ambient singleton replaces the legacy
    // per-scene /audio/entrance-ambient.mp3 loop (which 404'd anyway).
    // Idempotent, gesture-armed on autoplay denial, and deliberately NOT
    // stopped on unmount/hide: the score carries across scene transitions.
    mountAmbientMusic();

    return () => {
      alive = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKD);
      window.removeEventListener("keyup", onKU);
      disposeFit();
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      el.removeEventListener("touchend", onTE);
      if (touchTick !== null) clearInterval(touchTick);
      window.removeEventListener("resize", _refreshRect);
      _rectRO?.disconnect();
      // WS10-2: no audio teardown — the shared ambient score keeps playing
      // across scene transitions (singleton owns the element, not this scene).
      // ── W2 teardown FIRST (WS4-6/WS7-10): dispose() detaches the salon-hang
      // group, so the module-shared makeArtwork frame/liner/glow materials never
      // enter the scene-wide dispose traversal below (they live for the app's
      // lifetime). Photo textures are scene-owned (paintTex) → disposed here,
      // per the salonHang texture-ownership contract.
      if (focusFadeTimer !== null) { window.clearTimeout(focusFadeTimer); focusFadeTimer = null; }
      focus?.dispose();
      if (awMountHandle) awMountHandle.dispose();
      awTextures.forEach(tx => tx.dispose());
      lunetteTextures.forEach(tx => tx.dispose());
      awOwnedGeos.forEach(g => g.dispose());
      awHitMat?.dispose();
      if (envRT) { envRT.texture.dispose(); envRT.dispose(); }
      else releaseEnvMap(envFromScene); // cached fromScene bake — stays warm for the next mount
      const _cachedSet=buildCachedTextureSet();
      const _cachedMats=buildCachedMaterialSet();
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m: any) => {
            if (_cachedMats.has(m)) return; // archetype material — programs stay warm
            if (m.map && !_cachedSet.has(m.map)) m.map.dispose();
            if (m.normalMap && !_cachedSet.has(m.normalMap)) m.normalMap.dispose();
            if (m.roughnessMap && !_cachedSet.has(m.roughnessMap)) m.roughnessMap.dispose();
            if (m.emissiveMap && !_cachedSet.has(m.emissiveMap)) m.emissiveMap.dispose();
            m.dispose();
          });
        }
      });
      releaseMaterialSet(msKey);
      dust.dispose();
      oculusBeam.dispose();
      allTexSets.forEach(disposePBRSet);
      releaseEnvMap(envMapProc);
      if(envMapHDRI){releaseEnvMap(envMapHDRI);envMapHDRI=null;}
      composer.dispose();
      if (el.contains(ren.domElement)) el.removeChild(ren.domElement);
      // Persistent hall owns its renderer — dispose it; transient scenes return
      // theirs to the shared pool for reuse.
      if (_ownRenderer) { try { ren.forceContextLoss(); } catch {} ren.dispose(); }
      else returnRenderer(ren);
      scene.environment=null;scene.background=null;scene.fog=null;
    };
  // Content fingerprint instead of raw wingsProp — the array gets a fresh
  // identity on many parent re-renders; rebuilding the whole hall for that
  // caused multi-hundred-ms stalls + camera teleports. Unlock/rename/shared-door
  // changes still rebuild (they're part of the fingerprint).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wingsFingerprint]);

  const skipCinematic = () => {
    entranceCinematicRef.current = false;
    setCinematicActive(false);
    blinkRef.current = 0;
    pushBlink(0); // shared write path — keeps the throttle shadow in sync
    setCreamFade(0); // reduced-motion path: never leave the cream veil up either
    if (onboardingModeRef.current) {
      onboardingModeRef.current = false;
      onDoorClickRef.current("roots");
    }
  };

  return (
    <div role="application" aria-label={t("sceneLabel")} style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {/* Blink overlay — black curtain for eye-blink effect */}
      {blinkOpacity > 0.01 && <div style={{ position: "absolute", inset: 0, background: "#000", opacity: blinkOpacity, pointerEvents: "none", zIndex: 20, transition: "opacity 0.03s linear" }} />}
      {/* Cream veil (WS12-2 / WS7-10 reduced motion) — warm crossfade, never black */}
      {creamFade > 0.01 && <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: PLASTER, opacity: creamFade, pointerEvents: "none", zIndex: 21, transition: "opacity 0.05s linear" }} />}
      {/* ── ONBOARDING ELEVATION §10 — look-around prompt overlay (UI ONLY;
          camera choreography untouched). Reachable only under onboardingMode
          (today: the /flythrough viewer's `hall` phase). ── */}
      {cinematicActive && (
        <>
          {/* Local keyframes — `onb-*` live only inside OnboardingWizard's
              <style>; without this scoped copy the declarations silently no-op. */}
          <style dangerouslySetInnerHTML={{ __html: `
@keyframes ehc-slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes ehc-titleReveal{0%{opacity:0;letter-spacing:0.6em;transform:scale(0.92)}60%{opacity:1;letter-spacing:0.12em}100%{opacity:1;letter-spacing:0.04em;transform:scale(1)}}
@keyframes ehc-fadeIn{from{opacity:0}to{opacity:1}}
.ehc-skip:focus-visible{outline:2px solid #F2EDE7;outline-offset:0.125rem}
` }} />
          {/* One-shot SR announcement — the visual choreography is silent. */}
          <div role="status" aria-live="polite" style={{ position: "absolute", width: "1px", height: "1px", margin: "-1px", padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
            {(() => { const v = t("cinematicIntroA11y"); return v === "cinematicIntroA11y" ? "A short introduction is playing. Use the Skip intro button to go straight to the Roots Wing." : v; })()}
          </div>
          {/* Bottom shadow gradient for text readability over 3D scene */}
          <div aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60vh", background: "linear-gradient(transparent 0%, rgba(26,25,23,0.35) 35%, rgba(26,25,23,0.75) 70%, rgba(26,25,23,0.88) 100%)", pointerEvents: "none", zIndex: 24 }} />
          <div style={{
            position: "absolute",
            // rem + env, never %-of-viewport (R9 — Android URL-bar collapse).
            bottom: shortCinematicUi
              ? "calc(0.75rem + env(safe-area-inset-bottom, 0px))"
              : narrowCinematicUi
                ? "calc(2rem + env(safe-area-inset-bottom, 0px))"
                : "calc(3rem + env(safe-area-inset-bottom, 0px))",
            left: 0, right: 0,
            display: "flex", flexDirection: "column", alignItems: "center",
            pointerEvents: "none", zIndex: 25,
            // Reduced motion: ONE static fade for the whole stack, one paint.
            animation: reduceMotionUi ? "ehc-fadeIn 0.2s linear both" : undefined,
          }}>
            {/* Decorative divider — EMBER, not terracotta (canon). Hidden on
                short viewports (landscape phones) to keep the impluvium sightline. */}
            {!shortCinematicUi && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                marginBottom: "0.625rem",
                animation: reduceMotionUi ? undefined : "ehc-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
              }}>
                <span style={{ width: "3rem", height: "0.0625rem", background: `${EMBER}80` }} />
                <span style={{ width: "0.3rem", height: "0.3rem", borderRadius: "50%", background: EMBER, opacity: 0.6 }} />
                <span style={{ width: "3rem", height: "0.0625rem", background: `${EMBER}80` }} />
              </div>
            )}
            {/* Kicker — canon Eyebrow grammar (body font 0.6875rem/700/0.14em),
                matching OnboardingWalkCaption/landing. */}
            {!shortCinematicUi && (
              <p style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                color: EMBER, letterSpacing: "0.14em", textTransform: "uppercase",
                margin: "0 0 0.625rem",
                textShadow: "0 0.125rem 0.5rem rgba(26,25,23,0.7)",
                animation: reduceMotionUi ? undefined : "ehc-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both",
              }}>
                {t("welcomeLabel")}
              </p>
            )}
            {/* Title — canon walk-caption treatment: Fraunces 500, flat cream
                #FCFAF5, no gold-sheen (gold stays licensed to the celebration). */}
            <h1 style={{
              fontFamily: T.font.display,
              fontSize: shortCinematicUi ? "1.5rem" : "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 500, color: "#FCFAF5",
              lineHeight: 1.08, margin: 0,
              // 0.04em mirrors WalkCinematicCaption (and the titleReveal
              // keyframe's resting state) exactly — one hand across all legs.
              letterSpacing: "0.04em",
              filter: "drop-shadow(0 0.125rem 0.5rem rgba(26,25,23,0.6))",
              ...(reduceMotionUi ? {} : {
                animation: "ehc-titleReveal 2s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both",
              }),
            }}>
              {t("title")}
            </h1>
            {/* Subtitle — hidden on short viewports */}
            {!shortCinematicUi && (
              <p style={{
                fontFamily: T.font.body, fontSize: "0.9375rem",
                color: "#D4CBC0", margin: "0.75rem 0 0",
                lineHeight: 1.5, maxWidth: "26rem", textAlign: "center",
                paddingInline: narrowCinematicUi ? "1.5rem" : 0,
                // Warm-ink shadow (canon, mirrors WalkCinematicCaption) — never cold black.
                textShadow: "0 0.125rem 0.75rem rgba(26,25,23,0.9), 0 0.0625rem 0.1875rem rgba(26,25,23,0.7)",
                animation: reduceMotionUi ? undefined : "ehc-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.5s both",
              }}>
                {t("subtitle")}
              </p>
            )}
          </div>
          {/* Skip intro button — top right, safe-area aware, dark linen glass */}
          <button
            className="ehc-skip"
            onClick={skipCinematic}
            aria-label={t("skipIntro")}
            style={{
              position: "absolute",
              top: "calc(1.5rem + env(safe-area-inset-top, 0px))",
              right: "calc(1.5rem + env(safe-area-inset-right, 0px))",
              zIndex: 30,
              fontFamily: T.font.body, fontSize: "0.8125rem",
              color: "rgba(255,255,255,0.9)", background: "rgba(26,25,23,0.45)",
              border: "1px solid rgba(242,237,231,0.22)",
              borderRadius: "0.375rem", padding: "0.5rem 0.875rem",
              cursor: "pointer",
              backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)",
              minHeight: "2.75rem",
              minWidth: "2.75rem",
              pointerEvents: "auto",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {t("skipIntro")}
          </button>
        </>
      )}
      {camDebug && createPortal(<pre ref={camDebugRef} onClick={() => { if (camDebugRef.current) navigator.clipboard.writeText(camDebugRef.current.textContent || ""); }} style={{ position: "fixed", bottom: "6rem", left: "1rem", zIndex: 99999, background: "rgba(0,0,0,0.85)", color: "#0f0", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontFamily: "monospace", fontSize: "0.8125rem", cursor: "pointer", border: "1px solid #0f03", lineHeight: 1.6, userSelect: "all" as const }} />, document.body)}
    </div>
  );
}

export default memo(EntranceHallScene);
