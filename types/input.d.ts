declare module "bokken/input" {
    /**
     * A read-only 2D vector returned from input queries.
     *
     * The components are immutable snapshots of the engine's state
     * at the moment the query was made — mutating these would have
     * no effect, so they're marked `readonly` to surface that at
     * compile time.
     */
    interface Vector2 {
        readonly x: number;
        readonly y: number;
    }

    /**
     * Mouse-button identifier accepted by `isMouseDown`,
     * `isMousePressed`, and `isMouseReleased`.
     *
     *     0 — primary (typically left)
     *     1 — middle (the wheel button)
     *     2 — secondary (typically right)
     *
     * Higher indices map to extra side-buttons on multi-button mice
     * and are platform-dependent; treat anything beyond 2 as
     * unportable.
     */
    type MouseButton = 0 | 1 | 2 | number;

    /**
     * Keyboard / mouse polling API.
     *
     * State updates once per frame at the top of the engine tick;
     * `isKeyPressed` / `isKeyReleased` and the mouse equivalents
     * return true on exactly one frame — the frame the transition
     * was observed. `isKeyDown` and `isMouseDown` are level
     * triggers and stay true for the whole duration the button is
     * held.
     *
     * @example
     *     import Input from "bokken/input";
     *
     *     if (Input.isKeyPressed("Space")) jump();
     *     if (Input.isKeyDown("KeyA")) moveLeft();
     *
     *     const { x, y } = Input.getMousePosition();
     *     if (Input.isMousePressed(0)) shoot(x, y);
     */
    interface Input {
        /**
         * Returns true while the key is held down.
         *
         * @param key Key name — either web-standard
         *            (`"KeyW"`, `"ArrowUp"`, `"Space"`,
         *            `"ShiftLeft"`) or the SDL-native short form
         *            (`"W"`, `"Up"`, `"Space"`, `"F1"`). Names are
         *            case-sensitive.
         */
        isKeyDown(key: string): boolean;

        /**
         * Returns true only on the frame the key transitioned
         * from up to down. Use for "fire once per press" actions
         * like jumping, dashing, or opening a menu.
         */
        isKeyPressed(key: string): boolean;

        /**
         * Returns true only on the frame the key transitioned
         * from down to up.
         */
        isKeyReleased(key: string): boolean;

        /**
         * Returns the current mouse position in OS-logical window
         * coordinates (the same space SDL mouse events arrive in).
         * Map to render-space with `Window.windowToRender()`
         * before hit-testing scene objects.
         */
        getMousePosition(): Vector2;

        /**
         * Returns true while the mouse button is held.
         *
         * @param button See `MouseButton` for the index→button
         *               mapping. `0` is left, `1` is middle, `2`
         *               is right.
         */
        isMouseDown(button: MouseButton): boolean;

        /**
         * Returns true only on the frame the button transitioned
         * from up to down. Use for "click" semantics.
         */
        isMousePressed(button: MouseButton): boolean;

        /**
         * Returns true only on the frame the button transitioned
         * from down to up.
         */
        isMouseReleased(button: MouseButton): boolean;

        /**
         * Returns the scroll wheel delta accumulated during this
         * frame. Both axes report — `y` is the standard vertical
         * wheel, `x` is the horizontal wheel found on some mice
         * and trackpads. A frame with no scroll input returns
         * `{ x: 0, y: 0 }`.
         */
        getScrollDelta(): Vector2;
    }

    const Input: Input;
    export default Input;
}
