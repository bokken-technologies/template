declare module "bokken/log" {
    /**
     * Variadic logging API.
     *
     * Each severity accepts any number of arguments of any type:
     * primitives are stringified normally, plain objects and arrays
     * via `JSON.stringify`, errors via their `toString` (which gives
     * `name: message`). Arguments are joined with spaces and routed
     * to the C++ logger.
     *
     * @example
     *   import Log from "bokken/log";
     *
     *   Log.info("player spawned at", x, y);
     *   Log.debug({ phase: "intro", tick: t });
     *   Log.warning("retry", attempt, "of", max);
     *   Log.error("load failed:", err);
     */
    interface Log {
        /** Detailed diagnostic info. Routed to `SDL_LogDebug`. */
        debug(...args: any[]): void;

        /** Normal application flow. Routed to `SDL_LogInfo`. */
        info(...args: any[]): void;

        /** Non-critical issues. Routed to `SDL_LogWarn` (yellow). */
        warning(...args: any[]): void;

        /** Critical failures. Routed to `SDL_LogError` (red). */
        error(...args: any[]): void;
    }

    const Log: Log;
    export default Log;
}