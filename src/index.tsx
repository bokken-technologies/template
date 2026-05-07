import Canvas, { View, Label } from "bokken/canvas";

// Called once when the game starts, before the first frame.
export function onStart() {
    Canvas.render(
        <View>
            <Label style={{padding: 50}}>Hello, World!</Label>
        </View>
    );
}

// Called every frame. deltaTime is the seconds elapsed since the last frame.
export function onUpdate(deltaTime: number) { }

// Called at a fixed timestep (independent of frame rate). Use for physics and deterministic logic.
export function onFixedUpdate(deltaTime: number) { }
