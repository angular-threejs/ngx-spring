/**
 * SpringRef - Reference interface for spring animations
 *
 * This is the interface returned by the spring() function and
 * consumed by directives to apply animated values.
 */

import type { SpringValue } from './spring-value';
import type {
	Animatable,
	AnimatableValue,
	AnimationResult,
	SpringConfig,
} from './types';

/**
 * Helper type to widen all values in a record
 */
export type AnimatableRecord<T extends Record<string, AnimatableValue>> = {
	[K in keyof T]: Animatable<T[K]>;
};

/**
 * Reference to a group of spring values.
 * This is what the spring() function returns and what directives consume.
 */
export interface SpringRef<
	T extends Record<string, AnimatableValue> = Record<string, AnimatableValue>,
> {
	/** Internal spring values keyed by property name */
	readonly values: Map<keyof T, SpringValue<T[keyof T]>>;

	/** Get current value for a specific key (widened type) */
	get<K extends keyof T>(key: K): Animatable<T[K]>;

	/** Get all current values as an object (widened types) */
	getAll(): AnimatableRecord<T>;

	/** Get all property keys */
	keys(): (keyof T)[];

	/** Check if any spring is animating */
	readonly animating: boolean;

	/** Start a new animation */
	start(
		props?: Partial<SpringStartProps<T>>,
	): Promise<AnimationResult<AnimatableRecord<T>>>;

	/** Stop all animations */
	stop(cancel?: boolean): void;

	/** Stop specific animations by key */
	stopKeys(keys: (keyof T)[], cancel?: boolean): void;

	/** Pause all animations */
	pause(): void;

	/** Pause specific animations by key */
	pauseKeys(keys: (keyof T)[]): void;

	/** Resume all animations */
	resume(): void;

	/** Resume specific animations by key */
	resumeKeys(keys: (keyof T)[]): void;

	/** Finish all animations immediately */
	finish(): void;
}

/**
 * Props for starting a spring animation
 */
export interface SpringStartProps<T extends Record<string, AnimatableValue>> {
	/** Target values - accepts widened types (can use getters for signal reactivity) */
	to?: Partial<{
		[K in keyof T]: Animatable<T[K]> | (() => Animatable<T[K]>);
	}>;

	/** Starting values - accepts widened types */
	from?: Partial<{
		[K in keyof T]: Animatable<T[K]> | (() => Animatable<T[K]>);
	}>;

	/** Spring configuration */
	config?: SpringConfig | ((key: keyof T) => SpringConfig);

	/** Skip animation and jump to target */
	immediate?: boolean | ((key: keyof T) => boolean);
}

/**
 * Base type for any SpringRef - used by directives
 */
export type AnySpringRef = SpringRef<any>;
