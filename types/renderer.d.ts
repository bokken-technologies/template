declare module "bokken/renderer" {
    /**
     * Built-in pipeline stage kinds accepted by
     * `pipeline.addStage()`.
     *
     *   "sprite"      — Scene stage. Clears and flushes the
     *                   SpriteBatcher. Writes albedo + normal +
     *                   emissive to deferred targets when followed
     *                   by a lighting pass.
     *   "shadow"      — Rasterises shadow-caster outlines into the
     *                   per-light 1D shadow atlas. Install BEFORE
     *                   the "lighting" stage and AFTER "sprite".
     *   "lighting"    — Accumulates Light2D contributions into a
     *                   lit image. Tiled forward+ culling, PCF
     *                   shadows, cookie sampling.
     *   "bloom"       — Bright-pass + Gaussian blur + additive
     *                   composite.
     *   "color-grade" — Filmic tonemap + exposure + saturation +
     *                   gamma.
     *   "distortion"  — Screen-space UV displacement (shockwaves,
     *                   heat haze).
     *   "composite"   — Final passthrough to the default
     *                   framebuffer.
     *
     * Typical install order (lighting + shadows):
     *
     *     sprite → shadow → lighting → bloom → color-grade → composite
     */
    export type StageKind =
        | "sprite"
        | "shadow"
        | "lighting"
        | "bloom"
        | "color-grade"
        | "distortion"
        | "composite";

    /**
     * Texture filtering mode for `loadTexture()`. `"nearest"`
     * preserves pixel art at non-integer scales;
     * `"linear"` smooths between texels and is the right default
     * for hi-res art and atlases.
     */
    export type TextureFilter = "linear" | "nearest";

    /** Properties for the `"sprite"` (scene) stage. */
    export interface SpriteStageProperties {
        /** When false, the stage is skipped this frame. */
        enabled?: boolean;
        /** Scene-clear red component in [0, 1]. */
        clearR?: number;
        /** Scene-clear green component in [0, 1]. */
        clearG?: number;
        /** Scene-clear blue component in [0, 1]. */
        clearB?: number;
        /** Scene-clear alpha in [0, 1]. */
        clearA?: number;
    }

    /** Properties for the `"shadow"` stage. */
    export interface ShadowStageProperties {
        enabled?: boolean;
    }

    /**
     * Properties for the `"lighting"` stage.
     *
     * Ambient can be authored two ways:
     *
     *   - Packed: `ambient: 0xRRGGBBAA` — matches `Mesh2D.color`
     *     and `Light2D.color`, so a single conventional colour
     *     pattern works everywhere. The alpha byte is ignored.
     *     Limited to LDR [0, 1] per channel.
     *
     *   - Flat scalar: `ambientR/G/B` individually — required
     *     when HDR ambient (values > 1.0) is needed for
     *     overbright skies, cave glows, etc.
     *
     * When both are specified, the packed form is applied first
     * and the flat scalars override per-channel. So
     * `{ ambient: 0x202030FF, ambientR: 2.5 }` gives an HDR red
     * on a dim cool baseline.
     */
    export interface LightingStageProperties {
        enabled?: boolean;
        /**
         * Global multiplier on every light's intensity. Useful
         * for "darken everything" cutscene fades or to tone-map
         * the whole lighting budget down without touching
         * individual lights. Default 1.0.
         */
        intensityScale?: number;
        /**
         * Wrap-around amount in [0, 1]. 0.0 = pure Lambertian
         * N·L (very contrasty on 2D sprites that lack authored
         * normal maps — flat sprites become invisible when no
         * light faces them). 0.5 = half-cosine wrap, the
         * "atmospheric 2D" default favoured by games like
         * Children of Morta and Ori. 1.0 = omnidirectional, only
         * distance and cone shape the lighting falloff.
         * Default 0.5.
         */
        wrapAmount?: number;
        /**
         * Packed 0xRRGGBBAA ambient colour. Matches Mesh2D.color
         * and Light2D.color. Alpha byte is ignored. For HDR
         * ambient (>1.0 per channel) use ambientR/G/B instead.
         */
        ambient?: number;
        /**
         * Ambient red channel. Default 0.05. Overrides the R
         * byte of `ambient`.
         */
        ambientR?: number;
        /**
         * Ambient green channel. Default 0.05. Overrides the G
         * byte of `ambient`.
         */
        ambientG?: number;
        /**
         * Ambient blue channel. Default 0.06. Overrides the B
         * byte of `ambient`.
         */
        ambientB?: number;
    }

    /** Properties for the `"bloom"` stage. */
    export interface BloomStageProperties {
        enabled?: boolean;
        /**
         * Brightness threshold; pixels brighter than this
         * contribute to bloom. Lower values produce more bloom.
         */
        threshold?: number;
        /**
         * Additive composite intensity. Multiplied with the
         * bloom buffer at the final mix.
         */
        intensity?: number;
        /**
         * Blur radius in pixels at the renderer's reference
         * resolution. Larger values produce softer, wider halos.
         */
        radius?: number;
    }

    /** Properties for the `"color-grade"` stage. */
    export interface ColorGradeStageProperties {
        enabled?: boolean;
        /** Exposure compensation in stops. 1.0 = no change. */
        exposure?: number;
        /** Saturation multiplier. 0 = greyscale, 1 = identity. */
        saturation?: number;
        /** Output gamma. 2.2 is the standard sRGB approximation. */
        gamma?: number;
    }

    /** Properties for the `"distortion"` stage. */
    export interface DistortionStageProperties {
        enabled?: boolean;
        /** Master displacement multiplier. */
        intensity?: number;
        /** When true, a continuous heat-haze field is layered on top of any active shockwaves. */
        heatHaze?: boolean;
        /** Speed of the heat-haze noise scroll. */
        heatHazeSpeed?: number;
        /** Spatial frequency of the heat-haze noise. */
        heatHazeFrequency?: number;
        /** Peak displacement of the heat-haze field. */
        heatHazeAmplitude?: number;
    }

    /** Properties for the `"composite"` stage. */
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

    /** Parameters for a shockwave fired via `Renderer.addShockwave()`. */
    export interface ShockwaveParams {
        /** Expansion rate of the shockwave ring in UV/sec. */
        speed?: number;
        /** Width of the distortion band. */
        thickness?: number;
        /** Peak displacement strength. */
        amplitude?: number;
        /** Auto-remove threshold. The wave is discarded when its radius exceeds this. */
        maxRadius?: number;
    }

    /** Parameters for `Renderer.defineGrid()` sprite-sheet slicing. */
    export interface DefineGridParams {
        /** Number of frames to extract. 0 (or omitted) fills the available space. */
        count?: number;
        /** Pixel X offset from the left edge of the texture. */
        offsetX?: number;
        /** Pixel Y offset from the top edge of the texture. */
        offsetY?: number;
        /** Horizontal gap between frames in pixels. */
        paddingX?: number;
        /** Vertical gap between frames in pixels. */
        paddingY?: number;
    }

    /**
     * The render pipeline — an ordered list of stages with
     * methods to add, remove, reorder, toggle, and reconfigure
     * them at runtime.
     *
     * Stages are identified by their `name` (the string passed
     * to `addStage`), not by their kind. This means you can
     * install multiple stages of the same kind under different
     * names — useful for chaining two bloom passes at different
     * thresholds, for instance.
     */
    export interface Pipeline {
        /**
         * Add a built-in stage to the pipeline.
         *
         * @param kind  The stage type from the `StageKind` union.
         * @param name  A unique name for this instance. Used by
         *              every other Pipeline method to identify
         *              the stage.
         * @param props Optional initial property values matching
         *              the stage kind.
         * @returns true on success, false if `name` is already
         *          in use or `kind` is unknown.
         *
         * @example
         *     // Lighting + shadows pipeline.
         *     Renderer.pipeline.addStage("sprite",    "scene");
         *     Renderer.pipeline.addStage("shadow",    "shadow");
         *     Renderer.pipeline.addStage("lighting",  "lighting", {
         *         ambient: 0x0B0B12FF,
         *         wrapAmount: 0.5,
         *     });
         *     Renderer.pipeline.addStage("bloom",     "bloom", { threshold: 0.7 });
         *     Renderer.pipeline.addStage("composite", "composite");
         */
        addStage(kind: StageKind, name: string, props?: StageProperties): boolean;

        /**
         * Remove a stage by name. Returns false if no stage with
         * that name exists.
         */
        removeStage(name: string): boolean;

        /**
         * Move an existing stage to a new position. Indices are
         * 0-based. Negative indices and indices past the end are
         * clamped to the list bounds. Returns false if no stage
         * with that name exists.
         */
        moveStage(name: string, index: number): boolean;

        /**
         * Toggle a stage's `enabled` flag without removing it.
         * Cheaper than removing and re-adding — the stage keeps
         * its allocated render targets and parameter state.
         * Returns false if no stage with that name exists.
         */
        setEnabled(name: string, enabled: boolean): boolean;

        /**
         * Apply property updates to an existing stage. Only the
         * fields present in `props` are written; the rest keep
         * their current values. Returns false if no stage with
         * that name exists or `props` doesn't match the stage's
         * kind.
         */
        configure(name: string, props: StageProperties): boolean;

        /**
         * Return the names of every installed stage in pipeline
         * order. Useful for debug overlays and for verifying a
         * dynamic install sequence.
         */
        list(): string[];
    }

    /**
     * The renderer module — pipeline configuration plus a
     * thin asset-management surface for textures and grids.
     *
     * @example
     *     import Renderer from "bokken/renderer";
     *
     *     Renderer.loadTexture("/textures/hero.png", "nearest");
     *     const frames = Renderer.defineGrid("hero:run", "/textures/hero.png", 32, 32, { count: 6 });
     */
    interface RendererModule {
        /** The render pipeline. See `Pipeline` for the per-stage API. */
        readonly pipeline: Pipeline;

        /**
         * Eagerly load a texture from the asset pack into the
         * GPU-side TextureCache. Textures are loaded lazily on
         * first draw anyway; this is for pre-warming at level
         * load to avoid mid-frame hitches.
         *
         * @returns false if the path doesn't resolve or the
         *          image fails to decode.
         */
        loadTexture(path: string, filter?: TextureFilter): boolean;

        /**
         * Define a named sub-region of a texture. Sprite2D
         * components reference these by name via
         * `regionName`.
         *
         * @returns false if the texture path can't be resolved.
         */
        defineRegion(
            name: string,
            texPath: string,
            x: number,
            y: number,
            w: number,
            h: number,
        ): boolean;

        /**
         * Carve a grid of equally-sized regions out of a
         * texture. Each cell is registered as
         * `<prefix>_<index>`, with index counting left-to-right,
         * top-to-bottom from zero.
         *
         * @returns The number of regions actually defined. May
         *          be smaller than `params.count` if the grid
         *          extends beyond the texture's bounds.
         */
        defineGrid(
            prefix: string,
            texPath: string,
            frameW: number,
            frameH: number,
            params?: DefineGridParams,
        ): number;

        /**
         * Fire a shockwave into the distortion stage at world
         * pixel coordinates `(x, y)`. The distortion stage must
         * be installed in the pipeline for this to have any
         * visible effect.
         *
         * @returns false if no distortion stage is installed.
         */
        addShockwave(x: number, y: number, params?: ShockwaveParams): boolean;

        /** Remove every active shockwave from the distortion stage. */
        clearShockwaves(): void;
    }

    const Renderer: RendererModule;
    export default Renderer;
}
