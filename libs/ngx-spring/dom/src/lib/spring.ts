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

/** Properties that need 'px' units */
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

/** Properties that are unitless */
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
 * Options for creating a spring
 */
export interface SpringOptions extends SpringEventProps {
	/** Spring physics configuration */
	config?: SpringConfig;
	/** Loop the animation */
	loop?: boolean;
	/** Immediately jump to target value */
	immediate?: boolean;
	/** Injector for dependency injection context */
	injector?: Injector;
}

/**
 * Getter-based spring values where each property is a function returning the target value.
 * This enables signal reactivity.
 */
export type SpringGetterValues<T extends Record<string, AnimatableValue>> = {
	[K in keyof T]: () => T[K];
};

/**
 * From/To style spring configuration
 */
export interface SpringFromToConfig<T extends Record<string, AnimatableValue>> {
	from?: Partial<SpringGetterValues<T>>;
	to?: Partial<SpringGetterValues<T>>;
}

// Track if frame loop is initialized (per platform)
let frameLoopInitialized = false;

/**
 * Initialize the frame loop for browser environment
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
 * @example
 * ```ts
 * // Simple getter-based usage
 * springValues = spring({
 *   opacity: () => this.isVisible() ? 1 : 0,
 *   scale: () => this.isHovered() ? 1.1 : 1,
 * });
 *
 * // With config
 * springValues = spring({
 *   x: () => this.position(),
 * }, { config: config.gentle });
 *
 * // From/to style
 * springValues = spring({
 *   from: { opacity: () => 0 },
 *   to: { opacity: () => this.isVisible() ? 1 : 0 },
 * });
 * ```
 *
 * @param values - Object mapping property names to getter functions
 * @param options - Spring configuration and callbacks
 * @returns SpringRef for use with [spring] directive
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
 * Directive that applies spring-animated values to an element's styles.
 *
 * @example
 * ```html
 * <div [spring]="springRef">Animated content</div>
 *
 * <!-- With custom target element -->
 * <div [spring]="springRef" [springHost]="customElement">...</div>
 *
 * <!-- With reactive getter -->
 * <div [spring]="springRef" [springHost]="getElement">...</div>
 * ```
 */
@Directive({ selector: '[spring]' })
export class Spring {
	/** The spring reference containing animated values */
	readonly spring = input.required<AnySpringRef>();

	/** Optional target element override (defaults to host element) */
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
