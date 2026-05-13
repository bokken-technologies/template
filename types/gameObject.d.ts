declare module "bokken/gameObject" {
    /** Primitive shapes for 2D rendering via `Mesh2D`. */
    export enum Shape2D {
        Empty = "Empty",
        Quad = "Quad",
        Circle = "Circle",
        Triangle = "Triangle",
        Line = "Line",
    }

    /** Blend mode for quads, sprites, and particles. */
    export enum BlendMode {
        /** Standard porter-duff over (`src * srcA + dst * (1-srcA)`). */
        Alpha = "Alpha",
        /**
         * Brightens what's behind (`src * srcA + dst`). Fire,
         * explosions, magic.
         */
        Additive = "Additive",
        /**
         * Subtler than additive (`1 - (1-src)*(1-dst)`). Soft
         * glows.
         */
        Screen = "Screen",
    }

    /** Loop behaviour for animation clips. */
    export enum AnimationLoopMode {
        /** Play once then stop on the final frame. */
        None = "None",
        /** Restart at frame 0 after the final frame. */
        Loop = "Loop",
        /** Play forward, then reverse, then forward again, indefinitely. */
        PingPong = "PingPong",
    }

    /**
     * Light source type for `Light2D`.
     *
     *   "Point"       — omnidirectional. Range + falloff define
     *                   brightness; no direction or cone fields
     *                   apply.
     *   "Spot"        — directional cone. Uses `directionDegrees`
     *                   and `innerConeAngle` / `outerConeAngle`
     *                   in addition to range and falloff.
     *   "Directional" — infinitely-distant parallel light (the
     *                   sun, the moon). Uses `directionDegrees`
     *                   only; position, range, falloff, and cone
     *                   fields are ignored. Directional lights
     *                   are added to every screen tile during
     *                   forward+ culling.
     */
    export enum LightType {
        Point = "Point",
        Spot = "Spot",
        Directional = "Directional",
    }

    /**
     * Animation envelope kind for `Light2D`.
     *
     *   "Constant" — no modulation. The light burns at exactly
     *                the authored intensity every frame.
     *   "Flicker"  — 1D value noise. Candles, torches, distant
     *                storms. `envelopeFrequency` drives jitter
     *                rate.
     *   "Pulse"    — sinusoidal swing. Heartbeats, magic orbs,
     *                breath. `envelopeFrequency` in Hz.
     *   "Strobe"   — square wave with smoothed edges. Alarms,
     *                emergency lights. Defaults to "on at t=0"
     *                so an alarm triggered by spawning the light
     *                starts at full brightness.
     *   "Custom"   — engine doesn't touch `intensityModulator`;
     *                scripts write it directly each frame.
     *                Allows arbitrary waveforms including
     *                over-bright peaks (useful for lightning
     *                strikes).
     *
     * All engine envelopes (Flicker, Pulse, Strobe) modulate in
     * `[1 - amplitude, 1]`: the authored intensity is the peak,
     * the modulator only ever dims. Use Custom for waveforms
     * that should exceed the authored ceiling.
     */
    export enum LightEnvelope {
        Constant = "Constant",
        Flicker = "Flicker",
        Pulse = "Pulse",
        Strobe = "Strobe",
        Custom = "Custom",
    }

    /**
     * Describes a grid region of a sprite sheet for automatic
     * frame slicing. Passed as the `frames` field of an
     * animation clip when you want the engine to carve the
     * frames out of the Sprite2D's texture automatically.
     */
    export interface AnimationFrameGrid {
        /** Width of each frame in pixels. */
        frameWidth: number;
        /** Height of each frame in pixels. */
        frameHeight: number;
        /**
         * Number of frames to extract. 0 or omitted fills the
         * available space.
         */
        count?: number;
        /** Pixel X offset from the left edge of the texture. */
        offsetX?: number;
        /** Pixel Y offset from the top edge of the texture. */
        offsetY?: number;
        /** Horizontal gap between frames in pixels. */
        paddingX?: number;
        /** Vertical gap between frames in pixels. */
        paddingY?: number;
        /**
         * Optional per-clip texture path. Overrides the
         * `Sprite2D`'s `texturePath`.
         */
        texturePath?: string;
    }

    /**
     * Defines a single named animation clip.
     *
     * `frames` accepts either:
     *
     *   - An array of TextureCache region name strings
     *     (explicit control).
     *   - An `AnimationFrameGrid` object that auto-slices the
     *     sibling `Sprite2D`'s texture into a uniform grid.
     */
    export interface AnimationClipDefinition {
        /** Unique clip name (e.g. `"idle"`, `"run"`, `"jump"`). */
        name: string;
        /** Frame source — explicit region names or auto-slice grid. */
        frames: string[] | AnimationFrameGrid;
        /** Playback speed in frames per second. Defaults to 12. */
        fps?: number;
        /** Loop behaviour. Defaults to `Loop`. */
        loop?: AnimationLoopMode;
    }

    /**
     * Base for every functional unit attached to a
     * `GameObject`. Concrete components extend `Component`
     * directly (for data-only components like `Transform2D`) or
     * `Behaviour` (for components with script callbacks like
     * `onUpdate`).
     */
    export abstract class Component {
        /** The GameObject this component is attached to. */
        readonly gameObject: GameObject;
        /**
         * When false, the component's per-frame work (rendering,
         * physics integration, scripted updates) is skipped. The
         * component is not destroyed and can be re-enabled later
         * by setting this to true. Default true.
         */
        public enabled: boolean;
    }

    /**
     * Defines the viewport and projection for 2D rendering.
     *
     * Exactly one Camera2D is rendered per frame: the first
     * Camera2D with `isActive` true that the scene walk
     * encounters. The owning GameObject's `Transform2D`
     * position centres the view; `Transform2D.rotation` rotates
     * the view counter-clockwise.
     */
    export class Camera2D extends Component {
        /**
         * View magnification. 1 is unity; values > 1 zoom in
         * (objects appear larger), values < 1 zoom out. Combines
         * with the owning Transform2D's scale.
         */
        public zoom: number;

        /**
         * When true, this is the camera the renderer picks up.
         * Only one Camera2D should have this set at a time;
         * extras are ignored in scene order.
         */
        public isActive: boolean;
    }

    /**
     * CPU-side 2D particle emitter.
     *
     * Spawns particles at the owning `Transform2D`'s position,
     * simulates them each frame, and submits coloured quads to
     * the SpriteBatcher.
     */
    export class ParticleEmitter2D extends Component {
        /**
         * When true, the emitter spawns new particles at
         * `emitRate`. False stops emission but lets already-
         * spawned particles run out their lifetimes.
         */
        public emitting: boolean;

        /** New particles per second. */
        public emitRate: number;

        /** Lower bound of a particle's lifetime in seconds. */
        public lifetimeMinimum: number;
        /** Upper bound of a particle's lifetime in seconds. */
        public lifetimeMaximum: number;

        /** Lower bound of a particle's launch speed in pixels/sec. */
        public speedMinimum: number;
        /** Upper bound of a particle's launch speed in pixels/sec. */
        public speedMaximum: number;

        /** Pixel size at spawn. */
        public sizeStart: number;
        /** Pixel size at end-of-life. Interpolated by `sizeEase`. */
        public sizeEnd: number;
        /** Random size jitter applied to `sizeStart` at spawn. */
        public sizeStartVariance: number;
        /**
         * Easing exponent for the size-over-lifetime curve. 1 is
         * linear; >1 holds the start size longer; <1 reaches
         * the end size sooner.
         */
        public sizeEase: number;

        /**
         * Spread of launch directions in degrees around
         * `direction`. 0 fires every particle in the same
         * direction; 360 fires omnidirectionally.
         */
        public spreadAngle: number;
        /**
         * Centre of the launch cone in degrees (0 = +X,
         * 90 = +Y).
         */
        public direction: number;

        /** Constant downward acceleration in pixels/sec². */
        public gravity: number;
        /**
         * Per-second velocity damping in [0, 1]. 0 = no damping,
         * 1 = particles stop instantly.
         */
        public damping: number;

        /** Lower bound of angular velocity in degrees/sec. */
        public angularVelocityMinimum: number;
        /** Upper bound of angular velocity in degrees/sec. */
        public angularVelocityMaximum: number;

        /** X offset from the emitter origin at spawn. */
        public spawnOffsetX: number;
        /** Y offset from the emitter origin at spawn. */
        public spawnOffsetY: number;

        /**
         * When true, particle launch speed is scaled by the
         * owning rigidbody's speed (relative to
         * `velocityReferenceSpeed`). Useful for jet trails that
         * intensify with vehicle speed.
         */
        public velocityScaleEmission: boolean;
        /**
         * Reference speed at which the velocity-scaled emission
         * factor is 1. Speeds above this scale linearly.
         */
        public velocityReferenceSpeed: number;

        /** Packed 0xRRGGBBAA colour at spawn. */
        public colorStart: number;
        /** Packed 0xRRGGBBAA colour at end-of-life. */
        public colorEnd: number;
        /**
         * Easing exponent for the alpha fade-out. 1 is linear;
         * higher values hold opacity longer before fading.
         */
        public alphaEase: number;

        /**
         * Submission z-order. Higher values draw on top of lower
         * ones within the same sprite stage.
         */
        public zOrder: number;
        /**
         * Hard cap on simultaneously-alive particles. New spawns
         * are dropped once this is reached.
         */
        public maximumParticles: number;

        /** Blend mode for all particles in this emitter. */
        public blendMode: BlendMode;

        /**
         * Emit `count` particles right now, ignoring the
         * `emitRate` clock. Useful for one-shot effects (an
         * explosion, a damage hit).
         */
        burst(count: number): void;
    }

    /**
     * 2D spatial transform: position, rotation (z-axis), scale,
     * and draw order. Does not carry visual state — attach a
     * `Mesh2D` or `Sprite2D` for that.
     *
     * Note: when a sibling `Rigidbody2D` exists, prefer writing
     * pose through the rigidbody (`positionX/Y`, `rotation`,
     * `setVelocity`). Direct transform writes are overwritten
     * by the physics step on the next fixed update.
     */
    export class Transform2D extends Component {
        /** Local X position in world pixels. */
        public positionX: number;
        /** Local Y position in world pixels. */
        public positionY: number;
        /** Rotation in degrees around the z-axis, counter-clockwise. */
        public rotation: number;
        /** Horizontal scale multiplier. 1 = identity. */
        public scaleX: number;
        /** Vertical scale multiplier. 1 = identity. */
        public scaleY: number;
        /**
         * Submission z-order. Higher values draw on top of lower
         * ones within the same sprite stage.
         */
        public zOrder: number;

        /**
         * Move the transform by the given offset in a single
         * native call. Faster than two separate writes to
         * `positionX` / `positionY` for the common "translate
         * by (dx, dy)" pattern.
         */
        translate(positionX: number, positionY: number): void;

        /** Rotate by the given degrees (counter-clockwise). */
        rotate(degrees: number): void;
    }

    /**
     * Visual representation of a 2D game object using
     * solid-color primitives. Separated from `Transform2D` so
     * invisible objects (triggers, spawners) don't carry render
     * state.
     *
     * For textured rendering, use `Sprite2D` instead. When both
     * `Sprite2D` and `Mesh2D` exist on the same GameObject,
     * `Sprite2D` takes priority.
     */
    export class Mesh2D extends Component {
        /** Primitive shape to render. */
        public shape: Shape2D;
        /** Packed 0xRRGGBBAA fill colour. */
        public color: number;
        /** Flip horizontally around the anchor. */
        public flipX: boolean;
        /** Flip vertically around the anchor. */
        public flipY: boolean;
    }

    /**
     * Visual representation using a texture or texture atlas
     * region.
     *
     * Draws a textured quad sourced from the TextureCache. The
     * texture is loaded lazily on first use — just set
     * `texturePath` to a virtual path inside the asset pack and
     * the engine handles the rest.
     *
     * When used with `Animation2D`, the animation controller
     * writes into `regionName` each frame to drive sprite-sheet
     * playback.
     *
     * Takes rendering priority over `Mesh2D` when both are
     * present.
     */
    export class Sprite2D extends Component {
        /**
         * Path to the texture in the asset pack VFS
         * (e.g. `"/textures/player.png"`).
         */
        public texturePath: string;
        /**
         * Named region within the texture. Empty string uses
         * the full texture.
         */
        public regionName: string;
        /**
         * Tint colour multiplied with the texture sample.
         * Packed as 0xRRGGBBAA.
         */
        public tint: number;
        /**
         * Overall opacity, multiplied into tint alpha at draw
         * time.
         */
        public opacity: number;
        public flipX: boolean;
        public flipY: boolean;
        /**
         * Override draw width in pixels. 0 uses the source
         * region's width.
         */
        public overrideWidth: number;
        /**
         * Override draw height in pixels. 0 uses the source
         * region's height.
         */
        public overrideHeight: number;
        /** Horizontal anchor in [0, 1]. 0.5 = center (default). */
        public anchorX: number;
        /** Vertical anchor in [0, 1]. 0.5 = center (default). */
        public anchorY: number;
        /** Blend mode for this sprite. */
        public blendMode: BlendMode;
    }

    /**
     * Sprite sheet animation controller.
     *
     * Holds a dictionary of named clips and drives the active
     * clip's frame counter. Each tick it writes the current
     * frame's region name into the sibling `Sprite2D`, so the
     * renderer picks it up automatically.
     *
     * Requires a `Sprite2D` on the same GameObject.
     */
    export class Animation2D extends Component {
        /** Whether the current clip is actively advancing frames. */
        readonly isPlaying: boolean;
        /** The name of the currently active clip. */
        readonly activeClip: string;
        /** The current frame index within the active clip. */
        readonly frameIndex: number;
        /** The TextureCache region name of the current frame. */
        readonly currentRegion: string;

        /**
         * Add or replace an animation clip.
         *
         * @example
         *     animation.addClip({
         *         name: "run",
         *         frames: { frameWidth: 32, frameHeight: 32, count: 6, offsetY: 64 },
         *         fps: 12,
         *         loop: AnimationLoopMode.Loop,
         *     });
         */
        addClip(clip: AnimationClipDefinition): this;

        /** Start playing a clip from the beginning. */
        play(clipName: string): void;
        /** Pause on the current frame. */
        pause(): void;
        /** Resume from where it was paused. */
        resume(): void;
        /** Stop and reset to the first frame. */
        stop(): void;
    }

    /**
     * Screen-space distortion effect attached to a game object.
     *
     * Reads the world position from the sibling `Transform2D`,
     * converts to normalised screen coordinates using the
     * active camera, and pushes shockwave effects into the
     * DistortionStage in the render pipeline.
     */
    export class Distortion2D extends Component {
        /** Expansion rate of the shockwave ring in UV/sec. */
        public speed: number;
        /** Width of the distortion band. */
        public thickness: number;
        /** Peak displacement strength. */
        public amplitude: number;
        /**
         * Auto-remove threshold. Wave is discarded when radius
         * exceeds this.
         */
        public maximumRadius: number;
        /**
         * If true, a shockwave fires automatically when the
         * component is attached.
         */
        public autoStart: boolean;

        /**
         * Fire a shockwave from the current world position.
         * Each call creates an independent wave — safe to call
         * multiple times.
         */
        trigger(): void;
    }

    /**
     * A 2D light source.
     *
     * Contributes per-pixel lighting in the LightingPass,
     * optionally casting shadows through the ShadowmapPass when
     * `castsShadows` is true and a ShadowmapPass is installed
     * in the pipeline. Sample pixels are evaluated in
     * light-relative world space; position is read from the
     * sibling `Transform2D` each frame.
     *
     * Three light types behave differently:
     *
     *   - Point:       omnidirectional, attenuates with distance
     *                  over range.
     *   - Spot:        cone-shaped, uses `directionDegrees` +
     *                  cone angles.
     *   - Directional: infinitely-distant parallel light, like
     *                  the sun.
     *
     * Optional features layered on top:
     *
     *   - Animation envelopes (Flicker, Pulse, Strobe, Custom)
     *     modulate `intensityModulator` each frame.
     *   - Shadow casting writes per-light occluder distance to
     *     the shadow atlas; the lighting pass samples with PCF.
     *   - Cookies project an image onto the light's
     *     contribution (the Bat-Signal effect, stained glass,
     *     projector patterns).
     *
     * Performance: lights are CPU-binned into 16x16 pixel tiles
     * each frame, so the per-pixel light count is typically
     * 4-12 even with hundreds of scene lights. Hard caps: 256
     * simultaneous lights, 256 shadow-casting lights, 32 unique
     * cookies, 32 lights per tile.
     *
     * @example
     *     // Flickering torch with soft shadows.
     *     const torch = new GameObject("Torch")
     *         .addComponent(Transform2D, { positionX: 300, positionY: 300 })
     *         .addComponent(Light2D, {
     *             type: LightType.Point,
     *             color: 0xFF8C2EFF,
     *             intensity: 2.8,
     *             range: 260,
     *             castsShadows: true,
     *             shadowSoftness: 2.0,
     *             envelope: LightEnvelope.Flicker,
     *             envelopeAmplitude: 0.2,
     *             envelopeFrequency: 6.0,
     *         });
     */
    export class Light2D extends Component {
        /** Light source kind. See `LightType`. */
        public type: LightType;

        /**
         * Packed 0xRRGGBBAA colour of the light, matching
         * `Mesh2D.color`. The alpha byte is ignored on
         * assignment (Light2D has no alpha channel) and always
         * reads back as 0xFF.
         *
         * For HDR colours where channels need to exceed 1.0
         * (overbright sources, magical glow), set
         * `colorR/G/B` individually — packed bytes can only
         * represent the 0..1 range.
         *
         * Reading `color` is lossy: HDR values written through
         * `colorR/G/B` are clamped to [0, 1] before
         * serialisation.
         */
        public color: number;

        /** Red channel of the light's linear-RGB colour. HDR values >1 are valid. */
        public colorR: number;
        /** Green channel of the light's linear-RGB colour. */
        public colorG: number;
        /** Blue channel of the light's linear-RGB colour. */
        public colorB: number;

        /**
         * Scalar multiplier on `color`. Animation envelopes
         * modulate `intensityModulator` each frame without
         * changing this; scripts that want to fade a light
         * should write `intensity` directly.
         */
        public intensity: number;

        /**
         * Pixel radius at which falloff reaches zero. Ignored
         * for directional lights.
         */
        public range: number;

        /**
         * Falloff exponent. 1.0 = linear, 2.0 = quadratic
         * (physically accurate inverse-square). Higher values
         * produce a sharper falloff edge.
         */
        public falloff: number;

        /**
         * Spot inner cone half-angle in degrees. Inside this
         * cone the intensity is full.
         */
        public innerConeAngle: number;
        /**
         * Spot outer cone half-angle in degrees. Between inner
         * and outer, smoothstep falloff.
         */
        public outerConeAngle: number;

        /**
         * Direction for spot / directional lights, expressed
         * as an angle in degrees (0 = +X, 90 = +Y). For
         * directional lights this is the direction light is
         * travelling, not where the light is "looking".
         */
        public directionDegrees: number;

        /**
         * Whether this light writes to the shadow atlas.
         * Requires a ShadowmapPass in the pipeline. Shadow
         * slots are assigned per-frame; lights beyond the slot
         * cap (256) render unshadowed for that frame.
         */
        public castsShadows: boolean;

        /**
         * PCF kernel radius multiplier for this light's shadow
         * sampling. 1.0 = renderer default; larger values
         * soften the shadow edge (diffuse sources, fog),
         * smaller values sharpen it (focused flashlights).
         * Nominal range [0, ~5]; 0 produces effectively hard
         * shadows.
         */
        public shadowSoftness: number;

        /**
         * Animation envelope. Drives `intensityModulator` each
         * frame (except `Custom`, which is script-driven). See
         * `LightEnvelope`.
         */
        public envelope: LightEnvelope;
        /**
         * Envelope swing amount in [0, 1]. 0.0 = no swing,
         * 1.0 = full swing.
         */
        public envelopeAmplitude: number;
        /** Envelope cycle rate in Hz. */
        public envelopeFrequency: number;
        /**
         * Envelope phase offset in seconds. Use to desync
         * identical lights.
         */
        public envelopePhase: number;

        /**
         * Per-frame intensity modulator written by the envelope.
         * Multiplied with `intensity` at GPU upload time.
         * Scripts running a `Custom` envelope write this field
         * directly each frame. Values nominally in [0, 1];
         * engine envelopes never exceed 1.0.
         */
        public intensityModulator: number;

        /**
         * Path to the cookie / gobo image in the asset pack
         * VFS. Empty string = no cookie. Loaded lazily on first
         * use into a slot-based atlas; up to 32 unique cookies
         * can be resident simultaneously (FIFO eviction beyond
         * that).
         *
         * Sampled in light-relative world space: the light's
         * position maps to the cookie's centre (UV 0.5, 0.5),
         * the light's range maps to the cookie's edges
         * (UV 0 and 1).
         */
        public cookiePath: string;
        /**
         * Horizontal cookie UV offset. Animate over time for
         * scrolling cookies.
         */
        public cookieUVOffsetX: number;
        /** Vertical cookie UV offset. */
        public cookieUVOffsetY: number;
        /**
         * Horizontal cookie UV scale. Values >1 tile the cookie
         * within the slot.
         */
        public cookieUVScaleX: number;
        /** Vertical cookie UV scale. */
        public cookieUVScaleY: number;

        /**
         * Reset the envelope's internal phase clock to zero.
         * Useful for "alarm triggers at this exact moment" —
         * without this, the envelope is mid-cycle when first
         * encountered. No-op for `Constant` and `Custom`
         * envelopes.
         */
        resetEnvelope(): void;
    }

    /**
     * An explicit polygonal occluder for the 2D lighting
     * system.
     *
     * Attach alongside a `Transform2D` to make the owning
     * GameObject cast shadows. The outline is a list of
     * local-space vertices in pixel coordinates; the renderer
     * reads the sibling `Transform2D` each frame to project
     * these into world space and rasterises shadow segments to
     * the per-light shadow atlas.
     *
     * Authoring conventions
     *
     *   - Vertices are in local pixel space relative to the
     *     GameObject's anchor. (0, 0) is the anchor.
     *   - Order is counterclockwise around the silhouette in
     *     screen space (top-left origin). Reversed winding
     *     produces inverted shadows.
     *   - The outline is implicitly closed — do not repeat the
     *     first vertex at the end.
     *   - Outlines need not be convex. Each edge is rasterised
     *     independently.
     *
     * @example
     *     const wall = new GameObject("Wall")
     *         .addComponent(Transform2D, { positionX: 500, positionY: 300 })
     *         .addComponent(ShadowCaster2D, {
     *             outline: [
     *                 { x: -30, y: -50 },
     *                 { x:  30, y: -50 },
     *                 { x:  30, y:  50 },
     *                 { x: -30, y:  50 },
     *             ],
     *         });
     */
    export class ShadowCaster2D extends Component {
        /**
         * Global switch — false skips this caster's
         * contribution without removing it. Useful for
         * "lights-off" cutscenes or for occluders that
         * conditionally appear (a door opening).
         */
        public castsShadow: boolean;

        /**
         * Per-caster softness multiplier. Currently INERT — the
         * field is plumbed through the renderer but has no
         * effect on shadow sampling, which uses per-light
         * softness instead.
         *
         * Reserved for a future per-caster softness path that
         * would store softness alongside occluder distance in a
         * secondary atlas channel.
         */
        public softness: number;

        /**
         * Polygon outline in local-space pixels. Reading
         * returns a fresh array copy; mutate the array and
         * re-assign to update the caster.
         *
         * Entries with non-numeric x/y are silently dropped
         * from the stored outline so partial data doesn't
         * corrupt the buffer.
         */
        public outline: { x: number; y: number }[];
    }

    /**
     * Tangent-space normal map for the sibling `Sprite2D`.
     *
     * Provides per-pixel surface normals to the lighting pass,
     * letting flat sprites pick up directional shading from
     * `Light2D`s. Either point `normalMapPath` at an
     * authored map, or set `autoGenerate` to true to derive
     * one from the sprite's luminance at load time.
     */
    export class NormalMap2D extends Component {
        /**
         * Path to the normal map in the asset pack VFS.
         * Ignored when `autoGenerate` is true.
         */
        public normalMapPath: string;

        /**
         * When true, generate a normal map from the sibling
         * Sprite2D's luminance gradient. Cheaper than authoring
         * one, but produces a flatter look — set
         * `autoStrength` to compensate.
         */
        public autoGenerate: boolean;

        /**
         * Strength multiplier for the auto-generated normal map.
         * 1 = identity; higher values exaggerate surface relief.
         */
        public autoStrength: number;

        /**
         * Discard the currently cached normal-map texture and
         * regenerate it from the source on the next frame.
         * Useful after swapping the sibling Sprite2D's texture.
         */
        invalidate(): void;
    }

    /**
     * Plays a sound at the owning GameObject's position.
     *
     * Routes through the named audio channel from
     * `bokken/audio`. Spatial sources attenuate with distance
     * from the active `AudioListener2D`; non-spatial sources
     * play at uniform volume across the scene.
     */
    export class AudioSource2D extends Component {
        /** Asset-pack path to the audio clip. */
        public clip: string;
        /**
         * Channel name from `bokken/audio` to route through.
         * `"Master"` is always valid.
         */
        public channel: string;
        /** Linear playback volume in [0, 1]. */
        public volume: number;
        /**
         * Playback pitch / speed multiplier. 1 = native, 2 =
         * octave up, 0.5 = octave down.
         */
        public pitch: number;
        /**
         * When true, the clip restarts as soon as it finishes.
         */
        public loop: boolean;
        /**
         * When true, the clip starts playing as soon as the
         * component is attached.
         */
        public autoPlay: boolean;
        /**
         * When true, the source is panned and attenuated based
         * on the active listener's position. When false, the
         * source plays at uniform volume.
         */
        public spatial: boolean;
        /**
         * Distance (pixels) below which the source plays at
         * full volume. Only relevant when `spatial` is true.
         */
        public minimumDistance: number;
        /**
         * Distance (pixels) at which the source becomes
         * silent. Beyond this distance the source is culled.
         */
        public maximumDistance: number;
        /**
         * Falloff exponent for the spatial attenuation curve.
         * 1 = linear, 2 = inverse-square.
         */
        public rolloff: number;
        /**
         * When true, the source's velocity (derived frame-over-
         * frame from its Transform2D) drives a Doppler shift
         * relative to the listener.
         */
        public doppler: boolean;

        /** True while the source is producing audio. */
        public readonly isPlaying: boolean;

        /** Begin playback from the start. */
        play(): void;
        /**
         * Stop playback. With `fadeOutSeconds > 0`, the source
         * ramps its volume down to silence over that duration
         * before stopping.
         */
        stop(fadeOutSeconds?: number): void;
        /** Pause playback at the current position. */
        pause(): void;
        /** Resume from the pause point. */
        resume(): void;
        /**
         * Fire a one-shot voice that plays in parallel with any
         * current playback. The one-shot is independent: it
         * doesn't loop, can't be paused, and is culled
         * automatically when it finishes.
         */
        playOneShot(clipOverride?: string): void;
        /**
         * Fire a one-shot at an arbitrary world position
         * regardless of where the owning GameObject is. Useful
         * for "explosion at this point on the map" effects
         * without spawning a GameObject.
         */
        playOneShotAt(
            positionX: number,
            positionY: number,
            clipOverride?: string,
        ): void;
    }

    /**
     * Marks a GameObject as the "ear" of the audio scene.
     *
     * Spatial AudioSource2D voices are panned and attenuated
     * relative to the listener's `Transform2D` position. There
     * should be exactly one active listener per scene; with
     * more than one, the first encountered in scene order wins.
     */
    export class AudioListener2D extends Component {
        /** Master gain applied to the listener's mix. */
        public gain: number;
    }

    /**
     * Body type controlling how a rigidbody participates in the
     * physics simulation.
     *
     *   "static"    — never moves, infinite mass. Walls, floors.
     *   "dynamic"   — fully simulated. Forces, gravity, contacts
     *                 all apply.
     *   "kinematic" — scripted motion. Not affected by forces or
     *                 contacts, but still pushes dynamic bodies
     *                 it touches.
     */
    export type Rigidbody2DType = "static" | "dynamic" | "kinematic";

    /**
     * Couples a GameObject to the Box2D physics world.
     *
     * Reads / writes the sibling `Transform2D`'s pose each
     * fixed update — direct writes to the transform get
     * overwritten by the next physics step. Colliders attached
     * to the same GameObject provide the actual shape; without
     * any Collider2D the body has no contact surface.
     */
    export class Rigidbody2D extends Component {
        /** Body type. See `Rigidbody2DType`. */
        public type: Rigidbody2DType;
        /**
         * When true, the body never rotates regardless of
         * applied torque or contacts. Useful for player
         * characters and other "always upright" bodies.
         */
        public fixedRotation: boolean;
        /**
         * When true, Box2D uses continuous collision detection
         * for this body. Necessary for fast-moving projectiles
         * to avoid tunneling through thin walls; costs CPU.
         */
        public isBullet: boolean;
        /** Per-second linear velocity damping. */
        public linearDamping: number;
        /** Per-second angular velocity damping. */
        public angularDamping: number;
        /**
         * Multiplier on world gravity for this body. 0 = float,
         * 1 = full gravity, -1 = floats upward.
         */
        public gravityScale: number;
        /**
         * When true, the body may be put to sleep by the
         * solver when it stops moving. Sleeping bodies cost no
         * CPU until they're touched again.
         */
        public allowSleep: boolean;

        /** World-space X position in pixels. */
        public positionX: number;
        /** World-space Y position in pixels. */
        public positionY: number;
        /** Rotation in degrees, counter-clockwise. */
        public rotation: number;
        /** Linear velocity X component in pixels/sec. */
        public velocityX: number;
        /** Linear velocity Y component in pixels/sec. */
        public velocityY: number;
        /** Angular velocity in degrees/sec. */
        public angularVelocity: number;
        /**
         * When true, the body is currently being simulated.
         * Sleeping bodies have this false; touching one wakes
         * it. Writing true forces a wake-up.
         */
        public awake: boolean;

        /** Total mass in Box2D units. Derived from collider density. */
        readonly mass: number;
        /** Moment of inertia in Box2D units. */
        readonly inertia: number;

        /**
         * Apply a continuous force in world-space at the given
         * world point. With `pointX` / `pointY` omitted, force
         * is applied at the centre of mass (no torque).
         */
        applyForce(
            forceX: number, forceY: number,
            pointX?: number, pointY?: number,
        ): void;

        /**
         * Apply a continuous force at the centre of mass. Same
         * as `applyForce` with the point omitted, but cheaper.
         */
        applyForceToCenter(forceX: number, forceY: number): void;

        /** Apply a continuous torque around the centre of mass. */
        applyTorque(torque: number): void;

        /**
         * Apply an instantaneous change in velocity (impulse)
         * at the given world point. With the point omitted,
         * impulse is applied at the centre of mass.
         */
        applyImpulse(
            impulseX: number, impulseY: number,
            pointX?: number, pointY?: number,
        ): void;

        /**
         * Apply an instantaneous change in velocity at the
         * centre of mass.
         */
        applyImpulseToCenter(impulseX: number, impulseY: number): void;

        /** Apply an instantaneous change in angular velocity. */
        applyAngularImpulse(impulse: number): void;

        /**
         * Overwrite the linear velocity in a single native
         * call. Faster than two separate writes to
         * `velocityX` / `velocityY`.
         */
        setVelocity(velocityX: number, velocityY: number): void;
    }

    /**
     * Information about a contact between two bodies, passed to
     * `onCollisionEnter` callbacks.
     */
    export interface ContactInfo {
        /** Contact point in world pixels (the first manifold point). */
        point: { x: number; y: number };
        /** Surface normal at the contact point. */
        normal: { x: number; y: number };
        /** Number of manifold points (1 or 2 for 2D). */
        pointCount: number;
    }

    /**
     * Information about the moment two bodies actually impact,
     * passed to `onCollisionHit` callbacks. Distinct from
     * `ContactInfo` in that this fires once at the moment of
     * impact (not continuously while in contact) and includes
     * the approach speed for damage / pitch calculations.
     */
    export interface HitInfo {
        /** Impact point in world pixels. */
        point: { x: number; y: number };
        /** Surface normal at the impact point. */
        normal: { x: number; y: number };
        /**
         * Approach speed along the contact normal, in
         * pixels/sec. Use this to drive impact-volume or damage
         * calculations.
         */
        approachSpeed: number;
    }

    /**
     * Base class for every 2D collider.
     *
     * Colliders provide the shape that a `Rigidbody2D` uses
     * for contacts. A GameObject with a collider but no
     * Rigidbody2D becomes an implicit static body; one with
     * both follows the rigidbody's type.
     *
     * The five collision callbacks are invoked on the
     * collider's owning Behaviour (if present); the same hooks
     * are also exposed as assignable properties for non-
     * Behaviour scripts. Both routes fire — assign carefully
     * to avoid double-handling.
     */
    export abstract class Collider2D extends Component {
        /**
         * Mass per unit area. Combines with the collider's
         * shape area to produce the rigidbody's mass.
         */
        public density: number;
        /**
         * Coulomb friction coefficient. 0 = frictionless, 1 =
         * very grippy. Friction at a contact is the geometric
         * mean of the two colliders'.
         */
        public friction: number;
        /**
         * Bounciness in [0, 1]. 0 = no bounce, 1 = perfectly
         * elastic.
         */
        public restitution: number;
        /**
         * Surface tangent speed in pixels/sec — Box2D applies
         * this as if the surface were a conveyor belt moving in
         * its local tangent direction.
         */
        public tangentSpeed: number;
        /**
         * When true, the collider is a trigger: it fires sensor
         * callbacks on overlap but doesn't generate contacts or
         * impulses.
         */
        public isSensor: boolean;
        /**
         * Bitmask describing which categories this collider
         * belongs to. Combines with `maskBits` to drive contact
         * filtering.
         */
        public categoryBits: number;
        /**
         * Bitmask describing which categories this collider
         * collides with. A contact happens iff
         * `(a.categoryBits & b.maskBits) != 0` in both
         * directions.
         */
        public maskBits: number;
        /**
         * Group index for short-circuit collision filtering.
         * Positive groups always collide with themselves;
         * negative groups never collide with themselves;
         * zero defers to `categoryBits` / `maskBits`.
         */
        public groupIndex: number;

        /**
         * Fires the frame two colliders first make contact.
         * The `contact` argument carries the first manifold
         * point.
         */
        public onCollisionEnter:
            | ((other: GameObject, contact: ContactInfo) => void)
            | null;

        /**
         * Fires the frame two colliders separate. `other` may
         * be null if the other body was destroyed during
         * separation.
         */
        public onCollisionExit:
            | ((other: GameObject | null) => void)
            | null;

        /**
         * Fires once at the moment of a real impact (as
         * opposed to ongoing contact). The `hit` argument
         * carries the approach speed, useful for damage /
         * audio calculations.
         */
        public onCollisionHit:
            | ((other: GameObject, hit: HitInfo) => void)
            | null;

        /**
         * Trigger equivalent of `onCollisionEnter` — fires when
         * `isSensor` is true and another collider begins
         * overlapping.
         */
        public onSensorEnter:
            | ((other: GameObject | null) => void)
            | null;

        /**
         * Trigger equivalent of `onCollisionExit` — fires when
         * the sensor overlap ends.
         */
        public onSensorExit:
            | ((other: GameObject | null) => void)
            | null;
    }

    /** Axis-aligned (then rotated) rectangle collider. */
    export class BoxCollider2D extends Collider2D {
        /** Width in pixels. */
        public sizeX: number;
        /** Height in pixels. */
        public sizeY: number;
        /** Local X offset from the GameObject's transform. */
        public offsetX: number;
        /** Local Y offset from the GameObject's transform. */
        public offsetY: number;
        /**
         * Rotation in degrees applied to the box around its
         * local centre. Composes with the GameObject's
         * `Transform2D.rotation`.
         */
        public angle: number;
    }

    /** Circle collider with optional local offset. */
    export class CircleCollider2D extends Collider2D {
        /** Radius in pixels. */
        public radius: number;
        /** Local X offset from the GameObject's transform. */
        public offsetX: number;
        /** Local Y offset from the GameObject's transform. */
        public offsetY: number;
    }

    /**
     * Capsule collider — a swept circle between two endpoints.
     * Good for character controllers (rounded ends, no corner
     * snags).
     */
    export class CapsuleCollider2D extends Collider2D {
        /** Endpoint A, X component, in local pixels. */
        public pointAX: number;
        /** Endpoint A, Y component, in local pixels. */
        public pointAY: number;
        /** Endpoint B, X component, in local pixels. */
        public pointBX: number;
        /** Endpoint B, Y component, in local pixels. */
        public pointBY: number;
        /** Radius of the swept circle in pixels. */
        public radius: number;
    }

    /**
     * Convex polygon collider.
     *
     * Box2D requires polygons to be convex with at most 8
     * vertices; concave shapes should be split across multiple
     * PolygonCollider2D instances or modelled with a
     * ChainCollider2D.
     */
    export class PolygonCollider2D extends Collider2D {
        /**
         * Vertices in local pixel space. Either an array of
         * `{ x, y }` objects or an array of `[x, y]` tuples
         * — pick whichever is more convenient.
         */
        public points: { x: number; y: number }[] | [number, number][];
    }

    /**
     * Single-edge collider. Two points define a line segment
     * the body collides against from either side (or just one
     * side, when `oneSided` is true).
     */
    export class EdgeCollider2D extends Collider2D {
        /** Endpoint A, X component, in local pixels. */
        public pointAX: number;
        /** Endpoint A, Y component, in local pixels. */
        public pointAY: number;
        /** Endpoint B, X component, in local pixels. */
        public pointBX: number;
        /** Endpoint B, Y component, in local pixels. */
        public pointBY: number;
        /**
         * When true, collisions only register from the edge's
         * left-hand side (relative to the A→B direction).
         * Useful for one-way platforms.
         */
        public oneSided: boolean;
    }

    /**
     * Chain collider — a sequence of connected edges. Use for
     * static world geometry (terrain outlines, level borders);
     * cheaper than many EdgeCollider2D instances.
     */
    export class ChainCollider2D extends Collider2D {
        /**
         * Vertices in local pixel space. Either an array of
         * `{ x, y }` objects or an array of `[x, y]` tuples.
         */
        public points: { x: number; y: number }[] | [number, number][];
        /**
         * When true, the chain is closed — the last point
         * connects back to the first. When false, the chain
         * is open.
         */
        public loop: boolean;
    }

    /**
     * Base class for scripted gameplay logic.
     *
     * Subclass and override the lifecycle hooks to react to
     * engine events. All hooks are optional — only the ones
     * you implement get wired up.
     *
     * @example
     *     class PlayerController extends Behaviour {
     *         onStart() {
     *             this.rb = this.gameObject.getComponent(Rigidbody2D)!;
     *         }
     *         onUpdate(dt: number) {
     *             if (Input.isKeyDown("KeyA")) this.rb.applyForceToCenter(-50, 0);
     *         }
     *     }
     */
    export abstract class Behaviour extends Component {
        /** Called once, the frame after the component is attached. */
        onStart?(): void;
        /**
         * Called every frame with the variable delta time.
         * Use for input handling, animation, anything that
         * should run as fast as the display refresh.
         */
        onUpdate?(deltaTime: number): void;
        /**
         * Called every physics tick at a fixed delta (typically
         * 1/50 s). Use for physics-related logic — applying
         * forces, reading velocities for AI decisions.
         */
        onFixedUpdate?(deltaTime: number): void;
        /**
         * Called once, immediately before the component (or its
         * owning GameObject) is destroyed.
         */
        onDestroy?(): void;
        /**
         * Convenience: same payload as
         * `Collider2D.onCollisionEnter` but invoked on this
         * Behaviour for every sibling collider's contacts.
         */
        onCollisionEnter?(other: GameObject, contact: ContactInfo): void;
        /** See `Collider2D.onCollisionExit`. */
        onCollisionExit?(other: GameObject | null): void;
        /** See `Collider2D.onCollisionHit`. */
        onCollisionHit?(other: GameObject, hit: HitInfo): void;
        /** See `Collider2D.onSensorEnter`. */
        onSensorEnter?(other: GameObject | null): void;
        /** See `Collider2D.onSensorExit`. */
        onSensorExit?(other: GameObject | null): void;
    }

    /**
     * Property shape accepted by `addComponent`. Strips method
     * names from the component's surface so authors can only
     * set data fields at construction time.
     */
    type ComponentProperties<T> = {
        [K in keyof T as T[K] extends (...args: any[]) => any
            ? never
            : K]?: T[K];
    };

    /**
     * Optional properties accepted by the `GameObject`
     * constructor.
     */
    export interface GameObjectProperties {
        /**
         * When true, the GameObject is automatically destroyed
         * after all of its components finish (e.g. a one-shot
         * particle emitter that has emitted its burst and all
         * particles have died, an AudioSource2D that has
         * finished playing). Default false.
         */
        destroyWhenIdle?: boolean;
    }

    /**
     * The fundamental unit of scene composition.
     *
     * A GameObject is a name plus a flat bag of components
     * plus a parent / children tree. Behaviour comes from the
     * components — a GameObject by itself does nothing.
     *
     * Construction uses chained `addComponent` calls:
     *
     * @example
     *     const player = new GameObject("Player")
     *         .addComponent(Transform2D, { positionX: 100, positionY: 200 })
     *         .addComponent(Sprite2D, { texturePath: "/textures/hero.png" })
     *         .addComponent(Rigidbody2D, { type: "dynamic" })
     *         .addComponent(BoxCollider2D, { sizeX: 32, sizeY: 48 });
     */
    export class GameObject {
        constructor(name?: string, properties?: GameObjectProperties);

        /** Display name. Used by `GameObject.find()`. */
        public name: string;

        /** See `GameObjectProperties.destroyWhenIdle`. */
        public destroyWhenIdle: boolean;

        /**
         * Attach a component, applying optional initial
         * property values. Returns `this` for fluent chaining.
         *
         * @param componentClass The component's class.
         * @param props          Initial values for the
         *                       component's data fields.
         */
        addComponent<T extends Component>(
            componentClass: new () => T,
            props?: ComponentProperties<T>,
        ): this;

        /**
         * Return the first component of the given type on this
         * GameObject, or `undefined` if there isn't one.
         */
        getComponent<T extends Component>(
            componentClass: new () => T,
        ): T | undefined;

        /**
         * Reparent this GameObject. Passing null detaches it
         * (it becomes a top-level child of the scene root).
         * Children follow their parent's transform.
         */
        setParent(parent: GameObject | null): void;

        /** Return a snapshot of this GameObject's direct children. */
        getChildren(): GameObject[];

        /**
         * Destroy a GameObject and all of its components and
         * children. `onDestroy` fires on every Behaviour
         * touched. After destruction, references to the
         * GameObject become invalid — calling methods on it is
         * a no-op.
         */
        static destroy(obj: GameObject): void;

        /**
         * Find the first GameObject with the given name
         * anywhere in the active scene. Returns `undefined` if
         * none matches.
         */
        static find(name: string): GameObject | undefined;
    }
}
