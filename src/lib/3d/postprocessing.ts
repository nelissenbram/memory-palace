import * as THREE from "three";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  SMAAEffect,
  SSAOEffect,
  NormalPass,
  DepthOfFieldEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from "postprocessing";
import { getQuality, getGPUTier } from "./mobilePerf";
import { EXPOSURE } from "./canon";

/**
 * Enhanced post-processing pipeline with SSAO.
 * Replaces the per-scene boilerplate with a single setup call.
 *
 * On mobile devices, expensive effects (SSAO, DOF, Bloom, SMAA) are
 * automatically disabled based on the quality tier from mobilePerf.ts.
 * Only a lightweight vignette pass is kept for visual polish.
 */

export interface PostProcessingConfig {
  bloom?: {
    luminanceThreshold?: number;
    luminanceSmoothing?: number;
    intensity?: number;
  } | false;
  vignette?: {
    darkness?: number;
    offset?: number;
  };
  ssao?: {
    intensity?: number;
    radius?: number;
    bias?: number;
    samples?: number;
  } | false;
  dof?: {
    focusDistance?: number;
    focalLength?: number;
    bokehScale?: number;
  } | false;
  /** Set false to skip SMAA. Overridden by quality tier on mobile. */
  smaa?: boolean;
}

// MUSEO VIVO grade contract (WS1-4): bloom threshold 0.85 everywhere — only
// picture-lights and gold leaf may bloom — and vignette darkness 0.35.
const SCENE_PRESETS: Record<string, PostProcessingConfig> = {
  exterior: {
    bloom: { luminanceThreshold: 0.85, luminanceSmoothing: 0.4, intensity: 0.6 },
    vignette: { darkness: 0.35, offset: 0.25 },
    ssao: { intensity: 1.5, radius: 0.06, bias: 0.02, samples: 16 },
  },
  entrance: {
    bloom: { luminanceThreshold: 0.85, luminanceSmoothing: 0.4, intensity: 0.6 },
    vignette: { darkness: 0.35, offset: 0.25 },
    ssao: { intensity: 2.0, radius: 0.05, bias: 0.015, samples: 16 },
  },
  corridor: {
    bloom: { luminanceThreshold: 0.85, luminanceSmoothing: 0.4, intensity: 0.6 },
    vignette: { darkness: 0.35, offset: 0.25 },
    ssao: { intensity: 2.5, radius: 0.04, bias: 0.015, samples: 16 },
  },
  interior: {
    bloom: { luminanceThreshold: 0.85, luminanceSmoothing: 0.4, intensity: 0.6 },
    vignette: { darkness: 0.35, offset: 0.25 },
    ssao: { intensity: 2.0, radius: 0.05, bias: 0.015, samples: 16 },
  },
};

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  preset: string = "interior",
  overrides?: Partial<PostProcessingConfig>
): EffectComposer {
  const q = getQuality();
  const baseConfig = { ...SCENE_PRESETS[preset] || SCENE_PRESETS.interior, ...overrides };

  // Apply quality-tier overrides — on mobile, strip heavy effects
  const config: PostProcessingConfig = {
    ...baseConfig,
    ssao: q.ssao ? baseConfig.ssao : false,
    dof: q.dof ? baseConfig.dof : false,
    bloom: q.bloom ? baseConfig.bloom : false,
    smaa: baseConfig.smaa !== false ? q.smaa : false,
  };

  // HDR frame buffers for the golden grade — HalfFloat everywhere, with an
  // UnsignedByte fallback on the potato tier (WS1-1).
  const composer = new EffectComposer(renderer, {
    frameBufferType:
      getGPUTier() === "potato" ? THREE.UnsignedByteType : THREE.HalfFloatType,
  });

  // ONE GRADE (dogma 2): tone mapping happens exactly once, in the
  // ToneMappingEffect appended below. The renderer must NOT tone-map on top of
  // it (double-mapping); its toneMappingExposure still feeds the effect's
  // shader uniform, so the canon exposure is set here for every scene.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = EXPOSURE;

  // Render pass
  composer.addPass(new RenderPass(scene, camera));

  // Collect all effects for a single EffectPass
  const effects: any[] = [];

  // SSAO (requires NormalPass)
  if (config.ssao !== false && config.ssao) {
    const normalPass = new NormalPass(scene, camera);
    composer.addPass(normalPass);

    const ssao = new SSAOEffect(camera, normalPass.texture, {
      intensity: config.ssao.intensity ?? 2.0,
      radius: config.ssao.radius ?? 0.05,
      bias: config.ssao.bias ?? 0.015,
      samples: config.ssao.samples ?? 16,
      worldDistanceThreshold: 20,
      worldDistanceFalloff: 5,
      worldProximityThreshold: 0.4,
      worldProximityFalloff: 0.1,
    });
    effects.push(ssao);
  }

  // Bloom
  if (config.bloom) {
    effects.push(
      new BloomEffect({
        luminanceThreshold: config.bloom.luminanceThreshold ?? 0.4,
        luminanceSmoothing: config.bloom.luminanceSmoothing ?? 0.4,
        intensity: config.bloom.intensity ?? 1.0,
        mipmapBlur: true,
      })
    );
  }

  // DOF
  if (config.dof) {
    effects.push(
      new DepthOfFieldEffect(camera, {
        focusDistance: config.dof.focusDistance ?? 0.02,
        focalLength: config.dof.focalLength ?? 0.05,
        bokehScale: config.dof.bokehScale ?? 2.0,
      })
    );
  }

  // Vignette (kept on all devices — very cheap, adds visual polish)
  if (config.vignette) {
    effects.push(
      new VignetteEffect({
        darkness: config.vignette.darkness ?? 0.5,
        offset: config.vignette.offset ?? 0.25,
      })
    );
  }

  // SMAA (skipped on mobile to save a full-screen pass)
  if (config.smaa !== false) {
    effects.push(new SMAAEffect());
  }

  // NEUTRAL tone mapping at the canon exposure — appended LAST so everything
  // upstream works in scene-linear HDR (HalfFloat buffers above). Runs on
  // every tier; the renderer stays at NoToneMapping (set above).
  effects.push(new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }));

  if (effects.length > 0) {
    composer.addPass(new EffectPass(camera, ...effects));
  }

  return composer;
}
