/**
 * @fileoverview Three.js spring animations for Angular Three
 *
 * This module provides the `spring()` function and `Spring` directive for creating
 * reactive spring animations that automatically apply to Three.js objects.
 *
 * @module ngx-spring/three
 *
 * @example
 * ```typescript
 * import { spring, Spring } from 'ngx-spring/three';
 *
 * @Component({
 *   template: `
 *     <ngt-mesh [spring]="springValues" (pointerover)="isHovered.set(true)" (pointerout)="isHovered.set(false)">
 *       <ngt-box-geometry />
 *       <ngt-mesh-standard-material />
 *     </ngt-mesh>
 *   `,
 *   imports: [Spring]
 * })
 * export class AnimatedMesh {
 *   isHovered = signal(false);
 *
 *   springValues = spring({
 *     scale: () => this.isHovered() ? [1.2, 1.2, 1.2] : [1, 1, 1],
 *     'rotation.y': () => this.isHovered() ? Math.PI / 4 : 0,
 *   });
 * }
 * ```
 */

import {
	assertInInjectionContext,
	computed,
	DestroyRef,
	Directive,
	effect,
	ElementRef,
	inject,
	Injector,
	input,
	runInInjectionContext,
	untracked,
} from '@angular/core';
import { applyProps, injectStore } from 'angular-three';
import {
	type Animatable,
	type AnimatableRecord,
	type AnimatableValue,
	type AnimationResult,
	type AnySpringRef,
	type SpringConfig,
	type SpringEventProps,
	type SpringFromTo,
	type SpringGetters,
	type SpringRef,
	SpringValue,
} from 'ngx-spring';

import { initThreeSpringLoop } from './loop';

/**
 * Options for creating a spring animation with the `spring()` function.
 */
export interface SpringOptions extends SpringEventProps {
	/**
	 * Spring physics configuration.
	 * Use presets from `config` or provide custom tension/friction values.
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
 * Create reactive spring animations for Three.js objects.
 *
 * This function creates spring animations that integrate with angular-three's
 * render loop. Values are automatically applied to Three.js objects via `applyProps`.
 *
 * **Supported value types:**
 * - Numbers: `opacity: () => 1`
 * - Arrays (Vector3, Euler, etc.): `position: () => [1, 2, 3]`
 * - Pierced properties: `'position.x': () => 5`
 *
 * @example
 * ```typescript
 * // Basic position animation
 * springValues = spring({
 *   position: () => this.isActive() ? [0, 2, 0] : [0, 0, 0],
 * });
 *
 * // Multiple properties with custom config
 * springValues = spring({
 *   scale: () => this.isHovered() ? [1.5, 1.5, 1.5] : [1, 1, 1],
 *   'rotation.y': () => this.angle(),
 * }, {
 *   config: { tension: 300, friction: 20 },
 * });
 * ```
 */
export function spring<T extends Record<string, AnimatableValue>>(
	values: SpringGetters<T> | SpringFromTo<T>,
	options: SpringOptions = {},
): SpringRef<T> {
	const injector = options.injector;

	if (!injector) {
		assertInInjectionContext(spring);
	}

	return runInInjectionContext(injector ?? inject(Injector), () => {
		const currentInjector = inject(Injector);
		const destroyRef = inject(DestroyRef);

		// Verify we're in an angular-three context
		const store = injectStore();
		if (!store) {
			throw new Error(
				'ngx-spring/three: spring() must be called within an angular-three context (inside NgtCanvas). ' +
					'For DOM animations, use spring() from ngx-spring/dom instead.',
			);
		}

		// Initialize the frameloop bridge
		initThreeSpringLoop();

		// Parse values - handle both getter-based and from/to styles
		let getters: SpringGetters<T>;
		let fromGetters: Partial<SpringGetters<T>> | undefined;

		if ('to' in values || 'from' in values) {
			const config = values as SpringFromTo<T>;
			getters = (config.to ?? {}) as SpringGetters<T>;
			fromGetters = config.from;
		} else {
			getters = values as SpringGetters<T>;
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

			// Set up effect to watch for changes
			effect(() => {
				const newGoal = getter();
				untracked(() => {
					if (options.immediate) {
						springValue.set(
							newGoal as unknown as Animatable<T[keyof T]>,
						);
					} else {
						springValue.start({
							to: newGoal as unknown as Animatable<T[keyof T]>,
							config: options.config,
						});
					}
				});
			});

			// Watch from getter if provided
			if (fromGetter) {
				effect(() => {
					fromGetter();
					// From changes don't trigger animation
				});
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
 * Directive that applies spring-animated values to a Three.js object.
 *
 * The `Spring` directive connects a `SpringRef` (created by the `spring()` function)
 * to a Three.js object, automatically updating properties as values animate.
 *
 * Uses angular-three's `applyProps` for efficient property updates that bypass
 * Angular's change detection.
 *
 * @example
 * ```html
 * <ngt-mesh [spring]="springValues">
 *   <ngt-box-geometry />
 * </ngt-mesh>
 * ```
 *
 * @example
 * ```html
 * <!-- Custom target element -->
 * <ngt-group>
 *   <ngt-mesh #mesh [spring]="springValues" [springHost]="mesh">
 *     <ngt-box-geometry />
 *   </ngt-mesh>
 * </ngt-group>
 * ```
 */
@Directive({ selector: '[spring]' })
export class Spring {
	/**
	 * The spring reference containing animated values.
	 */
	readonly spring = input.required<AnySpringRef>();

	/**
	 * Optional target Three.js object to apply values to.
	 * If not provided, uses the directive's host element.
	 * Works with any Three.js object: Object3D, Material, Geometry, Light, etc.
	 */
	readonly springHost = input<
		| ElementRef<object>
		| object
		| null
		| undefined
		| (() => ElementRef<object> | object | null | undefined)
	>();

	private readonly elementRef = inject<ElementRef<object>>(ElementRef);

	/** Flag to batch multiple spring value changes into a single applyProps call */
	private dirty = false;

	/** Computed target object - resolves springHost or falls back to host element */
	private readonly targetObject = computed(() => {
		const host = this.springHost();

		if (host === undefined) {
			return this.elementRef.nativeElement;
		}

		const resolved = typeof host === 'function' ? host() : host;
		if (!resolved) return null;
		return resolved instanceof ElementRef
			? resolved.nativeElement
			: resolved;
	});

	constructor() {
		// Set up effect to apply spring values
		effect((onCleanup) => {
			const object = this.targetObject();
			const springRef = this.spring();

			if (!object || !springRef) return;

			const keys = springRef.keys() as string[];
			const unsubscribes: Array<() => void> = [];

			// Mark dirty and schedule batched update
			const markDirty = () => {
				if (this.dirty) return;
				this.dirty = true;
				// Schedule update on next microtask to batch all changes in same frame
				queueMicrotask(() => {
					if (this.dirty) {
						this.dirty = false;
						this.applyAllValues(object, keys, springRef);
					}
				});
			};

			// Subscribe to each spring value - all trigger the same batched update
			springRef.values.forEach((springValue) => {
				unsubscribes.push(springValue.onChange(markDirty));
			});

			// Apply initial values
			this.applyAllValues(object, keys, springRef);

			onCleanup(() => {
				unsubscribes.forEach((unsub) => unsub());
				this.dirty = false;
			});
		});
	}

	/**
	 * Apply all spring values to the object
	 */
	private applyAllValues(
		object: object,
		keys: string[],
		springRef: AnySpringRef,
	): void {
		const props: Record<string, unknown> = {};
		for (const key of keys) {
			props[key] = springRef.get(key);
		}
		applyProps(object, props);
	}
}
