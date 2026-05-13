declare module "bokken/window" {
    interface WindowSize {
        width:  number;
        height: number;
    }

    interface Point {
        x: number;
        y: number;
    }

    /**
     * How the internal render resolution relates to the window size.
     *
     *   "follow"      — render at the window's physical pixel size.
     *                   Legacy behaviour: the scene reveals more or
     *                   less content as the window grows or shrinks,
     *                   and post-process effects retune per resolution.
     *   "fixed"       — render into an offscreen target of a fixed
     *                   size (typically the game's design resolution).
     *                   The composite blit letter / pillar-boxes that
     *                   target into the window. The visible scene is
     *                   identical at every window size; only the bars
     *                   change.
     *   "fixedHeight" — render at a fixed vertical resolution; the
     *                   horizontal resolution tracks the window aspect
     *                   ratio. The camera reveals more or less content
     *                   sideways but never vertically.
     */
    type RenderMode = "follow" | "fixed" | "fixedHeight";

    type ResizeListener = (size: WindowSize) => void;

    interface Window {
        /**
         * Physical window framebuffer pixels — the raw output surface
         * size. Under the "fixed" render policy this is typically
         * larger than the render size; the final composite blit
         * letter / pillar-boxes the render output into it.
         *
         * Use for tooling / overlay code that cares about the actual
         * window. For positioning sprites and game objects, use
         * getRenderSize() instead.
         */
        getSize(): WindowSize;

        /**
         * OS-reported logical pixels (pre-DPI). Mouse events arrive in
         * this space; use Window.windowToRender() to map cursor
         * coordinates onto the render surface for hit-testing against
         * scene objects.
         */
        getLogicalSize(): WindowSize;

        /**
         * The resolution the rendering pipeline actually draws into.
         * This is the coordinate space sprites, meshes, lights, and
         * particles live in — game logic that cares about "where on
         * the screen did I draw something" should use this.
         *
         * Under "follow" this matches getSize(). Under "fixed" /
         * "fixedHeight" it's the configured render resolution and
         * stays stable as the window resizes.
         */
        getRenderSize(): WindowSize;

        /**
         * Current render-size policy. See RenderMode for the meaning
         * of each value. Reflects whatever setRenderSize() was last
         * called with — or, at startup, the policy the engine seeds
         * from windowBase.width / windowBase.height in the project
         * configuration ("fixed").
         */
        getRenderMode(): RenderMode;

        /**
         * Switch the render-size policy.
         *
         *   width / height — the design resolution to pin (for
         *                    "fixed") or the vertical resolution to
         *                    pin (for "fixedHeight"). Ignored when
         *                    mode is "follow".
         *   mode           — one of "follow", "fixed", "fixedHeight".
         *                    Defaults to "fixed".
         *
         * Returns true on success, false if the dimensions are
         * invalid (zero or negative) for the chosen policy.
         *
         * The new size is staged immediately but actually committed
         * at the start of the next frame, at which point any
         * onResize listeners fire.
         */
        setRenderSize(width: number, height: number, mode?: RenderMode): boolean;

        /**
         * Convert an OS-space cursor coordinate (the kind
         * Input.getMousePosition returns) into render space. Inverts
         * the letterbox / pillarbox blit applied at composite time.
         *
         * Points inside the letterbox bars produce coordinates outside
         * [0..renderW] × [0..renderH] — callers can range-check the
         * result to detect clicks outside the scene rect.
         *
         *     const m = Input.getMousePosition();
         *     const r = Window.windowToRender(m.x, m.y);
         *     // r.x, r.y are now in render-pixel coordinates
         */
        windowToRender(x: number, y: number): Point;

        /**
         * Inverse of windowToRender. Useful for placing native
         * overlays (OS cursors, native pickers) at locations defined
         * in scene coordinates.
         */
        renderToWindow(x: number, y: number): Point;

        /** Sets the text displayed in the window's title bar. */
        setTitle(title: string): void;

        /**
         * Fires when the **render** size changes (not the window
         * size). Under "fixed" a window resize never triggers a
         * render-size change, so listeners see only the events they
         * can legitimately react to — policy switches and (under
         * "fixedHeight" / "follow") aspect-driven render-width
         * changes.
         *
         * Callbacks receive the new render size in render pixels and
         * fire from inside the engine's render step, which means
         * onUpdate for the current frame has already run. Layout
         * changes you make in the handler take effect on the SAME
         * frame's draw (since the handler runs before the scene is
         * painted), but onUpdate logic that depends on the new size
         * won't see it until next frame. If you need the new size
         * inside onUpdate, call getRenderSize() directly from there.
         *
         * A handler registered before the first frame fires once
         * during engine warm-up with the initial render size — so
         * subscribing implicitly tells you what the current size is.
         *
         * @returns An integer id usable with offResize() to
         *          unregister the listener. Registering the same
         *          function twice produces two distinct ids.
         */
        onResize(callback: ResizeListener): number;

        /**
         * Unregisters the listener with the given id. Returns true
         * if a listener was removed, false if no listener matched.
         */
        offResize(id: number): boolean;
    }

    const Window: Window;
    export default Window;
}
