declare module "bokken/gameObject" {
    /** Primitive shapes for 2D rendering. */
    export enum Shape2D {
        Empty = "Empty",
        Quad = "Quad",
        Circle = "Circle",
        Triangle = "Triangle",
        Line = "Line",
    }

    /** Blend mode for quads, sprites, and particles. */
    export enum BlendMode {
        /** Standard porter-duff over (src * srcA + dst * (1-srcA)). */
        Alpha = "Alpha",
        /** Brightens what's behind (src * srcA + dst). Fire, explosions, magic. */
        Additive = "Additive",
        /** Subtler than additive (1 - (1-src)*(1-dst)). Soft glows. */
        Screen = "Screen",
    }

    /** Loop behaviour for animation clips. */
    export enum AnimationLoopMode {
        None = "None",
        Loop = "Loop",
        PingPong = "PingPong"
    }

    /**
     * Light source type for Light2D.
     *
     *   "Point"        — omnidirectional. Range + falloff define brightness;
     *                    no direction or cone fields apply.
     *   "Spot"         — directional cone. Uses directionDegrees and
     *                    innerConeAngle / outerConeAngle in addition to
     *                    range and falloff.
     *   "Directional"  — infinitely-distant parallel light (the sun, the
     *                    moon). Uses directionDegrees only; position,
     *                    range, falloff, and cone fields are ignored.
     *                    Directional lights are added to every screen
     *                    tile during forward+ culling.
     */
    export enum LightType {
        Point = "Point",
        Spot = "Spot",
        Directional = "Directional",
    }

    /**
     * Animation envelope kind for Light2D.
     *
     *   "Constant" — no modulation. The light burns at exactly the
     *                authored intensity every frame.
     *   "Flicker"  — 1D value noise. Candles, torches, distant storms.
     *                envelopeFrequency drives jitter rate.
     *   "Pulse"    — sinusoidal swing. Heartbeats, magic orbs, breath.
     *                envelopeFrequency in Hz.
     *   "Strobe"   — square wave with smoothed edges. Alarms, emergency
     *                lights. Defaults to "on at t=0" so an alarm
     *                triggered by spawning the light starts at full
     *                brightness.
     *   "Custom"   — engine doesn't touch intensityModulator; scripts
     *                write it directly each frame. Allows arbitrary
     *                waveforms including over-bright peaks (useful for
     *                lightning strikes).
     *
     * All engine envelopes (Flicker, Pulse, Strobe) modulate in
     * [1 - amplitude, 1]: the authored intensity is the peak, the
     * modulator only ever dims. Use Custom for waveforms that should
     * exceed the authored ceiling.
     */
    export enum LightEnvelope {
        Constant = "Constant",
        Flicker = "Flicker",
        Pulse = "Pulse",
        Strobe = "Strobe",
        Custom = "Custom",
    }

    /**
     * Describes a grid region of a sprite sheet for automatic frame slicing.
     * Passed as the `frames` field of an animation clip when you want the
     * engine to carve the frames out of the Sprite2D's texture automatically.
     */
    export interface AnimationFrameGrid {
        /** Width of each frame in pixels. */
        frameWidth: number;
        /** Height of each frame in pixels. */
        frameHeight: number;
        /** Number of frames to extract. 0 or omitted fills the available space. */
        count?: number;
        /** Pixel X offset from the left edge of the texture. */
        offsetX?: number;
        /** Pixel Y offset from the top edge of the texture. */
        offsetY?: number;
        /** Horizontal gap between frames in pixels. */
        paddingX?: number;
        /** Vertical gap between frames in pixels. */
        paddingY?: number;
        /** Optional per-clip texture path. Overrides the Sprite2D's texturePath. */
        texturePath?: string;
    }

    /**
     * Defines a single named animation clip.
     *
     * `frames` accepts either:
     *   - An array of TextureCache region name strings (explicit control).
     *   - An AnimationFrameGrid object that auto-slices the sibling
     *     Sprite2D's texture into a uniform grid.
     */
    export interface AnimationClipDefinition {
        /** Unique clip name (e.g. "idle", "run", "jump"). */
        name: string;
        /** Frame source — explicit region names or auto-slice grid. */
        frames: string[] | AnimationFrameGrid;
        /** Playback speed in frames per second. Defaults to 12. */
        fps?: number;
        /** Loop behaviour. Defaults to "Loop". */
        loop?: AnimationLoopMode;
    }

    /** Base interface for all functional units attached to a GameObject. */
    export abstract class Component {
        readonly gameObject: GameObject;
        public enabled: boolean;
    }

    /** Defines the viewport and projection for 2D rendering. */
    export class Camera2D extends Component {
        public zoom: number;
        public isActive: boolean;
    }

    /**
     * CPU-side 2D particle emitter.
     *
     * Spawns particles at the owning Transform2D's position, simulates
     * them each frame, and submits coloured quads to the SpriteBatcher.
     */
    export class ParticleEmitter2D extends Component {
        public emitting: boolean;
        public emitRate: number;
        public lifetimeMinimum: number;
        public lifetimeMaximum: number;
        public speedMinimum: number;
        public speedMaximum: number;
        public sizeStart: number;
        public sizeEnd: number;
        public sizeStartVariance: number;
        public sizeEase: number;
        public spreadAngle: number;
        public direction: number;
        public gravity: number;
        public damping: number;
        public angularVelocityMinimum: number;
        public angularVelocityMaximum: number;
        public spawnOffsetX: number;
        public spawnOffsetY: number;
        public velocityScaleEmission: boolean;
        public velocityReferenceSpeed: number;
        public colorStart: number;
        public colorEnd: number;
        public alphaEase: number;
        public zOrder: number;
        public maximumParticles: number;
        /** Blend mode for all particles in this emitter. */
        public blendMode: BlendMode;

        burst(count: number): void;
    }

    /**
     * 2D spatial transform: position, rotation (z-axis), scale, and draw order.
     * Does not carry visual state — attach a Mesh2D or Sprite2D for that.
     *
     * Note: when a sibling Rigidbody2D exists, prefer writing pose through
     * the rigidbody (positionX/Y, rotation, setVelocity). Direct transform
     * writes are overwritten by the physics step on the next fixedUpdate.
     */
    export class Transform2D extends Component {
        public positionX: number;
        public positionY: number;
        public rotation: number;
        public scaleX: number;
        public scaleY: number;
        public zOrder: number;

        /** Moves the transform by the given offset in a single native call. */
        translate(positionX: number, positionY: number): void;

        /** Rotates by the given degrees (counter-clockwise). */
        rotate(degrees: number): void;
    }

    /**
     * Visual representation of a 2D game object using solid-color primitives.
     * Separated from Transform2D so invisible objects (triggers, spawners)
     * don't carry render state.
     *
     * For textured rendering, use Sprite2D instead. When both Sprite2D and
     * Mesh2D exist on the same GameObject, Sprite2D takes priority.
     */
    export class Mesh2D extends Component {
        public shape: Shape2D;
        public color: number;
        public flipX: boolean;
        public flipY: boolean;
    }

    /**
     * Visual representation using a texture or texture atlas region.
     *
     * Draws a textured quad sourced from the TextureCache. The texture is
     * loaded lazily on first use — just set `texturePath` to a virtual path
     * inside the asset pack and the engine handles the rest.
     *
     * When used with Animation2D, the animation controller writes into
     * `regionName` each frame to drive sprite sheet playback.
     *
     * Takes rendering priority over Mesh2D when both are present.
     */
    export class Sprite2D extends Component {
        /** Path to the texture in the asset pack VFS (e.g. "/textures/player.png"). */
        public texturePath: string;
        /** Named region within the texture. Empty string uses the full texture. */
        public regionName: string;
        /** Tint colour multiplied with the texture sample. Packed as 0xRRGGBBAA. */
        public tint: number;
        /** Overall opacity, multiplied into tint alpha at draw time. */
        public opacity: number;
        public flipX: boolean;
        public flipY: boolean;
        /** Override draw width in pixels. 0 uses the source region's width. */
        public overrideWidth: number;
        /** Override draw height in pixels. 0 uses the source region's height. */
        public overrideHeight: number;
        /** Horizontal anchor in [0,1]. 0.5 = center (default). */
        public anchorX: number;
        /** Vertical anchor in [0,1]. 0.5 = center (default). */
        public anchorY: number;
        /** Blend mode for this sprite. */
        public blendMode: BlendMode;
    }

    /**
     * Sprite sheet animation controller.
     *
     * Holds a dictionary of named clips and drives the active clip's frame
     * counter. Each tick it writes the current frame's region name into the
     * sibling Sprite2D, so the renderer picks it up automatically.
     *
     * Requires a Sprite2D on the same GameObject.
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
         * animation.addClip({
         *     name: "run",
         *     frames: { frameWidth: 32, frameHeight: 32, count: 6, offsetY: 64 },
         *     fps: 12,
         *     loop: AnimationLoopMode.Loop
         * });
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
     * Reads the world position from the sibling Transform2D, converts to
     * normalised screen coordinates using the active camera, and pushes
     * shockwave effects into the DistortionStage in the render pipeline.
     */
    export class Distortion2D extends Component {
        /** Expansion rate of the shockwave ring in UV/sec. */
        public speed: number;
        /** Width of the distortion band. */
        public thickness: number;
        /** Peak displacement strength. */
        public amplitude: number;
        /** Auto-remove threshold. Wave is discarded when radius exceeds this. */
        public maximumRadius: number;
        /** If true, a shockwave fires automatically when the component is attached. */
        public autoStart: boolean;

        /**
         * Fire a shockwave from the current world position.
         * Each call creates an independent wave — safe to call multiple times.
         */
        trigger(): void;
    }

    /**
     * A 2D light source.
     *
     * Contributes per-pixel lighting in the LightingPass, optionally
     * casting shadows through the ShadowmapPass when castsShadows is
     * true and a ShadowmapPass is installed in the pipeline. Sample
     * pixels are evaluated in light-relative world space; position
     * is read from the sibling Transform2D each frame.
     *
     * Three light types behave differently:
     *   - Point: omnidirectional, attenuates with distance over range.
     *   - Spot: cone-shaped, uses directionDegrees + cone angles.
     *   - Directional: infinitely-distant parallel light, like the sun.
     *
     * Optional features layered on top:
     *   - Animation envelopes (Flicker, Pulse, Strobe, Custom) modulate
     *     intensityModulator each frame.
     *   - Shadow casting writes per-light occluder distance to the
     *     shadow atlas; the lighting pass samples with PCF.
     *   - Cookies project an image onto the light's contribution (the
     *     Bat-Signal effect, stained glass, projector patterns).
     *
     * Performance: lights are CPU-binned into 16x16 pixel tiles each
     * frame, so the per-pixel light count is typically 4-12 even with
     * hundreds of scene lights. Hard caps: 256 simultaneous lights,
     * 256 shadow-casting lights, 32 unique cookies, 32 lights per tile.
     *
     * @example
     *   // Flickering torch with soft shadows
     *   const torch = new GameObject("Torch")
     *       .addComponent(Transform2D, { positionX: 300, positionY: 300 })
     *       .addComponent(Light2D, {
     *           type: LightType.Point,
     *           color: 0xFF8C2EFF,
     *           intensity: 2.8,
     *           range: 260,
     *           castsShadows: true,
     *           shadowSoftness: 2.0,
     *           envelope: LightEnvelope.Flicker,
     *           envelopeAmplitude: 0.2,
     *           envelopeFrequency: 6.0,
     *       });
     */
    export class Light2D extends Component {
        /** Light source kind. See LightType. */
        public type: LightType;

        /**
         * Packed 0xRRGGBBAA colour of the light, matching Mesh2D.color.
         * The alpha byte is ignored on assignment (Light2D has no alpha
         * channel) and always reads back as 0xFF.
         *
         * For HDR colours where channels need to exceed 1.0
         * (overbright sources, magical glow), set colorR/G/B
         * individually — packed bytes can only represent the 0..1
         * range.
         *
         * Reading `color` is lossy: HDR values written through
         * colorR/G/B are clamped to [0, 1] before serialisation.
         */
        public color: number;

        /** Red channel of the light's linear-RGB colour. HDR values >1 are valid. */
        public colorR: number;
        /** Green channel of the light's linear-RGB colour. */
        public colorG: number;
        /** Blue channel of the light's linear-RGB colour. */
        public colorB: number;

        /**
         * Scalar multiplier on color. Animation envelopes modulate
         * intensityModulator each frame without changing this; scripts
         * that want to fade a light should write `intensity` directly.
         */
        public intensity: number;

        /** Pixel radius at which falloff reaches zero. Ignored for directional lights. */
        public range: number;

        /**
         * Falloff exponent. 1.0 = linear, 2.0 = quadratic (physically
         * accurate inverse-square). Higher values produce a sharper
         * falloff edge.
         */
        public falloff: number;

        /** Spot inner cone half-angle in degrees. Inside this cone the intensity is full. */
        public innerConeAngle: number;
        /** Spot outer cone half-angle in degrees. Between inner and outer, smoothstep falloff. */
        public outerConeAngle: number;

        /**
         * Direction for spot / directional lights, expressed as an
         * angle in degrees (0 = +X, 90 = +Y). For directional lights
         * this is the direction light is travelling, not where the
         * light is "looking".
         */
        public directionDegrees: number;

        /**
         * Whether this light writes to the shadow atlas. Requires a
         * ShadowmapPass in the pipeline. Shadow slots are assigned
         * per-frame; lights beyond the slot cap (256) render
         * unshadowed for that frame.
         */
        public castsShadows: boolean;

        /**
         * PCF kernel radius multiplier for this light's shadow sampling.
         * 1.0 = renderer default; larger values soften the shadow edge
         * (diffuse sources, fog), smaller values sharpen it (focused
         * flashlights). Nominal range [0, ~5]; 0 produces effectively
         * hard shadows.
         */
        public shadowSoftness: number;

        /**
         * Animation envelope. Drives intensityModulator each frame
         * (except Custom, which is script-driven). See LightEnvelope.
         */
        public envelope: LightEnvelope;
        /** Envelope swing amount in [0, 1]. 0.0 = no swing, 1.0 = full swing. */
        public envelopeAmplitude: number;
        /** Envelope cycle rate in Hz. */
        public envelopeFrequency: number;
        /** Envelope phase offset in seconds. Use to desync identical lights. */
        public envelopePhase: number;

        /**
         * Per-frame intensity modulator written by the envelope.
         * Multiplied with `intensity` at GPU upload time. Scripts
         * running a Custom envelope write this field directly each
         * frame. Values nominally in [0, 1]; engine envelopes never
         * exceed 1.0.
         */
        public intensityModulator: number;

        /**
         * Path to the cookie / gobo image in the asset pack VFS.
         * Empty string = no cookie. Loaded lazily on first use into
         * a slot-based atlas; up to 32 unique cookies can be resident
         * simultaneously (FIFO eviction beyond that).
         *
         * Sampled in light-relative world space: the light's position
         * maps to the cookie's centre (UV 0.5, 0.5), the light's range
         * maps to the cookie's edges (UV 0 and 1).
         */
        public cookiePath: string;
        /** Horizontal cookie UV offset. Animate over time for scrolling cookies. */
        public cookieUVOffsetX: number;
        /** Vertical cookie UV offset. */
        public cookieUVOffsetY: number;
        /** Horizontal cookie UV scale. Values >1 tile the cookie within the slot. */
        public cookieUVScaleX: number;
        /** Vertical cookie UV scale. */
        public cookieUVScaleY: number;

        /**
         * Reset the envelope's internal phase clock to zero. Useful
         * for "alarm triggers at this exact moment" — without this,
         * the envelope is mid-cycle when first encountered.
         * No-op for Constant and Custom envelopes.
         */
        resetEnvelope(): void;
    }

    /**
     * An explicit polygonal occluder for the 2D lighting system.
     *
     * Attach alongside a Transform2D to make the owning GameObject
     * cast shadows. The outline is a list of local-space vertices in
     * pixel coordinates; the renderer reads the sibling Transform2D
     * each frame to project these into world space and rasterises
     * shadow segments to the per-light shadow atlas.
     *
     * Authoring conventions
     *
     *   - Vertices are in local pixel space relative to the
     *     GameObject's anchor. (0, 0) is the anchor.
     *   - Order is counterclockwise around the silhouette in screen
     *     space (top-left origin). Reversed winding produces inverted
     *     shadows.
     *   - The outline is implicitly closed — do not repeat the first
     *     vertex at the end.
     *   - Outlines need not be convex. Each edge is rasterised
     *     independently.
     *
     * @example
     *   const wall = new GameObject("Wall")
     *       .addComponent(Transform2D, { positionX: 500, positionY: 300 })
     *       .addComponent(ShadowCaster2D, {
     *           outline: [
     *               { x: -30, y: -50 },
     *               { x:  30, y: -50 },
     *               { x:  30, y:  50 },
     *               { x: -30, y:  50 },
     *           ],
     *       });
     */
    export class ShadowCaster2D extends Component {
        /**
         * Global switch — false skips this caster's contribution
         * without removing it. Useful for "lights-off" cutscenes or
         * for occluders that conditionally appear (a door opening).
         */
        public castsShadow: boolean;

        /**
         * Per-caster softness multiplier. Currently INERT — the field
         * is plumbed through the renderer but has no effect on shadow
         * sampling, which uses per-light softness instead.
         *
         * Reserved for a future per-caster softness path that would
         * store softness alongside occluder distance in a secondary
         * atlas channel.
         */
        public softness: number;

        /**
         * Polygon outline in local-space pixels. Reading returns a
         * fresh array copy; mutate the array and re-assign to update
         * the caster.
         *
         * Entries with non-numeric x/y are silently dropped from the
         * stored outline so partial data doesn't corrupt the buffer.
         */
        public outline: { x: number; y: number }[];
    }

    /**
     * Tangent-space normal map for the sibling Sprite2D.
     */
    export class NormalMap2D extends Component {
        public normalMapPath: string;
        public autoGenerate: boolean;
        public autoStrength: number;
        invalidate(): void;
    }

    /**
     * Plays a sound at the owning GameObject's position.
     *
     * Reads the sibling Transform2D each fixed update and pushes the
     * position to the audio thread via the mixer's voice spatial
     * parameters. Without a sibling Transform2D the source still
     * works but plays at world origin — set `spatial: false` for
     * non-spatial UI sounds in that case.
     *
     * The component owns at most one "current" voice — the one
     * started by `play()` / `autoPlay`. Calling `play()` while
     * another voice is active stops the previous voice with a short
     * fade and starts fresh; this matches how most game engines
     * handle "play this clip" on an already-playing source.
     *
     * For overlapping sounds (footsteps, gunshots, hits) use
     * `playOneShot` — that spawns a one-off voice that plays to
     * completion and is forgotten. The current voice is unaffected.
     *
     * Loading is handled lazily by the engine's SoundCache — first
     * reference to a clip path decodes it; subsequent references on
     * any source share the same decoded buffer.
     *
     * @example
     *   const enemy = new GameObject("Enemy")
     *       .addComponent(Transform2D, { positionX: 5, positionY: 3 })
     *       .addComponent(AudioSource2D, {
     *           clip: "/audio/orc-grunt.wav",
     *           autoPlay: true,
     *           loop: true,
     *           channel: "sfx",
     *           volume: 0.8,
     *           spatial: true,
     *           minimumDistance: 2,
     *           maximumDistance: 30,
     *       });
     */
    export class AudioSource2D extends Component {
        /** Path to the clip in the asset pack VFS (e.g. "/audio/grunt.wav"). */
        public clip: string;

        /** Bus name. Default is "Master". Custom busses are made via audio.createChannel(). */
        public channel: string;

        /** Linear volume in [0, 1]. Multiplied with the channel and master volumes. */
        public volume: number;

        /** Pitch / playback-speed multiplier. 1 = normal, 2 = octave up, 0.5 = octave down. */
        public pitch: number;

        /** Loop the current voice when it reaches the end of the clip. */
        public loop: boolean;

        /** When true, play() is called automatically on attach. */
        public autoPlay: boolean;

        /** When true, the voice is positional (distance attenuation, panning, optional Doppler). */
        public spatial: boolean;

        /** Distance below which the voice plays at full volume. */
        public minimumDistance: number;

        /** Distance beyond which the voice is fully attenuated. */
        public maximumDistance: number;

        /** Attenuation curve steepness. 1 = inverse-distance; smaller is gentler, larger is sharper. */
        public rolloff: number;

        /** When true, pitch shifts based on relative motion between source and listener. */
        public doppler: boolean;

        /** True if the source's current voice is alive in the pool. */
        public readonly isPlaying: boolean;

        /**
         * Start (or restart) the current clip. If a voice is already
         * playing it is stopped with a brief fade and a new voice
         * begins from the start of the clip.
         */
        play(): void;

        /**
         * Stop the current voice with an optional fade-out (seconds).
         * Default fade is 5 ms — short enough to feel instant but
         * long enough to suppress the click of a hard cut.
         */
        stop(fadeOutSeconds?: number): void;

        /** Pause the current voice. */
        pause(): void;

        /** Resume a paused voice. */
        resume(): void;

        /**
         * Spawn a one-shot voice independent of the current voice.
         * Plays to completion at the source's current position with
         * the source's volume, pitch, and spatial settings — but
         * never loops, regardless of `loop`. Does not affect the
         * source's primary voice.
         *
         * `clipOverride` lets a single source play different sounds
         * without changing its `clip` field; useful for footstep
         * variants or impact sound banks.
         */
        playOneShot(clipOverride?: string): void;

        /**
         * Spawn a one-shot at a specific world position rather than
         * the source's own position. Lets a single "world FX manager"
         * GameObject trigger sounds anywhere.
         */
        playOneShotAt(positionX: number, positionY: number, clipOverride?: string): void;
    }

    /**
     * Marks a GameObject as the "ear" of the audio scene.
     *
     * Each fixed update the listener pushes a snapshot of its sibling
     * Transform2D's position into the audio mixer. AudioSource2D
     * voices use this snapshot to compute distance attenuation,
     * panning, and Doppler.
     *
     * Only one listener is allowed at a time. Attaching a second
     * AudioListener2D logs a warning and the second component
     * becomes dormant — it stays attached but contributes nothing
     * — until the first is destroyed. There is no automatic
     * promotion of the dormant listener; if you want a different
     * GameObject to be the listener, destroy the existing
     * AudioListener2D first and attach a new one.
     *
     * Typical placement is on the camera GameObject so audio
     * follows the player's view, but you can attach it to the
     * player itself for first-person-perspective audio, or to a
     * stationary scene marker for a fixed-camera game.
     *
     * @example
     *   const cam = new GameObject("Camera")
     *       .addComponent(Transform2D)
     *       .addComponent(Camera2D, { zoom: 32, isActive: true })
     *       .addComponent(AudioListener2D);
     */
    export class AudioListener2D extends Component {
        /**
         * Master gain applied to everything the listener "hears".
         * Multiplied with channel and voice volumes at mix time.
         * Useful for global audio fades that affect everything
         * regardless of which channel it's on.
         */
        public gain: number;
    }

    /**
     * Body type for Rigidbody2D.
     *
     * - "static"    — never moves, infinite mass; use for level geometry.
     * - "dynamic"   — fully simulated; gravity, forces, and contacts apply.
     * - "kinematic" — moves only when you set its velocity or pose
     *                 directly; ignores gravity and forces. Useful for
     *                 platforms that follow a script-controlled path.
     */
    export type Rigidbody2DType = "static" | "dynamic" | "kinematic";

    /**
     * 2D rigid-body dynamics, backed by Box2D v3.
     *
     * The body is created in the physics world when the component is
     * attached. Pose (positionX/Y, rotation) and velocity are kept in
     * sync with the sibling Transform2D each fixed step — when a
     * Rigidbody2D is present, it owns the transform.
     *
     * Forces and impulses are applied immediately and consumed at the
     * start of the next physics step. Setting velocity, position, or
     * rotation directly bypasses the integrator (no synthetic impulse).
     *
     * Sibling colliders (BoxCollider2D, CircleCollider2D, …) attach
     * their shapes to this body. A collider without a sibling
     * Rigidbody2D auto-creates a hidden static body so static level
     * geometry can be authored without explicitly adding a body
     * component.
     */
    export class Rigidbody2D extends Component {
        /** Body type — assigning rebuilds the body on the C++ side. */
        public type: Rigidbody2DType;
        /** Lock rotation around the z axis. */
        public fixedRotation: boolean;
        /** Mark as a fast-moving body for continuous collision detection. */
        public isBullet: boolean;
        /** Linear velocity damping (1/time). 0 = none. */
        public linearDamping: number;
        /** Angular velocity damping (1/time). 0 = none. */
        public angularDamping: number;
        /** Multiplier on world gravity. 0 = floats; -1 = inverted. */
        public gravityScale: number;
        /** Whether the body is allowed to sleep when at rest. */
        public allowSleep: boolean;

        /** World-space X position in pixels. Setting teleports the body. */
        public positionX: number;
        /** World-space Y position in pixels. Setting teleports the body. */
        public positionY: number;
        /** World rotation in degrees. Setting teleports the body. */
        public rotation: number;

        /** Linear velocity X in pixels/sec. */
        public velocityX: number;
        /** Linear velocity Y in pixels/sec. */
        public velocityY: number;
        /** Angular velocity in degrees/sec. */
        public angularVelocity: number;

        /** Whether the body is currently awake (read/write). */
        public awake: boolean;

        /** Computed mass in kg. Read-only — set density on colliders to change. */
        readonly mass: number;
        /** Computed rotational inertia. Read-only. */
        readonly inertia: number;

        /**
         * Apply a continuous force.
         * Two-arg form applies at the centre of mass; four-arg form
         * applies at a world-space point in pixels.
         */
        applyForce(forceX: number, forceY: number, pointX?: number, pointY?: number): void;

        /** Apply a force at the centre of mass. Identical to applyForce(fx, fy). */
        applyForceToCenter(forceX: number, forceY: number): void;

        /** Apply a torque in degree-newton-meters. */
        applyTorque(torque: number): void;

        /**
         * Apply an instantaneous impulse (mass * velocity).
         * Two-arg form applies at the centre; four-arg form at a world point.
         */
        applyImpulse(impulseX: number, impulseY: number, pointX?: number, pointY?: number): void;

        /** Apply an impulse at the centre of mass. */
        applyImpulseToCenter(impulseX: number, impulseY: number): void;

        /** Apply an angular impulse in degrees/sec * inertia. */
        applyAngularImpulse(impulse: number): void;

        /** Replace the linear velocity outright. */
        setVelocity(velocityX: number, velocityY: number): void;
    }

    /**
     * Per-contact information passed to onCollisionEnter callbacks.
     */
    export interface ContactInfo {
        /** First contact point in world pixels. {0,0} if no contact points. */
        point: { x: number; y: number };
        /** Contact normal pointing from this collider toward the other. */
        normal: { x: number; y: number };
        /** Number of contact points in the manifold (0–2 in 2D). */
        pointCount: number;
    }

    /**
     * Per-hit information passed to onCollisionHit callbacks.
     * Hit events fire only for fast / continuous-collision contacts.
     */
    export interface HitInfo {
        /** Hit point in world pixels. */
        point: { x: number; y: number };
        /** Hit normal. */
        normal: { x: number; y: number };
        /** Closing speed at the moment of impact, m/s. */
        approachSpeed: number;
    }

    /**
     * Common base for all 2D collider components.
     *
     * Material properties (density, friction, restitution, tangentSpeed)
     * apply live to the underlying Box2D shape — assigning to them
     * round-trips through the simulation immediately.
     *
     * Filter bits use the Box2D 64-bit filter scheme. Two shapes collide
     * when (a.categoryBits & b.maskBits) and (b.categoryBits & a.maskBits)
     * are both non-zero. groupIndex overrides the bits: equal positive
     * values always collide, equal negative values never collide.
     *
     * Sensor colliders generate begin/end events but produce no contact
     * impulse — use them for trigger zones, pickup detection, etc.
     *
     * IMPORTANT: shape geometry (BoxCollider2D.sizeX, CircleCollider2D.radius,
     * etc.) is baked into Box2D when the component attaches. Mutating
     * those fields after attach has no effect on the simulation. The
     * material/filter/sensor fields here, by contrast, are live.
     *
     * Note that `isSensor` cannot be flipped post-attach in Box2D v3.1 —
     * setting `isSensor: true` in the addComponent props bag is the
     * supported path.
     */
    export abstract class Collider2D extends Component {
        /** Mass density (kg/m^2). Determines body mass when computed. */
        public density: number;
        /** Coulomb friction coefficient. */
        public friction: number;
        /** Bounciness, 0–1. */
        public restitution: number;
        /** Surface "conveyor belt" tangential speed. */
        public tangentSpeed: number;
        /** When true, the shape is a sensor (no contact response). */
        public isSensor: boolean;

        /** 64-bit category bitmask. Default 0x0001. */
        public categoryBits: number;
        /** 64-bit mask of categories this collider should react to. */
        public maskBits: number;
        /** Override bits. Equal-and-positive: always collide. Equal-and-negative: never. */
        public groupIndex: number;

        /**
         * Fired when two solid colliders begin contact.
         * Set to null/undefined to clear an existing handler.
         */
        public onCollisionEnter: ((other: GameObject, contact: ContactInfo) => void) | null;

        /**
         * Fired when a contact ends.
         * `other` may be null if the other collider was destroyed in
         * the same step that ended the contact — Box2D still emits
         * the end event but the shape id is no longer valid.
         */
        public onCollisionExit: ((other: GameObject | null) => void) | null;

        /**
         * Fired for fast/CCD-relevant contacts. Only triggered when at
         * least one of the bodies has `isBullet = true` and the contact
         * exceeds a closing-speed threshold (Box2D internal).
         */
        public onCollisionHit: ((other: GameObject, hit: HitInfo) => void) | null;

        /**
         * Fired when another collider enters this sensor.
         * `other` is null only in pathological cases (e.g. an exit
         * event for a visitor that was destroyed in the same frame);
         * for begin events `other` is always a live GameObject.
         */
        public onSensorEnter: ((other: GameObject | null) => void) | null;

        /**
         * Fired when another collider leaves this sensor.
         * `other` may be null when the visitor was destroyed in the
         * same step that produced the exit event — Box2D still emits
         * the event but the shape id is no longer valid.
         */
        public onSensorExit: ((other: GameObject | null) => void) | null;
    }

    /**
     * Axis-aligned (or rotated) box-shaped collider.
     * Size is in pixels; angle is in degrees.
     */
    export class BoxCollider2D extends Collider2D {
        public sizeX: number;
        public sizeY: number;
        public offsetX: number;
        public offsetY: number;
        public angle: number;
    }

    /** Circular collider with optional offset from the body origin. */
    export class CircleCollider2D extends Collider2D {
        public radius: number;
        public offsetX: number;
        public offsetY: number;
    }

    /**
     * Capsule (stadium) collider — a swept circle along a segment.
     * Behaves like two circles plus a rectangle, giving smooth contacts
     * at the rounded ends. Use for elongated dynamic bodies (characters,
     * paddles, hitboxes) where the corners would otherwise catch.
     */
    export class CapsuleCollider2D extends Collider2D {
        public pointAX: number;
        public pointAY: number;
        public pointBX: number;
        public pointBY: number;
        public radius: number;
    }

    /**
     * Convex polygon collider, defined by a CCW point list (max 8 verts).
     * Box2D v3 polygons are convex — concave shapes need to be split.
     *
     * The points array is consumed at attach time and baked into the
     * Box2D shape; later assignments to `points` do not affect the
     * already-attached shape (Box2D polygons are immutable). Configure
     * geometry through the addComponent props bag at construction.
     */
    export class PolygonCollider2D extends Collider2D {
        public points: { x: number; y: number }[] | [number, number][];
    }

    /**
     * Single line-segment collider. Use for thin one-off geometry.
     * For multi-segment paths, prefer ChainCollider2D (cleaner contact
     * resolution at vertex seams).
     */
    export class EdgeCollider2D extends Collider2D {
        public pointAX: number;
        public pointAY: number;
        public pointBX: number;
        public pointBY: number;
        /**
         * If true, the edge only collides on one side (Box2D's "ghost"
         * mechanism for one-way platforms).
         */
        public oneSided: boolean;
    }

    /**
     * Multi-segment chain collider, ideal for level geometry where the
     * player's collider would otherwise catch on segment seams.
     *
     * `points` is an array of pixel-space {x,y} pairs. Set `loop: true`
     * to close the chain back to the first point — useful for
     * race-track-style closed boundaries.
     *
     * As with polygons, geometry is baked at attach time.
     */
    export class ChainCollider2D extends Collider2D {
        public points: { x: number; y: number }[] | [number, number][];
        public loop: boolean;
    }

    /**
     * Abstract base for JS-authored game scripts.
     * Scripts query their own transform via gameObject.getComponent(Transform2D).
     */
    export abstract class Behaviour extends Component {
        onStart?(): void;
        onUpdate?(deltaTime: number): void;
        onFixedUpdate?(deltaTime: number): void;
        onDestroy?(): void;

        /** Called when a sibling Collider2D enters contact with another. */
        onCollisionEnter?(other: GameObject, contact: ContactInfo): void;
        /** Called when a sibling Collider2D ends contact. */
        onCollisionExit?(other: GameObject | null): void;
        /** Called for fast (CCD) contacts on a sibling Collider2D. */
        onCollisionHit?(other: GameObject, hit: HitInfo): void;
        /** Called when something enters a sibling sensor Collider2D. */
        onSensorEnter?(other: GameObject | null): void;
        /** Called when something leaves a sibling sensor Collider2D. */
        onSensorExit?(other: GameObject | null): void;
    }

    /** Extracts the writable public properties of a component for use as a config object. */
    type ComponentProperties<T> = {
        [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]?: T[K];
    };

    /** Options for the GameObject constructor. */
    export interface GameObjectProperties {
        /**
         * When true, the engine automatically destroys this object once
         * every component reports idle (e.g. particles expired, animation
         * finished, shockwave fired). Designed for fire-and-forget objects
         * like explosions, laser segments, and one-shot effects.
         */
        destroyWhenIdle?: boolean;
    }

    /**
     * The primary container for all entities in the Bokken engine.
     * Dimension-agnostic — 2D or 3D is determined by which components
     * are attached.
     */
    export class GameObject {
        /**
         * Creates a new entity in the native registry.
         * @param name Optional display name (defaults to "Untitled").
         * @param properties Optional metadata for lifecycle control.
         */
        constructor(name?: string, properties?: GameObjectProperties);

        /** Display name; can be changed at any time. */
        public name: string;

        /**
         * When true, the engine automatically destroys this object once
         * every component reports idle. Can be set after construction.
         */
        public destroyWhenIdle: boolean;

        /**
         * Attaches a component and returns `this` for chaining.
         *
         * For colliders specifically, geometry props in the config object
         * are applied *before* the underlying Box2D shape is built — so
         * `addComponent(BoxCollider2D, { sizeX: 64 })` produces a shape of
         * the right size from the very first physics step. Mutating those
         * geometry props on a returned component after attach has no
         * effect on the simulation; configure geometry here.
         *
         * @example
         * const player = new GameObject("Player")
         *     .addComponent(Transform2D, { positionX: 5, positionY: 3 })
         *     .addComponent(Sprite2D, { texturePath: "/textures/knight.png" })
         *     .addComponent(Animation2D)
         *     .addComponent(Rigidbody2D, { type: "dynamic", fixedRotation: true })
         *     .addComponent(CircleCollider2D, { radius: 0.5, density: 1 });
         */
        addComponent<T extends Component>(componentClass: new () => T, props?: ComponentProperties<T>): this;

        /**
         * Retrieves an attached component by type.
         * @returns The component instance if found, otherwise undefined.
         */
        getComponent<T extends Component>(componentClass: new () => T): T | undefined;

        /** Sets the parent of this object in the scene hierarchy. */
        setParent(parent: GameObject | null): void;

        /** Returns all immediate child GameObjects. */
        getChildren(): GameObject[];

        /** Flags the entity for destruction at the end of the frame. */
        static destroy(obj: GameObject): void;

        /** Finds the first GameObject with the given name. O(1) via hash map. */
        static find(name: string): GameObject | undefined;
    }
}
