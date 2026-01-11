/**
 * Core types for ngx-spring
 * Adapted from @react-spring/types and @react-spring/core
 */

// ============================================================================
// Utility Types
// ============================================================================

/** Ensure each type of `T` is an array */
export type Arrify<T> = [T, T] extends [infer T, infer DT]
	? DT extends ReadonlyArray<any>
		? Array<DT[number]> extends DT
			? ReadonlyArray<T extends ReadonlyArray<infer U> ? U : T>
			: DT
		: ReadonlyArray<T extends ReadonlyArray<infer U> ? U : T>
	: never;

/** Override the property types of `A` with `B` and merge any new properties */
export type Merge<A, B> = Remap<
	{ [P in keyof A]: P extends keyof B ? B[P] : A[P] } & Omit<B, keyof A>
>;

/** Try to simplify `&` out of an object type */
export type Remap<T> = {} & {
	[P in keyof T]: T[P];
};

export type OneOrMore<T> = T | readonly T[];

export type Falsy = false | null | undefined;

export interface Lookup<T = any> {
	[key: string]: T;
}

/** Use `[T] extends [Any]` to know if a type parameter is `any` */
export class Any {
	private _!: never;
}

/** Better type errors for overloads with generic types */
export type Constrain<T, U> = [T] extends [Any] ? U : [T] extends [U] ? T : U;

// ============================================================================
// Animatable Types
// ============================================================================

/** Base primitive types that can be animated */
export type AnimatablePrimitive = number | string;

/**
 * All types that can be animated:
 * - Primitives: number, string
 * - Arrays: only flat arrays of primitives
 * - Objects: can nest other animatable values
 */
export type AnimatableValue =
	| AnimatablePrimitive
	| readonly AnimatablePrimitive[]
	| { readonly [key: string]: AnimatableValue };

/**
 * Widens an AnimatableValue to its broader type.
 * - number literals → number
 * - string literals → string
 * - arrays → preserves structure, widens elements
 * - objects → preserves structure, recursively widens values
 *
 * @example
 * Animatable<0> // number
 * Animatable<[0, 0, 0]> // [number, number, number]
 * Animatable<{ x: 0, y: 100 }> // { x: number, y: number }
 * Animatable<{ pos: [0, 0], color: { r: 255 } }> // { pos: [number, number], color: { r: number } }
 */
export type Animatable<T extends AnimatableValue> = T extends number
	? number
	: T extends string
		? string
		: T extends readonly AnimatablePrimitive[]
			? { [K in keyof T]: Animatable<T[K] & AnimatablePrimitive> }
			: T extends object
				? { [K in keyof T]: Animatable<T[K] & AnimatableValue> }
				: never;

// ============================================================================
// Easing Types
// ============================================================================

export type EasingFunction = (t: number) => number;

export type ExtrapolateType = 'identity' | 'clamp' | 'extend';

// ============================================================================
// Interpolation Types
// ============================================================================

export type InterpolatorFn<Input, Output> = (
	...inputs: Arrify<Input>
) => Output;

export interface InterpolatorConfig<Output = AnimatableValue> {
	/**
	 * What happens when the spring goes below its target value.
	 * @default 'extend'
	 */
	extrapolateLeft?: ExtrapolateType;

	/**
	 * What happens when the spring exceeds its target value.
	 * @default 'extend'
	 */
	extrapolateRight?: ExtrapolateType;

	/**
	 * Shortcut to set `extrapolateLeft` and `extrapolateRight`.
	 * @default 'extend'
	 */
	extrapolate?: ExtrapolateType;

	/**
	 * Input ranges mapping the interpolation to the output values.
	 * @default [0,1]
	 */
	range?: readonly number[];

	/**
	 * Output values from the interpolation function.
	 */
	output: readonly Constrain<Output, AnimatableValue>[];

	/**
	 * Transformation to apply to the value before interpolation.
	 */
	map?: (value: number) => number;

	/**
	 * Custom easing to apply in interpolator.
	 */
	easing?: EasingFunction;
}

// ============================================================================
// Spring Config Types
// ============================================================================

/**
 * Configuration for spring physics
 */
export interface SpringConfig {
	/**
	 * With higher tension, the spring will resist bouncing and try harder to stop at its end value.
	 * When tension is zero, no animation occurs.
	 * @default 170
	 */
	tension?: number;

	/**
	 * Higher friction means the spring will slow down faster.
	 * @default 26
	 */
	friction?: number;

	/**
	 * The natural frequency (in seconds), which dictates the number of bounces
	 * per second when no damping exists.
	 */
	frequency?: number;

	/**
	 * The damping ratio, which dictates how the spring slows down.
	 * Set to `0` to never slow down. Set to `1` to slow down without bouncing.
	 * Only works when `frequency` is defined.
	 * @default 1
	 */
	damping?: number;

	/**
	 * Higher mass means more friction is required to slow down.
	 * @default 1
	 */
	mass?: number;

	/**
	 * The initial velocity of one or more values.
	 * @default 0
	 */
	velocity?: number | number[];

	/**
	 * The smallest velocity before the animation is considered "not moving".
	 */
	restVelocity?: number;

	/**
	 * The smallest distance from a value before that distance is essentially zero.
	 * @default 0.01
	 */
	precision?: number;

	/**
	 * For `duration` animations only.
	 * Defaults to `0`, which means "start from the beginning".
	 */
	progress?: number;

	/**
	 * Animation length in number of milliseconds.
	 */
	duration?: number;

	/**
	 * The animation curve. Only used when `duration` is defined.
	 */
	easing?: EasingFunction;

	/**
	 * Avoid overshooting by ending abruptly at the goal value.
	 * @default false
	 */
	clamp?: boolean;

	/**
	 * When above zero, the spring will bounce instead of overshooting.
	 */
	bounce?: number;

	/**
	 * "Decay animations" decelerate without an explicit goal value.
	 * @default false
	 */
	decay?: boolean | number;

	/**
	 * While animating, round to the nearest multiple of this number.
	 */
	round?: number;
}

// ============================================================================
// Animation Result Types
// ============================================================================

/** The object given to the `onRest` prop and `start` promise. */
export interface AnimationResult<T = any> {
	value: T;
	/** When true, no animation ever started. */
	noop?: boolean;
	/** When true, the animation was neither cancelled nor stopped prematurely. */
	finished?: boolean;
	/** When true, the animation was cancelled before it could finish. */
	cancelled?: boolean;
}

/** The promised result of an animation. */
export type AsyncResult<T = any> = Promise<AnimationResult<T>>;

// ============================================================================
// Event Handler Types
// ============================================================================

/** Called when an animation starts moving */
export type OnStart<T = any> = (
	result: AnimationResult<T>,
	spring: any,
	item?: any,
) => void;

/** Called when a spring value changes */
export type OnChange<T = any> = (
	result: AnimationResult<T>,
	spring: any,
	item?: any,
) => void;

/** Called when all animations come to rest */
export type OnRest<T = any> = (
	result: AnimationResult<T>,
	spring: any,
	item?: any,
) => void;

/** Called after props are applied */
export type OnProps<T = any> = (props: any, spring: any) => void;

/** Called when animation is paused */
export type OnPause<T = any> = (
	result: AnimationResult<T>,
	spring: any,
	item?: any,
) => void;

/** Called when animation is resumed */
export type OnResume<T = any> = (
	result: AnimationResult<T>,
	spring: any,
	item?: any,
) => void;

/** Called when the promise for this update is resolved */
export type OnResolve<T = any> = (
	result: AnimationResult<T>,
	spring: any,
	item?: any,
) => void;

/** Called when a spring is destroyed */
export type OnDestroyed = (spring: any, item?: any) => void;

/** All event props */
export interface SpringEventProps<T = any> {
	onStart?: OnStart<T>;
	onChange?: OnChange<T>;
	onRest?: OnRest<T>;
	onProps?: OnProps<T>;
	onPause?: OnPause<T>;
	onResume?: OnResume<T>;
	onResolve?: OnResolve<T>;
	onDestroyed?: OnDestroyed;
}

// ============================================================================
// Spring Props Types
// ============================================================================

/** For props that can be set on a per-key basis */
export type MatchProp<T> =
	| boolean
	| OneOrMore<string & keyof T>
	| ((key: string & keyof T) => boolean);

/** Loop configuration */
export type LoopProp<T extends object> = boolean | T | (() => boolean | T);

/**
 * Animation props shared between SpringValue and Controller
 */
export interface AnimationProps<T = any> {
	/**
	 * Configure the spring behavior.
	 */
	config?: SpringConfig | ((key: string) => SpringConfig);

	/**
	 * Milliseconds to wait before applying the other props.
	 */
	delay?: number | ((key: string) => number);

	/**
	 * When true, props jump to their goal values instead of animating.
	 */
	immediate?: MatchProp<T>;

	/**
	 * Cancel animations.
	 */
	cancel?: MatchProp<T>;

	/**
	 * Pause animations.
	 */
	pause?: MatchProp<T>;

	/**
	 * Start the next animations at their values in the `from` prop.
	 */
	reset?: MatchProp<T>;

	/**
	 * Swap the `to` and `from` props.
	 */
	reverse?: boolean;
}

/**
 * Props for spring animations
 */
export interface SpringProps<T = any>
	extends AnimationProps<T>, SpringEventProps<T> {
	/**
	 * Starting values
	 */
	from?: T;

	/**
	 * Target values
	 */
	to?: T;

	/**
	 * Loop the animation
	 */
	loop?: LoopProp<SpringProps<T>>;
}

// ============================================================================
// Internal Types
// ============================================================================

/** @internal */
export interface Readable<T = any> {
	get(): T;
}

/** @internal */
export interface AnimationRange<T> {
	to: T | undefined;
	from: T | undefined;
}

// ============================================================================
// Getter-based Types (Angular-specific)
// ============================================================================

/**
 * A getter function that returns an animatable value.
 * This is the Angular-idiomatic way to create reactive spring values.
 */
export type SpringGetter<T extends AnimatableValue> = () => T;

/**
 * Map of property keys to getter functions.
 * Used with the spring() function for signal-reactive animations.
 */
export type SpringGetters<T extends Record<string, AnimatableValue>> = {
	[K in keyof T]: SpringGetter<T[K]>;
};

/**
 * Options for creating a spring with getters
 */
export interface SpringOptions<T = any> extends SpringEventProps<T> {
	/**
	 * Spring physics configuration
	 */
	config?: SpringConfig;

	/**
	 * Loop the animation
	 */
	loop?: boolean | LoopProp<SpringOptions<T>>;

	/**
	 * Immediately jump to the target value without animating
	 */
	immediate?: boolean;
}

/**
 * From/To style spring configuration
 */
export interface SpringFromTo<T extends Record<string, AnimatableValue>> {
	from?: Partial<SpringGetters<T>>;
	to?: Partial<SpringGetters<T>>;
}
