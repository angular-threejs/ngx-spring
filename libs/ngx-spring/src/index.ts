/*
 * Public API Surface of ngx-spring (core)
 */

// Types
export type {
	Animatable,
	AnimatablePrimitive,
	AnimatableValue,
	AnimationResult,
	AsyncResult,
	EasingFunction,
	Lookup,
	OnChange,
	OnDestroyed,
	OnPause,
	OnProps,
	OnResolve,
	OnRest,
	OnResume,
	OnStart,
	SpringConfig,
	SpringEventProps,
	SpringFromTo,
	SpringGetter,
	SpringGetters,
	SpringOptions,
	SpringProps,
} from './lib/types';

// Config presets
export { config, defaults } from './lib/config';

// Easing functions
export { clamp, easings, steps, type Direction } from './lib/easing';

// Core classes
export { SpringValue, type SpringValueObserver } from './lib/spring-value';

// SpringRef interface
export type {
	AnySpringRef,
	SpringRef,
	SpringStartProps,
} from './lib/spring-ref';

// Frame loop
export { frameLoop, type OpaqueAnimation } from './lib/frame-loop';
