declare module "bokken/scene" {
    import { GameObject } from "bokken/gameObject";

    /**
     * A collection of GameObjects and the hierarchical
     * relationships between them. Only one `Scene` is active at a
     * time in the C++ engine — that's the one being ticked,
     * rendered, and serialized.
     *
     * Scenes are created through the module's `create()` factory
     * rather than `new` because the JS shape is just a handle for
     * the native scene object the engine owns.
     */
    interface Scene {
        /**
         * The unique name of the scene
         * (e.g. `"MainMenu"`, `"Level_01"`). Used as the asset
         * key when persisting and as the lookup key in
         * `loadScene()`.
         */
        readonly name: string;

        /**
         * The root GameObject of the scene. All top-level
         * GameObjects are technically children of this root —
         * walking the tree from here visits everything in the
         * scene.
         */
        readonly root: GameObject;

        /**
         * Serialize every GameObject and Component into a binary
         * blob suitable for saving to disk or shipping as an
         * asset. The returned buffer is consumed by the engine's
         * scene-load path; round-tripping is lossless.
         */
        save(): ArrayBuffer;

        /**
         * Walk every GameObject in the scene depth-first and
         * invoke `callback` for each one. Iteration order is
         * stable across frames; ordering between siblings
         * matches their insertion order under their parent.
         *
         * Mutating the scene from inside the callback
         * (destroying, reparenting) is allowed but doesn't
         * affect the current walk — additions appear in the
         * next call, deletions skip already-visited nodes.
         */
        forEach(callback: (object: GameObject) => void): void;
    }

    /**
     * Global scene-management surface.
     *
     * Handles transitions between scenes, lookup of the currently
     * active scene, and registration of objects that should
     * survive a scene change.
     *
     * @example
     *     import Scene from "bokken/scene";
     *
     *     const main = Scene.create("MainMenu");
     *     Scene.load("MainMenu");
     *     Scene.dontDestroyOnLoad(audioManager);
     */
    interface SceneModule {
        /**
         * Create an empty scene and set it as the active scene.
         * The native scene object is owned by the engine; the
         * returned handle becomes invalid only if the scene is
         * later unloaded.
         */
        create(name: string): Scene;

        /**
         * Load a scene by its registered name or asset path.
         *
         * Loading triggers `onDestroy` for every component in
         * the outgoing scene, then `onStart` for every component
         * in the incoming scene. Objects registered with
         * `dontDestroyOnLoad()` skip the destroy pass and are
         * reparented under the new scene's root.
         */
        load(name: string): void;

        /**
         * Returns the currently active scene — the one being
         * ticked and rendered. Always non-null after engine
         * init.
         */
        getActiveScene(): Scene;

        /**
         * Mark a GameObject as persistent across scene changes.
         * Essential for global managers (audio, input glue,
         * save-game state) and for the player character in
         * games that share one character across levels.
         *
         * Calling this on the same object more than once is a
         * no-op. Calling it on a child reparents the child to
         * the persistent root.
         */
        dontDestroyOnLoad(obj: GameObject): void;
    }

    const Scene: SceneModule;
    export default Scene;
}
