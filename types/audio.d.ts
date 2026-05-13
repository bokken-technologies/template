declare module "bokken/audio" {
    /**
     * Common surface shared by every effect — built-in and
     * registered. Concrete effect types extend this with their own
     * named parameter properties (cutoff, gain, drive, etc.).
     *
     * Effects are mutable: assigning to a public parameter takes
     * effect on the next audio block. `enabled` is the cheap
     * "bypass" toggle — when false the effect's process step is
     * skipped entirely, preserving the rest of the chain.
     */
    interface Effect {
        /**
         * When false, the effect is skipped during processing.
         * `bypass()` and `enable()` are shorthand for setting this
         * to false / true respectively.
         */
        enabled: boolean;

        /** Set `enabled = false`. */
        bypass(): void;

        /** Set `enabled = true`. */
        enable(): void;
    }

    /**
     * Master gain multiplier on a channel or its post-fx output.
     * A simple linear-gain stage — values outside [0, ~10] will
     * clip on most output paths but are not clamped by the engine.
     */
    interface Gain extends Effect {
        gain: number;
    }

    /**
     * 2-pole resonant high-pass filter. Useful for thinning a
     * channel ("on the radio" effect) or removing rumble from
     * sub-bass-heavy material.
     */
    interface HighPass extends Effect {
        /** Corner frequency in Hz. */
        cutoff: number;
        /** Q factor. Higher values produce a sharper resonant peak. */
        resonance: number;
    }

    /**
     * 2-pole resonant low-pass filter. The standard "muffled"
     * effect — useful for occlusion (sound through a door) or
     * underwater scenes.
     */
    interface LowPass extends Effect {
        /** Corner frequency in Hz. */
        cutoff: number;
        /** Q factor. Higher values produce a sharper resonant peak. */
        resonance: number;
    }

    /**
     * Single-band dynamic-range compressor. Squashes signal above
     * `threshold` by a factor of `ratio:1`. `attack` and `release`
     * are in milliseconds and shape how quickly the compressor
     * reacts and recovers — short attacks bite transients,
     * longer attacks let them pass before compressing the body.
     */
    interface Compressor extends Effect {
        /** Threshold in dBFS. Values are typically in [-30, 0]. */
        threshold: number;
        /** Compression ratio. 4 means 4:1 above threshold. */
        ratio: number;
        /** Attack time in milliseconds. */
        attack: number;
        /** Release time in milliseconds. */
        release: number;
    }

    /**
     * Single-tap feedback delay. Use small `time` and high
     * `feedback` for a flange/slapback feel; larger `time` (>200
     * ms) for a classic echo.
     */
    interface Delay extends Effect {
        /** Delay time in seconds. */
        time: number;
        /** Feedback amount in [0, 1]. Values near 1 self-oscillate. */
        feedback: number;
        /** Wet-signal mix in [0, 1]. 0 is dry only, 1 is wet only. */
        wet: number;
    }

    /**
     * Soft-clip distortion / saturator. `drive` boosts the input
     * before clipping; `mix` blends the dry signal back in.
     */
    interface Distortion extends Effect {
        /** Pre-clip gain. 1 is unity; values up to ~10 are typical. */
        drive: number;
        /** Wet/dry mix in [0, 1]. */
        mix: number;
    }

    /**
     * Schroeder-style reverb. Cheap by reverb standards; suitable
     * for rooms and small halls rather than cathedral-scale
     * spaces.
     */
    interface Reverb extends Effect {
        /** Perceived room size in [0, 1]. */
        roomSize: number;
        /** High-frequency damping in [0, 1]. */
        damping: number;
    }

    /**
     * A custom effect — one registered from C++ via
     * `Effects::registerEffect<T>(...)`. The shape isn't
     * statically typed because parameters are determined at
     * registration time; cast to a per-effect interface for full
     * type safety:
     *
     * @example
     *     interface Wah extends CustomEffect {
     *         rate: number;
     *         depth: number;
     *     }
     *     const wah = Audio.createEffect("Wah", { rate: 7 }) as Wah | null;
     */
    interface CustomEffect extends Effect {
        [paramName: string]: unknown;
    }

    /**
     * A named bus carrying summed voice output through an effect
     * chain. Channels are created with `audio.createChannel()` and
     * looked up by name with `audio.channel()`.
     *
     * Setters return the channel for fluent chaining:
     *
     * @example
     *     audio.createChannel("music", 0.7)
     *          .addEffect(reverb)
     *          .addEffect(compressor);
     */
    interface Channel {
        /** The channel's name. Set at `createChannel()`; immutable. */
        readonly name: string;

        /**
         * Linear volume in [0, 1]. Updated via `setVolume()`.
         * Values beyond 1 are allowed but will clip on the
         * master output.
         */
        readonly volume: number;

        /** True if the channel is currently silenced. */
        readonly muted: boolean;

        /**
         * Set the channel's linear volume. Values outside [0, 1]
         * are accepted but may clip downstream. Returns the
         * channel for fluent chaining.
         */
        setVolume(volume: number): Channel;

        /**
         * Mute or unmute the channel without altering `volume`.
         * Returns the channel for fluent chaining.
         */
        setMuted(muted: boolean): Channel;

        /**
         * Append an effect to the channel's chain. The channel
         * takes ownership of the effect; you do not need to keep
         * a JS reference to keep it alive. Returns the channel
         * for fluent chaining.
         */
        addEffect(effect: Effect): Channel;

        /**
         * Remove a previously-added effect. No-op if the effect
         * isn't on this channel's chain. Returns the channel for
         * fluent chaining.
         */
        removeEffect(effect: Effect): Channel;

        /**
         * Snapshot of the current effect chain in process order.
         * Mutating the returned array does NOT modify the
         * channel; use `addEffect` / `removeEffect` for that.
         */
        getEffects(): Effect[];
    }

    /**
     * Constructor signatures for the built-in effects. Each
     * factory accepts optional initial parameter values; omitted
     * parameters take engine-defined defaults.
     */
    interface EffectConstructors {
        Gain(gain?: number): Gain;
        HighPass(cutoff?: number, resonance?: number): HighPass;
        LowPass(cutoff?: number, resonance?: number): LowPass;
        Compressor(
            threshold?: number,
            ratio?: number,
            attack?: number,
            release?: number,
        ): Compressor;
        Delay(time?: number, feedback?: number, wet?: number): Delay;
        Distortion(drive?: number, mix?: number): Distortion;
        Reverb(roomSize?: number, damping?: number): Reverb;
    }

    /**
     * Top-level audio module.
     *
     * Playback itself is component-driven via `AudioSource2D` /
     * `AudioListener2D` from `bokken/gameObject` — this module
     * covers the global concerns: busses, the built-in effect
     * catalogue, and access to C++-registered custom effects.
     *
     * @example
     *     import Audio from "bokken/audio";
     *
     *     const music = Audio.createChannel("music", 0.6);
     *     const verb  = Audio.effects.Reverb(0.8, 0.3);
     *     music.addEffect(verb);
     */
    interface Audio {
        /** The canonical name of the master bus. */
        readonly Master: "Master";

        /** Get the master bus. Always exists. */
        master(): Channel;

        /**
         * Create a new named bus. Volume defaults to 1.0, muted
         * to false. Returns the channel; subsequent lookups via
         * `channel(name)` return the same instance.
         */
        createChannel(
            name: string,
            volume?: number,
            muted?: boolean,
        ): Channel;

        /** Look up a channel by name. Null if absent. */
        channel(name: string): Channel | null;

        /**
         * Factory functions for the built-in effects. Each
         * returned object can be passed to
         * `Channel.addEffect()`.
         */
        readonly effects: EffectConstructors;

        /**
         * Spawn an instance of a C++-registered custom effect.
         *
         * @param name           Registration name passed to
         *                       `Effects::registerEffect`.
         * @param initialParams  Optional override of the
         *                       registered defaults.
         * @returns The effect, or null if `name` isn't
         *          registered.
         */
        createEffect(
            name: string,
            initialParams?: Record<string, number>,
        ): CustomEffect | null;

        /**
         * Returns the names of every C++-registered custom
         * effect. Useful for debug overlays and "did my
         * registration run" checks.
         */
        listEffects(): string[];
    }

    const Audio: Audio;
    export default Audio;
}
