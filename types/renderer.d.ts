declare module "bokken/renderer" {
    /**
     * Built-in pipeline stage kinds accepted by `pipeline.addStage()`.
     *
     *   "sprite"      — Scene stage. Clears and flushes the SpriteBatcher.
     *                    Writes albedo + normal + emissive to deferred targets
     *                    when followed by a lighting pass.
     *   "shadow"    — Rasterises shadow-caster outlines into the per-light
     *                    1D shadow atlas. Install BEFORE the "lighting"
     *                    stage and AFTER "sprite".
     *   "lighting"     — Accumulates Light2D contributions into a lit image.
     *                    Tiled forward+ culling, PCF shadows, cookie sampling.
     *   "bloom"        — Bright-pass + Gaussian blur + additive composite.
     *   "color-grade"  — Filmic tonemap + exposure + saturation + gamma.
     *   "distortion"   — Screen-space UV displacement (shockwaves, heat haze).
     *   "composite"    — Final passthrough to the default framebuffer.
     *
     * Typical install order (lighting + shadows):
     *   sprite → shadow → lighting → bloom → color-grade → composite
     */
    export type StageKind =
        | "sprite"
        | "shadow"
        | "lighting"
        | "bloom"
        | "color-grade"
        | "distortion"
        | "composite";

    /** Texture filtering mode. */
    export type TextureFilter = "linear" | "nearest";

    /** Properties for the "sprite" (scene) stage. */
    export interface SpriteStageProperties {
        enabled?: boolean;
        clearR?: number;
        clearG?: number;
        clearB?: number;
        clearA?: number;
    }

    /** Properties for the "shadow" stage. */
    export interface ShadowStageProperties {
        enabled?: boolean;
    }

    /**
     * Properties for the "lighting" stage.
     *
     * Ambient can be authored two ways:
     *
     *   - Packed: `ambient: 0xRRGGBBAA` — matches Mesh2D.color and
     *     Light2D.color, so a single conventional colour pattern works
     *     everywhere. The alpha byte is ignored. Limited to LDR
     *     [0, 1] per channel.
     *
     *   - Flat scalar: `ambientR/G/B` individually — required when
     *     HDR ambient (values > 1.0) is needed for overbright skies,
     *     cave glows, etc.
     *
     * When both are specified, the packed form is applied first and
     * the flat scalars override per-channel. So `{ ambient: 0x202030FF,
     * ambientR: 2.5 }` gives an HDR red on a dim cool baseline.
     */
    export interface LightingStageProperties {
        enabled?: boolean;
        /**
         * Global multiplier on every light's intensity. Useful for
         * "darken everything" cutscene fades or to tone-map the whole
         * lighting budget down without touching individual lights.
         * Default 1.0.
         */
        intensityScale?: number;
        /**
         * Wrap-around amount in [0, 1]. 0.0 = pure Lambertian N·L (very
         * contrasty on 2D sprites that lack authored normal maps —
         * flat sprites become invisible when no light faces them).
         * 0.5 = half-cosine wrap, the "atmospheric 2D" default favoured
         * by games like Children of Morta and Ori. 1.0 = omnidirectional,
         * only distance and cone shape the lighting falloff. Default 0.5.
         */
        wrapAmount?: number;
        /**
         * Packed 0xRRGGBBAA ambient colour. Matches Mesh2D.color and
         * Light2D.color. Alpha byte is ignored. For HDR ambient
         * (>1.0 per channel) use ambientR/G/B instead.
         */
        ambient?: number;
        /** Ambient term red channel. Default 0.05. Overrides the R byte of `ambient`. */
        ambientR?: number;
        /** Ambient term green channel. Default 0.05. Overrides the G byte of `ambient`. */
        ambientG?: number;
        /** Ambient term blue channel. Default 0.06. Overrides the B byte of `ambient`. */
        ambientB?: number;
    }

    /** Properties for the "bloom" stage. */
    export interface BloomStageProperties {
        enabled?: boolean;
        threshold?: number;
        intensity?: number;
        radius?: number;
    }

    /** Properties for the "color-grade" stage. */
    export interface ColorGradeStageProperties {
        enabled?: boolean;
        exposure?: number;
        saturation?: number;
        gamma?: number;
    }

    /** Properties for the "distortion" stage. */
    export interface DistortionStageProperties {
        enabled?: boolean;
        intensity?: number;
        heatHaze?: boolean;
        heatHazeSpeed?: number;
        heatHazeFrequency?: number;
        heatHazeAmplitude?: number;
    }

    /** Properties for the "composite" stage. */
    export interface CompositeStageProperties {
        enabled?: boolean;
    }

    export type StageProperties =
        | SpriteStageProperties
        | ShadowStageProperties
        | LightingStageProperties
        | BloomStageProperties
        | ColorGradeStageProperties
        | DistortionStageProperties
        | CompositeStageProperties;

    export interface ShockwaveParams {
        speed?: number;
        thickness?: number;
        amplitude?: number;
        maxRadius?: number;
    }

    export interface DefineGridParams {
        count?: number;
        offsetX?: number;
        offsetY?: number;
        paddingX?: number;
        paddingY?: number;
    }

    export interface Pipeline {
        /**
         * Add a built-in stage to the pipeline.
         *
         * @example
         * // Lighting + shadows pipeline.
         * Renderer.pipeline.addStage("sprite",    "scene");
         * Renderer.pipeline.addStage("shadow",    "shadow");
         * Renderer.pipeline.addStage("lighting",  "lighting", {
         *     ambient: 0x0B0B12FF,
         *     wrapAmount: 0.5,
         * });
         * Renderer.pipeline.addStage("bloom",     "bloom", { threshold: 0.7 });
         * Renderer.pipeline.addStage("composite", "composite");
         */
        addStage(kind: StageKind, name: string, props?: StageProperties): boolean;

        removeStage(name: string): boolean;
        moveStage(name: string, index: number): boolean;
        setEnabled(name: string, enabled: boolean): boolean;
        configure(name: string, props: StageProperties): boolean;
        list(): string[];
    }

    interface RendererModule {
        readonly pipeline: Pipeline;
        loadTexture(path: string, filter?: TextureFilter): boolean;
        defineRegion(name: string, texPath: string, x: number, y: number, w: number, h: number): boolean;
        defineGrid(prefix: string, texPath: string, frameW: number, frameH: number, params?: DefineGridParams): number;
        addShockwave(x: number, y: number, params?: ShockwaveParams): boolean;
        clearShockwaves(): void;
    }

    const Renderer: RendererModule;
    export default Renderer;
}