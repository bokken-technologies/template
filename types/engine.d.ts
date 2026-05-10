declare module "bokken/engine" {
    /**
     * Engine surface — timing primitives, frame stats, and the
     * high-resolution clock. None of these are JS globals; everything
     * is reached through this module.
     *
     * @example
     *   import Engine from "bokken/engine";
     *
     *   const id = Engine.setTimeout(() => doThing(), 250);
     *   Engine.requestAnimationFrame(t => {
     *       console.log("frame", Engine.frameCount, "at", t, "ms");
     *   });
     */
    interface Engine {
        /** Engine version string, e.g. `"1.0.0-alpha"`. */
        readonly version: string;

        /** Monotonic frame counter — bumps once per render tick. */
        readonly frameCount: number;

        /** Last frame's delta time in seconds. */
        readonly frameTime: number;

        /** Total seconds since engine init. */
        readonly elapsed: number;

        /**
         * High-resolution timestamp in milliseconds since engine
         * init. Same clock as the RAF callback's `timestamp` argument
         * and `elapsed * 1000`.
         */
        now(): number;

        /**
         * Run a callback once after at least `delayMs` milliseconds.
         * Negative or omitted delay fires on the next tick.
         * @returns A handle for `clearTimeout`.
         */
        setTimeout(callback: () => void, delayMs?: number): number;

        /**
         * Run a callback every `periodMs` milliseconds until cleared.
         * The first fire happens after one period elapses, not
         * immediately. After a frame hitch, missed fires are skipped
         * — matches browser semantics, prevents callback pile-up.
         * @returns A handle for `clearInterval`.
         */
        setInterval(callback: () => void, periodMs?: number): number;

        /** Cancel a pending `setTimeout`. No-op if already fired. */
        clearTimeout(id: number): void;

        /** Cancel a `setInterval`. Safe to call from inside the callback. */
        clearInterval(id: number): void;

        /**
         * Run a callback on the next frame with the current
         * timestamp. Calling `requestAnimationFrame` from inside an
         * RAF callback schedules another fire on the *following*
         * frame, not the same one — supports recursive
         * `function loop(t) { rAF(loop); ... }` patterns.
         * @returns A handle for `cancelAnimationFrame`.
         */
        requestAnimationFrame(callback: (timestamp: number) => void): number;

        /** Cancel a pending `requestAnimationFrame`. */
        cancelAnimationFrame(id: number): void;

        /**
         * Run a callback at the end of the current task, before any
         * other macrotask. Equivalent to the WHATWG `queueMicrotask`.
         * No id, no cancel — once queued, the callback runs.
         */
        queueMicrotask(callback: () => void): void;
    }

    const Engine: Engine;
    export default Engine;
}