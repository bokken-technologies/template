declare module "bokken/window" {
    interface Window {
        /**
         * Returns the current window client area dimensions in
         * **physical** pixels — the resolution the renderer's
         * framebuffer is allocated at and the coordinate space all
         * lighting / shadow / fragment-position math operates in.
         *
         * Geometry that should fill the window (floors, fullscreen
         * backgrounds, viewport-sized meshes) and light positions
         * that should line up with on-screen pixels should be sized
         * from this value.
         */
        getSize(): { width: number; height: number };

        /**
         * Returns the OS-reported logical window size — the value
         * SDL reports without HighDPI scaling applied.
         *
         * Use this for UI layout that should stay constant-size
         * across Retina / HighDPI displays, or to translate mouse
         * cursor coordinates (which are reported in logical pixels)
         * into the physical pixel space the rest of the engine uses:
         *
         *   const mouse     = Input.getMousePosition();                     // logical
         *   const physical  = Window.getSize();                             // physical
         *   const logical   = Window.getLogicalSize();                      // logical
         *   const x         = mouse.x * (physical.width  / logical.width);  // physical
         *   const y         = mouse.y * (physical.height / logical.height); // physical
         */
        getLogicalSize(): { width: number; height: number };

        /** Sets the text displayed in the window's title bar. */
        setTitle(title: string): void;
    }

    const window: Window;
    export default window;
}