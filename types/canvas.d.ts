declare module "bokken/canvas" {
    /**
     * Cross-axis alignment values shared by `alignItems` and `alignSelf`.
     *
     * `Stretch` is V2-only and only meaningful on `alignItems` /
     * `alignSelf`; it tells the layout engine to grow the child to fill
     * the container's cross axis. The `Inherit` value on `alignSelf`
     * means "use whatever the parent's `alignItems` says" — that's the
     * default and only exists on `alignSelf`.
     */
    export enum Align {
        Start = "Start",
        Center = "Center",
        End = "End",
    }

    /** V2: cross-axis alignment of all children of a flex container. */
    export enum AlignItems {
        Start = "Start",
        Center = "Center",
        End = "End",
        Stretch = "Stretch",
    }

    /** V2: per-child override of the parent's `alignItems`. */
    export enum AlignSelf {
        Inherit = "Inherit",
        Start = "Start",
        Center = "Center",
        End = "End",
        Stretch = "Stretch",
    }

    /**
     * V2: main-axis distribution of children inside a flex container.
     *
     * Beyond the V1 Start/Center/End, V2 adds the three space modes
     * with the standard CSS semantics:
     *   - SpaceBetween: equal gaps between items, no leading/trailing.
     *   - SpaceAround:  half-size leading/trailing margins.
     *   - SpaceEvenly:  equal-size leading/trailing margins (matches
     *                    the gaps between items).
     */
    export enum Justify {
        Start = "Start",
        Center = "Center",
        End = "End",
        SpaceBetween = "SpaceBetween",
        SpaceAround = "SpaceAround",
        SpaceEvenly = "SpaceEvenly",
    }

    /** Mathematical curves for transition animations. */
    export enum Timing {
        Linear = "Linear",
        EaseIn = "EaseIn",
        EaseOut = "EaseOut",
        EaseInOut = "EaseInOut",
        Bounce = "Bounce",
        Back = "Back",
        Step = "Step",
    }

    /** Direction in which child elements are placed in a container. */
    export enum FlexDirection {
        Row = "Row",
        Column = "Column",
    }

    /** Positioning strategy for calculating element coordinates. */
    export enum Position {
        Relative = "Relative",
        Absolute = "Absolute",
    }

    /** How an element handles content that exceeds its boundaries. */
    export enum Overflow {
        Visible = "Visible",
        Hidden = "Hidden",
    }

    /** V2: horizontal alignment of text inside a Label's content box. */
    export enum TextAlign {
        Left = "Left",
        Center = "Center",
        Right = "Right",
        Justify = "Justify",
    }

    /**
     * V2: pointer style shown when the cursor is over a node.
     *
     * The Canvas module lazily allocates SDL system cursors and swaps
     * them whenever the deepest hovered node's `cursor` differs from
     * the previous frame's choice — no extra cost when nothing's
     * changed.
     */
    export enum Cursor {
        Default = "Default",
        Pointer = "Pointer",
        Text = "Text",
        Move = "Move",
        NotAllowed = "NotAllowed",
        Wait = "Wait",
        ResizeNS = "ResizeNS",
        ResizeEW = "ResizeEW",
        Crosshair = "Crosshair",
    }

    /**
     * Simple Style Sheet (SSS) properties passed to the native layout
     * engine.
     *
     * Colors use the 0xRRGGBBAA hex format. Pixel-or-percent fields
     * (`width`, `height`, `minWidth`, etc.) accept either a number
     * (pixels) or a percentage string ("50%"). Every other numeric
     * field is a plain pixel value.
     *
     * Color fields with the special value `0` (alpha == 0) are treated
     * as "not set" and fall through to the base color — that's how
     * `hoverColor` overrides work without forcing the user to specify
     * a base color too.
     */
    export interface SSSProperties {
        // Layout & Flexbox
        flexDirection?: FlexDirection;
        /** Grow factor along the main axis. 0 = no grow. */
        flex?: number;
        /** V2: shrink factor under tight space. 0 = no shrink. */
        flexShrink?: number;
        /** V2: starting size before flex distribution. */
        flexBasis?: number;
        /** V2: when true, children break onto new main-axis lines. */
        flexWrap?: boolean;
        /**
         * V2: gap between children. `gap` sets both axes;
         * `rowGap` / `columnGap` override the wrap and main axis
         * separately, matching CSS semantics.
         */
        gap?: number;
        rowGap?: number;
        columnGap?: number;

        padding?: number;
        paddingTop?: number;
        paddingBottom?: number;
        paddingLeft?: number;
        paddingRight?: number;

        margin?: number;
        marginTop?: number;
        marginBottom?: number;
        marginLeft?: number;
        marginRight?: number;

        // Positioning
        position?: Position;
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
        zIndex?: number;

        // Sizing
        width?: number | string;
        height?: number | string;
        /** V2: minimum width clamp. Pixel or percent. */
        minWidth?: number | string;
        /** V2: maximum width clamp. Pixel or percent. */
        maxWidth?: number | string;
        /** V2: minimum height clamp. Pixel or percent. */
        minHeight?: number | string;
        /** V2: maximum height clamp. Pixel or percent. */
        maxHeight?: number | string;

        // Text
        font?: string;
        fontSize?: number;
        /** V2: line-height multiplier (1.4 = 140% of font's natural). */
        lineHeight?: number;
        /** V2: extra advance between glyphs in pixels. */
        letterSpacing?: number;
        /** V2: when true and width is fixed, text wraps on whitespace. */
        wordWrap?: boolean;
        /** V2: shorthand to use the bold variant of the active font. */
        fontBold?: boolean;
        /** V2: shorthand to use the italic variant of the active font. */
        fontItalic?: boolean;
        /** V2: horizontal alignment of text inside a Label. */
        textAlign?: TextAlign;

        // Visuals
        backgroundColor?: number;
        color?: number;
        opacity?: number;

        /** Uniform corner radius. Per-corner values override this. */
        borderRadius?: number;
        /** V2: per-corner radii. Override the uniform `borderRadius`. */
        borderTopLeftRadius?: number;
        borderTopRightRadius?: number;
        borderBottomLeftRadius?: number;
        borderBottomRightRadius?: number;

        /** Uniform border width / color. Per-side values override these. */
        borderWidth?: number;
        borderColor?: number;
        /** V2: per-side border widths. */
        borderTopWidth?: number;
        borderBottomWidth?: number;
        borderLeftWidth?: number;
        borderRightWidth?: number;
        /** V2: per-side border colors. */
        borderTopColor?: number;
        borderBottomColor?: number;
        borderLeftColor?: number;
        borderRightColor?: number;

        /**
         * V2: two-stop linear gradient as the background fill. When
         * either color is non-zero-alpha the gradient takes precedence
         * over `backgroundColor`. The angle is in degrees and
         * snaps to the nearest cardinal (0/90/180/270) for batch
         * efficiency — diagonal gradients aren't currently supported.
         */
        gradientStart?: number;
        gradientEnd?: number;
        gradientAngle?: number;

        /**
         * V2: asset-pack path to a background image. Drawn under the
         * background color. For Image components, use the `src` prop
         * instead — this field is for backgrounds on regular Views.
         */
        backgroundImage?: string;

        /**
         * V2: drop shadow. Rendered when alpha is non-zero AND any of
         * blur/offset is non-zero. The blur uses a soft 9-slice LUT
         * baked at 32px radius — larger blurs clip rather than scale.
         */
        shadowColor?: number;
        shadowOffsetX?: number;
        shadowOffsetY?: number;
        shadowBlur?: number;

        overflow?: Overflow;

        // Transform
        /** V2: translate the visual rect after layout. Pixels. */
        translateX?: number;
        translateY?: number;
        /**
         * V2: rotation in degrees around the center. Only honored on
         * solid-rect views with no border radius — rotation on rounded
         * boxes would require per-quad rotation of every emitted
         * sub-quad and isn't currently supported.
         */
        rotation?: number;
        /** V2: scale around the center. Composes with hover/active animation. */
        scaleX?: number;
        scaleY?: number;

        // Alignment
        /**
         * Cross-axis alignment of children. V2 promoted this to the
         * AlignItems enum (which adds Stretch). The Align enum still
         * works because the underlying string values are the same.
         */
        alignItems?: AlignItems | Align;
        /** V2: per-child override of the parent's alignItems. */
        alignSelf?: AlignSelf;
        /**
         * Main-axis distribution. V2 added the SpaceBetween/Around/
         * Evenly variants via the Justify enum. The Align enum still
         * works for the original Start/Center/End values.
         */
        justifyContent?: Justify | Align;

        // Animation & Interaction
        transitionDuration?: number;
        transitionTiming?: Timing;
        hoverScale?: number;
        activeScale?: number;
        /**
         * V2: text/foreground color used when hovered. Alpha == 0 is
         * treated as "not set" — fallthrough to `color`.
         */
        hoverColor?: number;
        /** V2: background color used when hovered. */
        hoverBackgroundColor?: number;
        /** V2: background color used while pressed. */
        activeBackgroundColor?: number;

        // Cursor / focus / disabled
        /** V2: pointer style shown over this node. */
        cursor?: Cursor;
        /**
         * V2: tab order. Negative means not focusable. 0 (the default
         * for Buttons and TextInputs) participates in tab traversal in
         * document order; positive values are visited first in
         * ascending order, then 0s — same rule as the web.
         */
        tabIndex?: number;
        /**
         * V2: when true, the node renders at half opacity, doesn't
         * fire onClick, and skips focus traversal.
         */
        disabled?: boolean;
    }

    /** Shared properties for all visual Canvas components. */
    export interface BaseProperties {
        style?: SSSProperties;
        children?: any;
        /** Stable identity for keyed list reconciliation. */
        key?: string | number;
        // V2 event hooks
        /** Fires once when the cursor first enters this node. */
        onMouseEnter?: () => void;
        /** Fires once when the cursor leaves this node. */
        onMouseLeave?: () => void;
        /** Fires when this node gains focus (via click or Tab). */
        onFocus?: () => void;
        /** Fires when this node loses focus. */
        onBlur?: () => void;
        /** Fires for raw key events while this node is focused. */
        onKey?: (scancode: number, pressed: boolean) => void;
    }

    /** Properties for the Label (text display) component. */
    export interface LabelProperties extends BaseProperties {
        children?: string | number | (string | number)[];
    }

    /** Properties for the View (container) component. */
    export interface ViewProperties extends BaseProperties {
        onClick?: () => void;
    }

    /**
     * V2: Image component properties. The `src` is an asset-pack path
     * resolved through the engine's TextureCache. Sizing rules:
     *   - both width and height set → image stretches to fill
     *   - one set → other derived from intrinsic aspect ratio
     *   - neither set → image renders at native pixel size
     *
     * Rounded raster images need an `overflow: Hidden` parent with the
     * same `borderRadius` for pixel-perfect clipping.
     */
    export interface ImageProperties extends BaseProperties {
        src: string;
    }

    /**
     * V2: Button component properties. Button is a semantic alias for
     * View with sensible interaction defaults applied at parse time:
     * `cursor: Pointer`, `tabIndex: 0`, `hoverScale: 1.02`,
     * `activeScale: 0.96`, and a 0.12s `EaseOut` transition. Every
     * default can be overridden via `style`.
     */
    export interface ButtonProperties extends BaseProperties {
        onClick?: () => void;
    }

    /**
     * V2: ScrollView component properties. The container forces
     * `overflow: Hidden`. Children outside the content rect are clipped
     * via the SpriteBatcher's scissor stack. Mouse wheel events are
     * routed to the deepest ScrollView under the cursor.
     *
     * `onScroll` fires on every wheel-induced offset change with the
     * post-clamp scrollX/Y.
     */
    export interface ScrollViewProperties extends BaseProperties {
        onScroll?: (scrollX: number, scrollY: number) => void;
    }

    /**
     * V2: TextInput component properties.
     *
     * Caret movement is UTF-8 codepoint-safe. SDL text input is started
     * automatically when this node gains focus and stopped on blur, so
     * IME / dead-key handling works out of the box. `onChange` fires on
     * every keystroke that mutates the value (including Backspace and
     * Delete), and once more on Enter so consumers can treat it as a
     * "submit" signal.
     *
     * Selection is not implemented in this version — only caret +
     * insert/delete. Long values truncate at the right padding edge
     * rather than horizontally scrolling.
     */
    export interface TextInputProperties extends BaseProperties {
        /** Current value. Treated as the React-style controlled prop. */
        value?: string;
        /** Text shown at half opacity when value is empty. */
        placeholder?: string;
        /** Fires on every keystroke and on Enter. */
        onChange?: (value: string) => void;
    }

    /** String tag for View components, used by createElement. */
    export const View: string;
    /** String tag for Label components, used by createElement. */
    export const Label: string;
    /** V2: string tag for Image components. */
    export const Image: string;
    /** V2: string tag for Button components. */
    export const Button: string;
    /** V2: string tag for ScrollView components. */
    export const ScrollView: string;
    /** V2: string tag for TextInput components. */
    export const TextInput: string;

    /**
     * Hook to manage local state within a functional component.
     * Triggers a re-render of the Canvas tree when the setter is called.
     */
    export function useState<T>(initialValue: T): [T, (newValue: T | ((prev: T) => T)) => void];

    /**
     * Hook to perform side effects within a functional component.
     *
     * The effect callback runs after the component mounts. If it
     * returns a function, that cleanup function runs when the
     * component unmounts (and before the effect re-runs, when the
     * dependency array indicates a re-run is needed).
     *
     * The dependencies array controls when the effect re-runs:
     *   - Omitted: effect runs after every render.
     *   - Empty array []: effect runs once on mount, cleanup on unmount.
     *   - Non-empty: effect re-runs whenever any element in dependencies
     *     differs (by reference or primitive equality) from the
     *     previous render's dependencies.
     */
    export function useEffect(
        effect: () => void | (() => void),
        dependencies?: ReadonlyArray<unknown>
    ): void;

    /** The default export contains the JSX factory and render entry point. */
    interface CanvasDefault {
        /**
         * JSX factory. Transforms JSX syntax into internal element trees.
         * Set as the jsxFactory in your tsconfig.
         */
        createElement(type: any, props: any, ...children: any[]): any;

        /**
         * Mounts the root element and starts the reconciliation loop
         * with the native UI layer.
         */
        render(element: any): void;
    }

    const canvas: CanvasDefault;
    export default canvas;

    global {
        namespace JSX {
            interface IntrinsicElements {
                view: ViewProperties;
                label: LabelProperties;
                /** V2: lower-case JSX tag for Image components. */
                image: ImageProperties;
                /** V2: lower-case JSX tag for Button components. */
                button: ButtonProperties;
                /** V2: lower-case JSX tag for ScrollView components. */
                scrollview: ScrollViewProperties;
                /** V2: lower-case JSX tag for TextInput components. */
                textinput: TextInputProperties;
            }
        }
    }
}