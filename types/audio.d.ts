/**
 * Type definitions for the `bokken/audio` module.
 *
 * The audio module exposes the engine's mixer, channel graph, and
 * effect catalogue. Playback itself is component-driven via
 * AudioSource2D / AudioListener2D in `bokken/gameObject` — this
 * module covers the global concerns: busses, built-in effects, and
 * the C++-registered custom-effect factory.
 */

declare module "bokken/audio" {

    /** A named bus carrying summed voice output through an effect chain. */
    export interface Channel {
        /** The channel's name. Read-only — set at createChannel(). */
        readonly name: string;

        /** Linear volume in [0, 1]. Read-only; use setVolume() to change. */
        readonly volume: number;

        /** True if the channel is currently silenced. Read-only. */
        readonly muted: boolean;

        setVolume(volume: number): Channel;
        setMuted(muted: boolean): Channel;

        /**
         * Append an effect to the channel's chain. The channel takes
         * ownership of the effect; you do not need to keep a JS
         * reference. Returns the channel for fluent chaining.
         */
        addEffect(effect: Effect): Channel;

        /** Remove a previously-added effect. No-op if not present. */
        removeEffect(effect: Effect): Channel;

        /** Snapshot of the current effect chain in order. */
        getEffects(): Effect[];
    }

    /**
     * Common surface shared by every effect — built-in and
     * registered. Concrete effect types extend this with their own
     * named parameter properties.
     */
    export interface Effect {
        /** When false, the effect is skipped during processing. */
        enabled: boolean;
        bypass(): void;
        enable(): void;
    }

    /** Master gain multiplier on a channel or its post-fx output. */
    export class Gain implements Effect {
        constructor(gain?: number);
        gain: number;
        enabled: boolean;
        bypass(): void;
        enable(): void;
    }

    export class HighPass implements Effect {
        constructor(cutoff?: number, resonance?: number);
        cutoff: number;
        resonance: number;
        enabled: boolean;
        bypass(): void;
        enable(): void;
    }

    export class LowPass implements Effect {
        constructor(cutoff?: number, resonance?: number);
        cutoff: number;
        resonance: number;
        enabled: boolean;
        bypass(): void;
        enable(): void;
    }

    export class Compressor implements Effect {
        constructor(threshold?: number, ratio?: number, attack?: number, release?: number);
        threshold: number;
        ratio: number;
        attack: number;
        release: number;
        enabled: boolean;
        bypass(): void;
        enable(): void;
    }

    export class Delay implements Effect {
        constructor(time?: number, feedback?: number, wet?: number);
        time: number;
        feedback: number;
        wet: number;
        enabled: boolean;
        bypass(): void;
        enable(): void;
    }

    export class Distortion implements Effect {
        constructor(drive?: number, mix?: number);
        drive: number;
        mix: number;
        enabled: boolean;
        bypass(): void;
        enable(): void;
    }

    export class Reverb implements Effect {
        constructor(roomSize?: number, damping?: number);
        roomSize: number;
        damping: number;
        enabled: boolean;
        bypass(): void;
        enable(): void;
    }

    /** The default name of the master bus, available as a constant. */
    export const Master: "Master";

    /**
     * A custom effect — one registered from C++ via
     * Effects::registerEffect<T>(...). The shape isn't statically
     * typed because parameters are determined at registration time;
     * cast to a per-effect interface for full type safety:
     *
     * @example
     *   interface Button extends CustomEffect {
     *       rate: number;
     *       depth: number;
     *   }
     *   const wah = audio.createEffect("Button", { rate: 7 }) as Button | null;
     */
    export interface CustomEffect extends Effect {
        [paramName: string]: any;
    }

    /** The default export — top-level audio module operations. */
    interface AudioModule {
        /** Get the master bus. Always exists. */
        master(): Channel;

        /**
         * Create a new named bus. Volume defaults to 1.0, muted to
         * false. Returns the channel; subsequent lookups via
         * channel(name) return the same instance.
         */
        createChannel(name: string, volume?: number, muted?: boolean): Channel;

        /** Look up a channel by name. Null if absent. */
        channel(name: string): Channel | null;

        /**
         * Spawn an instance of a C++-registered custom effect.
         *
         * @param name           registration name passed to registerEffect
         * @param initialParams  optional override of the registered defaults
         * @returns              the effect, or null if `name` isn't registered
         */
        createEffect(name: string, initialParams?: Record<string, number>): CustomEffect | null;

        /**
         * Returns the names of every C++-registered custom effect.
         * Useful for debug overlays and "did my registration run"
         * checks.
         */
        listEffects(): string[];
    }

    const audio: AudioModule;
    export default audio;
}
