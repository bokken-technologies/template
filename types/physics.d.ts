declare module "bokken/physics" {
    import { Rigidbody2D } from "bokken/gameObject";

    /** A 2D vector returned from physics queries. */
    export interface Vector2 {
        x: number;
        y: number;
    }

    /**
     * Opaque handle to a Box2D shape inside the physics world.
     *
     * Returned from queries (overlapAABB, overlapCircle) and embedded
     * in raycast hit results. Treat this as a tag — there's no public
     * API on the shape itself; the engine cleans it up when the owning
     * collider is destroyed. The handle is safe to store across
     * frames as long as the underlying collider lives.
     */
    export interface ShapeHandle {
        readonly __shapeHandle: never;
    }

    /** Result of a raycast or shape cast against the physics world. */
    export interface RaycastHit {
        /** The shape that was hit. */
        shape: ShapeHandle;
        /** Hit point in world pixels. */
        point: Vector2;
        /** Surface normal at the hit point. */
        normal: Vector2;
        /** Hit fraction along the cast in [0, 1]. */
        fraction: number;
    }

    /**
     * Joint type names returned by Joint.type. These match the
     * factory function names below.
     */
    export type JointType =
        | "distance"
        | "revolute"
        | "prismatic"
        | "weld"
        | "mouse"
        | "motor"
        | "wheel"
        | "filter"
        | "unknown";

    /**
     * Live handle to a constraint between two bodies (or one body and
     * the world, in the case of mouse joints). Returned from the
     * factories under `physics.joints.*`.
     *
     * Joints are destroyed automatically when either attached body is
     * destroyed; you can also call destroy() explicitly. Once destroyed,
     * isValid() returns false and motor/limit setters become no-ops.
     *
     * Not every joint type supports every method — calling
     * setMotorSpeed on a distance joint, for instance, is silently
     * ignored. The factory's docs note which fields are meaningful.
     */
    export interface Joint {
        /** Returns the joint's type name. */
        readonly type: JointType;

        /** True if the joint exists in the world (not yet destroyed). */
        isValid(): boolean;

        /** Explicitly destroy the joint. Safe to call multiple times. */
        destroy(): void;

        /** Set angular motor speed in degrees/sec (revolute, wheel). */
        setMotorSpeed(speedDegPerSec: number): void;

        /** Set max motor torque (revolute, wheel). */
        setMaximumMotorTorque(torque: number): void;

        /** Set max motor force (prismatic). */
        setMaximumMotorForce(force: number): void;

        /** Toggle the motor (revolute, prismatic, wheel). */
        enableMotor(enabled: boolean): void;

        /** Toggle the joint limit (revolute, prismatic, wheel). */
        enableLimit(enabled: boolean): void;

        /**
         * Set the joint's lower/upper limit.
         * Units are degrees (revolute) or pixels (prismatic, wheel).
         */
        setLimits(lower: number, upper: number): void;

        /**
         * Set the target position (mouse joint only).
         * Coordinates are in world pixels.
         */
        setTarget(targetX: number, targetY: number): void;
    }

    // Joint parameter objects.
    //
    // All parameters are optional. Anchors and lengths are in world
    // pixels; angles are in degrees. Soft-constraint values (`hertz`,
    // `dampingRatio`) make a joint behave like a spring-damper rather
    // than a rigid constraint — leave at the defaults for rigid.

    export interface DistanceJointParams {
        anchorA?: Vector2;
        anchorB?: Vector2;
        /** Target distance in pixels. Negative = use current pose. */
        length?: number;
        /** Lower-bound length in pixels. 0 disables the lower limit. */
        minimumLength?: number;
        /** Upper-bound length in pixels. Negative = same as length (rigid). */
        maximumLength?: number;
        collideConnected?: boolean;
        /** Soft-constraint spring frequency in Hz. 0 = rigid. */
        hertz?: number;
        dampingRatio?: number;
    }

    export interface RevoluteJointParams {
        /** World-space pivot point in pixels. */
        anchor?: Vector2;
        collideConnected?: boolean;
        enableLimit?: boolean;
        /** Lower angle limit in degrees. */
        lowerAngle?: number;
        /** Upper angle limit in degrees. */
        upperAngle?: number;
        enableMotor?: boolean;
        /** Motor speed in degrees/sec. */
        motorSpeed?: number;
        maximumMotorTorque?: number;
        /** Reference angle (the "zero" angle) in degrees. */
        referenceAngle?: number;
    }

    export interface PrismaticJointParams {
        /** World-space anchor in pixels. */
        anchor?: Vector2;
        /** Translation axis. Need not be unit-length — will be normalised. */
        axis?: Vector2;
        collideConnected?: boolean;
        enableLimit?: boolean;
        /** Lower translation limit in pixels. */
        lowerTranslation?: number;
        /** Upper translation limit in pixels. */
        upperTranslation?: number;
        enableMotor?: boolean;
        /** Motor speed in pixels/sec. */
        motorSpeed?: number;
        maximumMotorForce?: number;
        /** Reference angle in degrees. */
        referenceAngle?: number;
    }

    export interface WeldJointParams {
        anchor?: Vector2;
        collideConnected?: boolean;
        /** Linear soft-constraint frequency. 0 = rigid. */
        linearHertz?: number;
        linearDampingRatio?: number;
        /** Angular soft-constraint frequency. 0 = rigid. */
        angularHertz?: number;
        angularDampingRatio?: number;
    }

    export interface MouseJointParams {
        /** World-space target in pixels. Update this every frame to drag. */
        target?: Vector2;
        /** Maximum pull force. Default 1000. */
        maximumForce?: number;
        /** Spring frequency. Default 5. */
        hertz?: number;
        /** Damping ratio. Default 0.7. */
        dampingRatio?: number;
        collideConnected?: boolean;
    }

    export interface MotorJointParams {
        linearOffset?: Vector2;
        angularOffset?: number;
        maximumForce?: number;
        maximumTorque?: number;
        correctionFactor?: number;
        collideConnected?: boolean;
    }

    export interface WheelJointParams {
        anchor?: Vector2;
        /** Suspension axis (perpendicular to the wheel's rolling direction). */
        axis?: Vector2;
        collideConnected?: boolean;
        enableLimit?: boolean;
        lowerTranslation?: number;
        upperTranslation?: number;
        enableMotor?: boolean;
        motorSpeed?: number;
        maximumMotorTorque?: number;
        /** Suspension spring frequency. Default 1. */
        hertz?: number;
        dampingRatio?: number;
    }

    /**
     * Factory functions for creating constraints between bodies.
     *
     * All factories take two Rigidbody2D arguments (the mouse factory
     * takes one) and an optional params object. They return a Joint
     * handle, or null if the joint could not be created (e.g. either
     * body is missing its Box2D body — likely because it was created
     * outside an active world).
     */
    export interface JointFactories {
        /**
         * Distance joint: keeps two anchor points a fixed distance apart.
         * With `hertz > 0` it behaves like a spring instead of a rigid bar.
         */
        distance(a: Rigidbody2D, b: Rigidbody2D, params?: DistanceJointParams): Joint | null;

        /**
         * Revolute joint: hinge between two bodies at a shared anchor.
         * Optional limits, optional motor.
         */
        revolute(a: Rigidbody2D, b: Rigidbody2D, params?: RevoluteJointParams): Joint | null;

        /**
         * Prismatic joint: bodies translate along a shared axis but
         * cannot rotate relative to each other. Optional limits, motor.
         */
        prismatic(a: Rigidbody2D, b: Rigidbody2D, params?: PrismaticJointParams): Joint | null;

        /**
         * Weld joint: rigidly attaches two bodies. With `linearHertz` /
         * `angularHertz` set, behaves like a soft weld (a "broken" weld
         * with some give).
         */
        weld(a: Rigidbody2D, b: Rigidbody2D, params?: WeldJointParams): Joint | null;

        /**
         * Mouse joint: drags a single body toward a target world point.
         * The classic "click and drag" interaction. Update `target` via
         * setTarget() every frame to follow the cursor.
         */
        mouse(target: Rigidbody2D, params?: MouseJointParams): Joint | null;

        /**
         * Motor joint: drives one body to maintain a relative offset
         * (linearOffset, angularOffset) from another. Used for AI or
         * vehicle steering controllers.
         */
        motor(a: Rigidbody2D, b: Rigidbody2D, params?: MotorJointParams): Joint | null;

        /**
         * Wheel joint: combines a prismatic (suspension) and revolute
         * (rolling) joint, parameterised for vehicle wheels.
         */
        wheel(a: Rigidbody2D, b: Rigidbody2D, params?: WheelJointParams): Joint | null;

        /**
         * Filter joint: disables collision between two specific bodies
         * regardless of their categoryBits/maskBits. Useful for "this
         * specific NPC should pass through this specific wall" cases
         * without burning a category bit.
         */
        filter(a: Rigidbody2D, b: Rigidbody2D): Joint | null;
    }

    /**
     * Default export of the bokken/physics module.
     *
     * The world is a singleton — there's exactly one instance per
     * engine session, set up before any scripts run. All functions on
     * this object operate on it.
     *
     * @example
     * import physics from "bokken/physics";
     *
     * physics.setGravity(0, -18);
     * physics.setMeter(1);
     *
     * const hit = physics.raycastNearest(0, 0, 1, 0, 100);
     * if (hit) console.log("hit at", hit.point.x, hit.point.y);
     */
    interface Physics {
        /** Set the world gravity vector in pixels/sec^2. */
        setGravity(x: number, y: number): void;

        /** Returns the current world gravity vector. */
        getGravity(): Vector2;

        /**
         * Set the meter-to-pixel ratio. Default is 30.
         *
         * Box2D works best when typical object sizes are around 1
         * meter. The meter setting tells the engine how many pixels
         * make up one Box2D meter — change it to match your game's
         * scale (e.g. setMeter(1) for unit-based games where 1 world
         * unit ≈ 1 meter and the camera handles pixel scaling).
         */
        setMeter(pixelsPerMeter: number): void;

        /** Returns the current meter-to-pixel ratio. */
        getMeter(): number;

        /**
         * Set the number of physics sub-steps per fixed update.
         * Default 4. Higher values trade CPU for more stable contacts
         * and tighter constraint resolution; useful for high-speed
         * objects or stiff joint chains.
         */
        setSubSteps(steps: number): void;

        /** Returns the current sub-step count. */
        getSubSteps(): number;

        /**
         * Cast a ray from `origin` along `direction` for up to `maximumDistance`
         * pixels. Returns every shape hit along the ray, sorted by fraction.
         *
         * The optional `mask` filters which categories the ray will
         * hit; the bitmask is matched against each shape's categoryBits.
         * Pass undefined (or omit) to hit everything.
         */
        raycast(
            originX: number, originY: number,
            directionX: number, directionY: number,
            maximumDistance: number,
            mask?: number
        ): RaycastHit[];

        /**
         * Cast a ray and return only the closest hit, or null if nothing
         * was hit within `maximumDistance`. Cheaper than `raycast` when you
         * only need the first contact.
         */
        raycastNearest(
            originX: number, originY: number,
            directionX: number, directionY: number,
            maximumDistance: number,
            mask?: number
        ): RaycastHit | null;

        /**
         * Returns every shape whose AABB overlaps the given pixel-space
         * rectangle (lowerLeft to upperRight).
         */
        overlapAABB(
            lowerX: number, lowerY: number,
            upperX: number, upperY: number,
            mask?: number
        ): ShapeHandle[];

        /** Returns every shape overlapping the given pixel-space circle. */
        overlapCircle(
            centerX: number, centerY: number,
            radius: number,
            mask?: number
        ): ShapeHandle[];

        /**
         * Sweep a circle from `(centerX, centerY)` along `(translateX, translateY)`
         * and return the first shape it hits (or null). Useful for
         * "thick" raycasts and projectile leading-edge tests.
         */
        circleCast(
            centerX: number, centerY: number,
            radius: number,
            translateX: number, translateY: number,
            mask?: number
        ): RaycastHit | null;

        /**
         * Compute the closest distance between two shapes in pixels.
         * Returns -1 if either handle is invalid or the shape type is
         * unsupported.
         */
        distance(a: ShapeHandle, b: ShapeHandle): number;

        /** Joint factories under physics.joints.*. */
        joints: JointFactories;
    }

    const physics: Physics;
    export default physics;
}