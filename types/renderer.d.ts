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
        /** Luma threshold above which pixels contribute to bloom. */
        threshold?: number;
        /** Bloom strength when composited back onto the scene. */
        intensity?: number;
        /** Blur kernel scale. Higher = wider glow. */
        radius?: number;
    }

    /** Properties for the "color-grade" stage. */
    export interface ColorGradeStageProperties {
        enabled?: boolean;
        /** Exposure multiplier applied before tonemapping. */
        exposure?: number;
        /** Saturation pivot around luminance. 1.0 = neutral. */
        saturation?: number;
        /** Display gamma. Lower = brighter midtones. 2.2 = sRGB. */
        gamma?: number;
    }

    /** Properties for the "distortion" stage. */
    export interface DistortionStageProperties {
        enabled?: boolean;
        /** Global displacement intensity multiplier. 0 disables entirely. */
        intensity?: number;
        /** Enable scrolling sinusoidal heat haze. */
        heatHaze?: boolean;
        /** Heat haze scroll speed in UV/sec. */
        heatHazeSpeed?: number;
        /** Heat haze wave count across the screen. */
        heatHazeFrequency?: number;
        /** Heat haze maximum UV offset per wave. */
        heatHazeAmplitude?: number;
    }

    /** Properties for the "composite" stage. */
    export interface CompositeStageProperties {
        enabled?: boolean;
    }

    /** Union of all stage property types for `pipeline.configure()`. */
    export type StageProperties =
        | SpriteStageProperties
        | ShadowStageProperties
        | LightingStageProperties
        | BloomStageProperties
        | ColorGradeStageProperties
        | DistortionStageProperties
        | CompositeStageProperties;

    /** Optional parameters for `addShockwave()`. */
    export interface ShockwaveParams {
        /** Expansion rate in UV/sec. Default 0.8. */
        speed?: number;
        /** Width of the distortion band. Default 0.1. */
        thickness?: number;
        /** Peak displacement strength. Default 0.06. */
        amplitude?: number;
        /** Auto-remove threshold. Default 1.5. */
        maxRadius?: number;
    }

    /** Optional parameters for `defineGrid()`. */
    export interface DefineGridParams {
        /** Total number of frames. 0 or omitted fills the sheet. */
        count?: number;
        /** Pixel X offset from the left edge. */
        offsetX?: number;
        /** Pixel Y offset from the top edge. */
        offsetY?: number;
        /** Horizontal gap between frames. */
        paddingX?: number;
        /** Vertical gap between frames. */
        paddingY?: number;
    }

    /**
     * The rendering pipeline — an ordered list of stages that process
     * the frame through ping-pong HDR targets.
     */
    export interface Pipeline {
        /**
         * Add a built-in stage to the pipeline.
         *
         * @param kind   Stage type ("sprite", "bloom", "distortion", etc.).
         * @param name   Unique name for this instance (used by configure/remove/move).
         * @param props  Optional initial properties.
         *
         * @example
         * Renderer.pipeline.addStage("bloom", "bloom", { threshold: 0.7, intensity: 0.5 });
         * Renderer.pipeline.addStage("distortion", "distortion", { intensity: 0.05 });
         */
        addStage(kind: StageKind, name: string, props?: StageProperties): boolean;

        /** Remove a stage by name. */
        removeStage(name: string): boolean;

        /** Move a stage to a new index in the pipeline. */
        moveStage(name: string, index: number): boolean;

        /** Enable or disable a stage by name. */
        setEnabled(name: string, enabled: boolean): boolean;

        /**
         * Update tunables on a stage at runtime.
         *
         * @example
         * Renderer.pipeline.configure("bloom", { intensity: 0.8 });
         * Renderer.pipeline.configure("distortion", { heatHaze: true, heatHazeAmplitude: 0.005 });
         */
        configure(name: string, props: StageProperties): boolean;

        /** Returns the ordered list of stage names. */
        list(): string[];
    }

    /**
     * The `bokken/renderer` module — pipeline configuration, texture
     * management, and distortion control.
     *
     * @example
     * import Renderer from "bokken/renderer";
     *
     * Renderer.pipeline.addStage("bloom", "bloom", { threshold: 0.7 });
     * Renderer.loadTexture("/textures/tileset.png", "nearest");
     */
    interface RendererModule {
        /** The rendering pipeline. */
        readonly pipeline: Pipeline;

        /**
         * Load a texture from the asset pack into the TextureCache.
         * No-ops if the texture is already cached.
         *
         * @param path    Virtual path (e.g. "/textures/player.png").
         * @param filter  "linear" (default, HD sprites) or "nearest" (pixel art).
         * @returns       true on success.
         */
        loadTexture(path: string, filter?: TextureFilter): boolean;

        /**
         * Define a named sub-region of a loaded texture.
         *
         * @param name       Unique region name.
         * @param texPath    Virtual path of the parent texture.
         * @param x, y, w, h Pixel rectangle within the texture.
         */
        defineRegion(name: string, texPath: string, x: number, y: number, w: number, h: number): boolean;

        /**
         * Define a grid of regions from a sprite sheet.
         * Names are generated as "prefix_0", "prefix_1", etc.
         *
         * @param prefix    Name prefix for generated regions.
         * @param texPath   Virtual path of the sprite sheet.
         * @param frameW    Width of each frame in pixels.
         * @param frameH    Height of each frame in pixels.
         * @param params    Optional count, offset, and padding.
         * @returns         Number of regions created.
         */
        defineGrid(prefix: string, texPath: string, frameW: number, frameH: number, params?: DefineGridParams): number;

        /**
         * Spawn a shockwave at the given normalised screen position.
         * Requires a "distortion" stage in the pipeline.
         *
         * @param x  Normalised screen X (0 = left, 1 = right).
         * @param y  Normalised screen Y (0 = top, 1 = bottom).
         * @param params  Optional shockwave parameters.
         * @returns       true if a DistortionStage was found.
         */
        addShockwave(x: number, y: number, params?: ShockwaveParams): boolean;

        /** Remove all active shockwaves from the DistortionStage. */
        clearShockwaves(): void;
    }

    const Renderer: RendererModule;
    export default Renderer;
}