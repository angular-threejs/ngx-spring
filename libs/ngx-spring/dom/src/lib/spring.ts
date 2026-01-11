/**
 * @fileoverview DOM spring animations for Angular
 *
 * This module provides the `spring()` function and `Spring` directive for creating
 * reactive spring animations that automatically apply to DOM elements.
 *
 * Inspired by {@link https://www.react-spring.dev/ | react-spring}, adapted for Angular's
 * signal-based reactivity system.
 *
 * @module ngx-spring/dom
 *
 * @example
 * ```typescript
 * // In your component
 * export class MyComponent {
 *   isVisible = signal(false);
 *
 *   // Create reactive spring - automatically animates when isVisible changes
 *   springValues = spring({
 *     opacity: () => this.isVisible() ? 1 : 0,
 *     scale: () => this.isVisible() ? 1 : 0.9,
 *   });
 * }
 * ```
 *
 * ```html
 * <!-- In your template -->
 * <div [spring]="springValues">Animated content</div>
 * ```
 */

import { isPlatformBrowser } from '@angular/common';
import {
	afterRenderEffect,
	assertInInjectionContext,
	computed,
	DestroyRef,
	Directive,
	effect,
	ElementRef,
	inject,
	Injector,
	input,
	PLATFORM_ID,
	runInInjectionContext,
	untracked,
} from '@angular/core';
import {
	type Animatable,
	type AnimatableRecord,
	type AnimatableValue,
	type AnimationResult,
	type AnySpringRef,
	type SpringConfig,
	type SpringEventProps,
	type SpringRef,
	SpringValue,
} from 'ngx-spring';
import {
	buildTransformString,
	getCssPropertyName,
	separateTransformKeys,
} from './transforms';

/**
 * CSS properties that require 'px' units when animated as numbers.
 * @internal
 */
const PX_PROPERTIES = new Set([
	'width',
	'height',
	'top',
	'left',
	'right',
	'bottom',
	'margin',
	'marginTop',
	'marginRight',
	'marginBottom',
	'marginLeft',
	'padding',
	'paddingTop',
	'paddingRight',
	'paddingBottom',
	'paddingLeft',
	'fontSize',
	'borderRadius',
	'borderWidth',
	'gap',
	'rowGap',
	'columnGap',
	'maxWidth',
	'maxHeight',
	'minWidth',
	'minHeight',
]);

/**
 * CSS properties that don't require units (dimensionless values).
 * @internal
 */
const UNITLESS_PROPERTIES = new Set([
	'opacity',
	'zIndex',
	'fontWeight',
	'lineHeight',
	'order',
	'flexGrow',
	'flexShrink',
]);

/**
 * Options for creating a spring animation with the `spring()` function.
 *
 * @example
 * ```typescript
 * spring(values, {
 *   config: config.gentle,
 *   immediate: false,
 *   onChange: (result) => console.log('Value changed:', result.value),
 * });
 * ```
 */
export interface SpringOptions extends SpringEventProps {
	/**
	 * Spring physics configuration.
	 * Use presets from `config` or provide custom tension/friction values.
	 *
	 * @see {@link config} for preset configurations
	 */
	config?: SpringConfig;

	/**
	 * Whether to loop the animation continuously.
	 * @default false
	 */
	loop?: boolean;

	/**
	 * If true, values jump immediately without animation.
	 * @default false
	 */
	immediate?: boolean;

	/**
	 * Injector for dependency injection context.
	 * Required when calling `spring()` outside of an injection context.
	 */
	injector?: Injector;
}

/**
 * Getter-based spring values where each property is a function returning the target value.
 * This pattern enables Angular signal reactivity - when signals used in getters change,
 * the spring automatically animates to the new value.
 *
 * @template T - Record of property names to animatable values
 *
 * @example
 * ```typescript
 * // Each property is a getter function
 * const values: SpringGetterValues<{ opacity: number; x: number }> = {
 *   opacity: () => isVisible() ? 1 : 0,
 *   x: () => position().x,
 * };
 * ```
 */
export type SpringGetterValues<T extends Record<string, AnimatableValue>> = {
	[K in keyof T]: () => T[K];
};

/**
 * Alternative configuration style using explicit `from` and `to` values.
 * Useful when you need to specify different starting values.
 *
 * @template T - Record of property names to animatable values
 *
 * @example
 * ```typescript
 * spring({
 *   from: { opacity: () => 0, y: () => -20 },
 *   to: { opacity: () => isVisible() ? 1 : 0, y: () => isVisible() ? 0 : -20 },
 * });
 * ```
 */
export interface SpringFromToConfig<T extends Record<string, AnimatableValue>> {
	/**
	 * Starting values for the animation.
	 * Each property is a getter function.
	 */
	from?: Partial<SpringGetterValues<T>>;

	/**
	 * Target values for the animation.
	 * Each property is a getter function that will be watched for changes.
	 */
	to?: Partial<SpringGetterValues<T>>;
}

// Track if frame loop is initialized (per platform)
let frameLoopInitialized = false;

/**
 * Initialize the frame loop for browser environment.
 * @internal
 */
function initFrameLoop(injector: Injector): void {
	if (frameLoopInitialized) return;

	const platformId = injector.get(PLATFORM_ID);
	if (!isPlatformBrowser(platformId)) return;

	frameLoopInitialized = true;

	// The frame loop is already managed by rafz
	// No additional initialization needed for DOM
}

/**
 * Create reactive spring animations for DOM element styles.
 *
 * This is the primary API for creating spring animations in Angular. It accepts
 * getter functions that are automatically tracked for signal changes. When any
 * signal used in a getter changes, the spring smoothly animates to the new value.
 *
 * **Supported properties:**
 * - Transform shortcuts: `x`, `y`, `z`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `rotateZ`, `skew`, `skewX`, `skewY`
 * - CSS properties: `opacity`, `width`, `height`, `padding`, `margin`, `fontSize`, etc.
 *
 * @template T - Record of property names to their animatable value types
 *
 * @param values - Object mapping property names to getter functions, or a from/to config
 * @param options - Spring configuration and event callbacks
 * @returns A SpringRef that can be used with the `[spring]` directive
 *
 * @example
 * ```typescript
 * // Basic reactive animation
 * isVisible = signal(false);
 *
 * springValues = spring({
 *   opacity: () => this.isVisible() ? 1 : 0,
 *   scale: () => this.isVisible() ? 1 : 0.9,
 * });
 *
 * // Toggle animation by changing the signal
 * this.isVisible.set(true);  // Animates opacity 0→1, scale 0.9→1
 * ```
 *
 * @example
 * ```typescript
 * // With custom spring physics
 * springValues = spring({
 *   x: () => this.position(),
 * }, {
 *   config: { tension: 300, friction: 20 },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using preset configs
 * import { config } from 'ngx-spring';
 *
 * springValues = spring({
 *   y: () => this.isOpen() ? 0 : -100,
 * }, {
 *   config: config.wobbly,  // Bouncy animation
 * });
 * ```
 *
 * @example
 * ```typescript
 * // From/to style for explicit starting values
 * springValues = spring({
 *   from: { opacity: () => 0, y: () => 20 },
 *   to: { opacity: () => 1, y: () => 0 },
 * });
 * ```
 *
 * @example
 * ```html
 * <!-- Use in template with the Spring directive -->
 * <div [spring]="springValues">Animated content</div>
 * ```
 */
export function spring<T extends Record<string, AnimatableValue>>(
	values: SpringGetterValues<T> | SpringFromToConfig<T>,
	options: SpringOptions = {},
): SpringRef<T> {
	const injector = options.injector;

	// Ensure we're in an injection context
	if (!injector) {
		assertInInjectionContext(spring);
	}

	return runInInjectionContext(injector ?? inject(Injector), () => {
		const currentInjector = inject(Injector);
		const destroyRef = inject(DestroyRef);
		const platformId = inject(PLATFORM_ID);
		const isBrowser = isPlatformBrowser(platformId);

		// Initialize frame loop
		initFrameLoop(currentInjector);

		// Parse values - handle both getter-based and from/to styles
		let getters: SpringGetterValues<T>;
		let fromGetters: Partial<SpringGetterValues<T>> | undefined;

		if ('to' in values || 'from' in values) {
			// From/to style
			const config = values as SpringFromToConfig<T>;
			getters = (config.to ?? {}) as SpringGetterValues<T>;
			fromGetters = config.from;
		} else {
			// Direct getter style
			getters = values as SpringGetterValues<T>;
		}

		const springValues = new Map<keyof T, SpringValue<T[keyof T]>>();
		const keys = Object.keys(getters) as (keyof T)[];

		// Create SpringValue for each property
		for (const key of keys) {
			const getter = getters[key];
			const fromGetter = fromGetters?.[key];

			// Get initial values
			const initialTo = untracked(getter);
			const initialFrom = fromGetter ? untracked(fromGetter) : initialTo;

			const springValue = new SpringValue(initialFrom, options.config);

			// Start animation to initial target
			if (!options.immediate && initialFrom !== initialTo) {
				springValue.start({
					to: initialTo as unknown as Animatable<T[keyof T]>,
				});
			} else if (options.immediate) {
				springValue.set(initialTo as unknown as Animatable<T[keyof T]>);
			}

			springValues.set(key, springValue);

			// Set up effect to watch for changes (only in browser)
			if (isBrowser) {
				effect(() => {
					const newGoal = getter();
					untracked(() => {
						if (options.immediate) {
							springValue.set(
								newGoal as unknown as Animatable<T[keyof T]>,
							);
						} else {
							springValue.start({
								to: newGoal as unknown as Animatable<
									T[keyof T]
								>,
								config: options.config,
							});
						}
					});
				});

				// Also watch from getter if provided
				if (fromGetter) {
					effect(() => {
						fromGetter();
						// From changes don't trigger animation, just update the from value
						untracked(() => {
							// The from value is updated internally when animation starts
						});
					});
				}
			}
		}

		// Setup event callbacks
		if (options.onRest || options.onChange || options.onStart) {
			springValues.forEach((springValue) => {
				if (options.onChange) {
					springValue.onChange((value) => {
						options.onChange?.(
							{ value, finished: springValue.idle },
							springValue,
						);
					});
				}
			});
		}

		// Cleanup on destroy
		destroyRef.onDestroy(() => {
			springValues.forEach((sv) => sv.stop());
			springValues.clear();
		});

		// Create SpringRef
		const springRef: SpringRef<T> = {
			values: springValues,

			get<K extends keyof T>(key: K): Animatable<T[K]> {
				return springValues.get(key)!.get() as Animatable<T[K]>;
			},

			getAll(): AnimatableRecord<T> {
				const result = {} as AnimatableRecord<T>;
				for (const key of keys) {
					result[key] = springValues.get(key)!.get() as Animatable<
						T[keyof T]
					>;
				}
				return result;
			},

			keys() {
				return keys;
			},

			get animating() {
				for (const sv of springValues.values()) {
					if (!sv.idle) return true;
				}
				return false;
			},

			async start(props) {
				const promises: Promise<
					AnimationResult<Animatable<T[keyof T]>>
				>[] = [];

				for (const key of keys) {
					const sv = springValues.get(key)!;
					const toValue = props?.to?.[key];
					const fromValue = props?.from?.[key];
					const config =
						typeof props?.config === 'function'
							? props.config(key)
							: props?.config;
					const immediate =
						typeof props?.immediate === 'function'
							? props.immediate(key)
							: props?.immediate;

					const startProps: {
						to?: Animatable<T[keyof T]>;
						from?: Animatable<T[keyof T]>;
						config?: SpringConfig;
						immediate?: boolean;
					} = {};

					if (toValue !== undefined) {
						startProps.to = (
							typeof toValue === 'function' ? toValue() : toValue
						) as Animatable<T[keyof T]>;
					}
					if (fromValue !== undefined) {
						startProps.from = (
							typeof fromValue === 'function'
								? fromValue()
								: fromValue
						) as Animatable<T[keyof T]>;
					}
					if (config) {
						startProps.config = config;
					}
					if (immediate !== undefined) {
						startProps.immediate = immediate;
					}

					if (Object.keys(startProps).length > 0) {
						promises.push(sv.start(startProps));
					}
				}

				const results = await Promise.all(promises);
				return {
					value: this.getAll(),
					finished: results.every((r) => r.finished),
					cancelled: results.some((r) => r.cancelled),
				};
			},

			stop(cancel = false) {
				springValues.forEach((sv) => sv.stop(cancel));
			},

			stopKeys(stopKeys, cancel = false) {
				stopKeys.forEach((key) => springValues.get(key)?.stop(cancel));
			},

			pause() {
				springValues.forEach((sv) => sv.pause());
			},

			pauseKeys(pauseKeys) {
				pauseKeys.forEach((key) => springValues.get(key)?.pause());
			},

			resume() {
				springValues.forEach((sv) => sv.resume());
			},

			resumeKeys(resumeKeys) {
				resumeKeys.forEach((key) => springValues.get(key)?.resume());
			},

			finish() {
				springValues.forEach((sv) => sv.finish());
			},
		};

		return springRef;
	});
}

/**
 * Directive that applies spring-animated values to a DOM element's styles.
 *
 * The `Spring` directive connects a `SpringRef` (created by the `spring()` function)
 * to a DOM element, automatically updating the element's styles as values animate.
 *
 * **Features:**
 * - Automatic style application with proper CSS units
 * - Transform shortcut support (`x`, `y`, `scale`, `rotate`, etc.)
 * - Reactive element targeting via `springHost`
 * - SSR-safe (only runs in browser)
 * - Efficient batched updates via requestAnimationFrame
 *
 * @usageNotes
 *
 * ### Basic Usage
 * ```html
 * <div [spring]="springValues">Animated content</div>
 * ```
 *
 * ### Custom Target Element
 * Apply animations to a different element than the directive host:
 * ```html
 * <div [spring]="springValues" [springHost]="targetElement">
 *   <div #targetElement>This element gets animated</div>
 * </div>
 * ```
 *
 * ### Reactive Element (Dynamic Target)
 * Use a getter function for elements that may not exist immediately:
 * ```typescript
 * getCanvasElement = () => this.canvasRef()?.nativeElement;
 * ```
 * ```html
 * <div [spring]="springValues" [springHost]="getCanvasElement">...</div>
 * ```
 *
 * @selector [spring]
 * @standalone
 */
@Directive({ selector: '[spring]' })
export class Spring {
	/**
	 * The spring reference containing animated values.
	 * Created using the `spring()` function.
	 */
	readonly spring = input.required<AnySpringRef>();

	/**
	 * Optional target element to apply styles to.
	 *
	 * - If not provided: styles apply to the directive's host element
	 * - If provided: styles apply to the specified element
	 * - Accepts: `ElementRef`, `HTMLElement`, or a getter function returning either
	 *
	 * Use a getter function when the element may not be available immediately
	 * (e.g., elements inside `@if` blocks or `@defer`).
	 */
	readonly springHost = input<
		| ElementRef<HTMLElement>
		| HTMLElement
		| null
		| undefined
		| (() => ElementRef<HTMLElement> | HTMLElement | null | undefined)
	>();

	private readonly elementRef = inject(ElementRef);
	private readonly platformId = inject(PLATFORM_ID);

	private rafId: number | null = null;

	/** Computed target element - resolves springHost or falls back to host element */
	private readonly targetElement = computed(() => {
		const host = this.springHost();

		// No springHost provided - use directive's host element
		if (host === undefined) {
			return this.elementRef.nativeElement;
		}

		// springHost provided - resolve it (may be null while loading)
		const resolved = typeof host === 'function' ? host() : host;
		if (!resolved) return null;
		return resolved instanceof ElementRef
			? resolved.nativeElement
			: resolved;
	});

	constructor() {
		// Only set up in browser
		if (!isPlatformBrowser(this.platformId)) return;

		afterRenderEffect({
			write: (onCleanup) => {
				const element = this.targetElement();
				const springRef = this.spring();

				// Bail early until element is resolved (springHost may not be ready yet)
				if (!element || !springRef) return;

				const keys = springRef.keys() as string[];
				const { transformKeys, styleKeys } =
					separateTransformKeys(keys);
				const unsubscribes: Array<() => void> = [];

				// Subscribe to each spring value
				springRef.values.forEach((springValue) => {
					unsubscribes.push(
						springValue.onChange(() => {
							this.scheduleUpdate(
								element,
								springRef,
								transformKeys,
								styleKeys,
							);
						}),
					);
				});

				// Apply initial values
				this.applyValues(element, springRef, transformKeys, styleKeys);

				onCleanup(() => {
					unsubscribes.forEach((unsub) => unsub());
					if (this.rafId !== null) {
						cancelAnimationFrame(this.rafId);
						this.rafId = null;
					}
				});
			},
		});
	}

	/**
	 * Schedule an update for the next frame (debounces multiple updates)
	 */
	private scheduleUpdate(
		element: HTMLElement,
		springRef: AnySpringRef,
		transformKeys: string[],
		styleKeys: string[],
	): void {
		if (this.rafId !== null) return;

		this.rafId = requestAnimationFrame(() => {
			this.rafId = null;
			this.applyValues(element, springRef, transformKeys, styleKeys);
		});
	}

	/**
	 * Apply spring values to the element's styles
	 */
	private applyValues(
		element: HTMLElement,
		springRef: AnySpringRef,
		transformKeys: string[],
		styleKeys: string[],
	): void {
		// Apply transform shortcuts
		if (transformKeys.length > 0) {
			const transformValues: Record<string, number | string> = {};
			for (const key of transformKeys) {
				transformValues[key] = springRef.get(key) as number | string;
			}
			const transformString = buildTransformString(transformValues);
			if (transformString) {
				element.style.transform = transformString;
			}
		}

		// Apply regular style properties
		for (const key of styleKeys) {
			const value = springRef.get(key);
			const cssProperty = getCssPropertyName(key);
			element.style.setProperty(
				cssProperty,
				this.formatValue(key, value),
			);
		}
	}

	/**
	 * Format a value for CSS (add units if needed)
	 */
	private formatValue(
		key: string,
		value: Animatable<AnimatableValue>,
	): string {
		if (typeof value === 'number') {
			if (PX_PROPERTIES.has(key)) {
				return `${value}px`;
			}

			if (UNITLESS_PROPERTIES.has(key)) {
				return String(value);
			}

			// Default: return as-is
			return String(value);
		}

		return String(value);
	}
}
