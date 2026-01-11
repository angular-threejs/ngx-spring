import { defaults } from './config';
import { easings } from './easing';
import { frameLoop, type OpaqueAnimation } from './frame-loop';
import type {
	Animatable,
	AnimatableValue,
	AnimationResult,
	EasingFunction,
	SpringConfig,
} from './types';

/**
 * Internal animation state for a single numeric value
 */
interface AnimatedNode {
	/** Current position */
	position: number;
	/** Last position (for velocity calculation) */
	lastPosition: number;
	/** Current velocity */
	velocity: number;
	/** Initial velocity */
	v0: number | null;
	/** Elapsed time in ms */
	elapsedTime: number;
	/** Duration progress (0-1) for duration-based animations */
	durationProgress: number;
	/** Whether this node has finished animating */
	done: boolean;
}

/**
 * Merged animation config with all defaults applied
 */
interface MergedConfig {
	tension: number;
	friction: number;
	mass: number;
	velocity: number | number[];
	precision: number;
	clamp: boolean;
	easing: EasingFunction;
	duration?: number;
	decay?: boolean | number;
	bounce?: number;
	round?: number;
	restVelocity?: number;
	progress?: number;
}

/**
 * Observer callback for value changes
 */
export type SpringValueObserver<T extends AnimatableValue> = (
	value: Animatable<T>,
	spring: SpringValue<T>,
) => void;

export class SpringValue<
	TValue extends AnimatableValue = number,
> implements OpaqueAnimation {
	/** Current value */
	private _value: Animatable<TValue>;

	/** Target value */
	private _to: Animatable<TValue>;

	/** Starting value */
	private _from: Animatable<TValue>;

	/** Animation configuration */
	private _config: MergedConfig;

	/** Internal animation nodes (one per numeric component) */
	private _nodes: AnimatedNode[] = [];

	/** Whether we're currently animating */
	private _animating = false;

	/** Whether we're paused */
	private _paused = false;

	/** Value change observers */
	private _observers = new Set<SpringValueObserver<TValue>>();

	/** Promise resolvers for pending start() calls */
	private _pendingResolvers: Array<
		(result: AnimationResult<Animatable<TValue>>) => void
	> = [];

	/** Priority for frame loop ordering */
	priority = 0;

	/** Memoized duration for smooth duration changes */
	private _memoizedDuration = 0;

	constructor(initial: TValue, config?: SpringConfig) {
		this._value = initial as unknown as Animatable<TValue>;
		this._to = initial as unknown as Animatable<TValue>;
		this._from = initial as unknown as Animatable<TValue>;
		this._config = this._mergeConfig(config);
		this._initNodes();
	}

	/** Whether the spring is idle (not animating) */
	get idle(): boolean {
		return !this._animating || this._paused;
	}

	/** Current value */
	get(): Animatable<TValue> {
		return this._value;
	}

	/** Target value */
	get goal(): Animatable<TValue> {
		return this._to;
	}

	/** Current velocity */
	get velocity(): number | number[] {
		if (this._nodes.length === 1) {
			return this._nodes[0].velocity;
		}
		return this._nodes.map((n) => n.velocity);
	}

	/** Whether any animation has occurred */
	get hasAnimated(): boolean {
		return this._nodes.some((n) => n.elapsedTime > 0);
	}

	/** Whether currently animating */
	get isAnimating(): boolean {
		return this._animating;
	}

	/** Whether paused */
	get isPaused(): boolean {
		return this._paused;
	}

	/**
	 * Start animating to a new value
	 */
	start(props: {
		to?: Animatable<TValue>;
		from?: Animatable<TValue>;
		config?: SpringConfig;
		immediate?: boolean;
	}): Promise<AnimationResult<Animatable<TValue>>> {
		return new Promise((resolve) => {
			// Update config if provided
			if (props.config) {
				this._config = this._mergeConfig(props.config);
			}

			// Update from value
			if (props.from !== undefined) {
				this._from = props.from;
				this._setValue(props.from);
			}

			// Update to value
			if (props.to !== undefined) {
				this._to = props.to;
			}

			// Immediate mode - jump to target
			if (props.immediate) {
				this._setValue(this._to);
				this._animating = false;
				resolve({ value: this._value, finished: true });
				return;
			}

			// Check if we need to animate
			if (this._isEqual(this._value, this._to)) {
				resolve({ value: this._value, finished: true, noop: true });
				return;
			}

			// Reset animation state
			this._resetNodes();
			this._animating = true;
			this._pendingResolvers.push(resolve);

			// Start the frame loop
			frameLoop.start(this);
		});
	}

	/**
	 * Set the value immediately without animation
	 */
	set(value: Animatable<TValue>): this {
		this.stop();
		this._to = value;
		this._from = value;
		this._setValue(value);
		return this;
	}

	/**
	 * Stop the current animation
	 */
	stop(cancel = false): this {
		if (this._animating) {
			this._animating = false;
			const result: AnimationResult<Animatable<TValue>> = {
				value: this._value,
				finished: !cancel,
				cancelled: cancel,
			};
			this._flushPendingResolvers(result);
		}
		return this;
	}

	/**
	 * Pause the animation
	 */
	pause(): this {
		this._paused = true;
		return this;
	}

	/**
	 * Resume the animation
	 */
	resume(): this {
		this._paused = false;
		if (this._animating) {
			frameLoop.start(this);
		}
		return this;
	}

	/**
	 * Skip to the end of the animation
	 */
	finish(): this {
		if (this._animating) {
			this._setValue(this._to);
			this.stop();
		}
		return this;
	}

	/**
	 * Subscribe to value changes
	 */
	onChange(observer: SpringValueObserver<TValue>): () => void {
		this._observers.add(observer);
		return () => this._observers.delete(observer);
	}

	/**
	 * Advance the animation by delta time (called by frame loop)
	 */
	advance(dt: number): void {
		if (this._paused || !this._animating) return;

		let allDone = true;
		let changed = false;

		const config = this._config;
		const toValues = this._getNumericValues(this._to);

		for (let i = 0; i < this._nodes.length; i++) {
			const node = this._nodes[i];
			if (node.done) continue;

			const to = toValues[i];
			let finished = false;
			let position = to;

			// Skip animation if tension is zero
			if (config.tension <= 0) {
				node.done = true;
				continue;
			}

			node.elapsedTime += dt;
			const elapsed = node.elapsedTime;
			const from = this._getNumericValues(this._from)[i];

			const v0 =
				node.v0 ??
				(node.v0 = Array.isArray(config.velocity)
					? (config.velocity[i] ?? 0)
					: config.velocity);

			// Precision for determining "at rest"
			const precision =
				config.precision ||
				(from === to
					? 0.005
					: Math.min(1, Math.abs(to - from) * 0.001));

			let velocity: number;

			// Duration-based easing
			if (config.duration !== undefined) {
				let p = 1;
				if (config.duration > 0) {
					if (this._memoizedDuration !== config.duration) {
						this._memoizedDuration = config.duration;
						if (node.durationProgress > 0) {
							node.elapsedTime =
								config.duration * node.durationProgress;
						}
					}

					p =
						(config.progress || 0) +
						node.elapsedTime / this._memoizedDuration;
					p = Math.max(0, Math.min(1, p));
					node.durationProgress = p;
				}

				position = from + config.easing(p) * (to - from);
				velocity = (position - node.lastPosition) / dt;
				finished = p >= 1;
			}
			// Decay easing
			else if (config.decay) {
				const decay = config.decay === true ? 0.998 : config.decay;
				const e = Math.exp(-(1 - decay) * elapsed);

				position = from + (v0 / (1 - decay)) * (1 - e);
				finished = Math.abs(node.lastPosition - position) <= precision;
				velocity = v0 * e;
			}
			// Spring physics
			else {
				velocity = node.velocity;
				const restVelocity = config.restVelocity || precision / 10;
				const bounceFactor = config.clamp ? 0 : (config.bounce ?? 0);
				const canBounce =
					bounceFactor !== undefined && bounceFactor > 0;
				const isGrowing = from === to ? v0 > 0 : from < to;

				position = node.lastPosition;

				const step = 1; // 1ms steps
				const numSteps = Math.ceil(dt / step);

				for (let n = 0; n < numSteps; n++) {
					const isMoving = Math.abs(velocity) > restVelocity;

					if (!isMoving) {
						finished = Math.abs(to - position) <= precision;
						if (finished) break;
					}

					if (canBounce) {
						const isBouncing =
							position === to || position > to === isGrowing;
						if (isBouncing) {
							velocity = -velocity * bounceFactor;
							position = to;
						}
					}

					const springForce =
						-config.tension * 0.000001 * (position - to);
					const dampingForce = -config.friction * 0.001 * velocity;
					const acceleration =
						(springForce + dampingForce) / config.mass;

					velocity = velocity + acceleration * step;
					position = position + velocity * step;
				}
			}

			node.velocity = velocity!;
			node.lastPosition = node.position;
			node.position = position;

			if (Number.isNaN(position)) {
				console.warn('SpringValue got NaN');
				finished = true;
			}

			if (finished) {
				node.done = true;
				node.position = to;
			} else {
				allDone = false;
			}

			if (node.position !== node.lastPosition) {
				changed = true;
			}

			// Apply rounding if configured
			if (config.round) {
				node.position =
					Math.round(node.position / config.round) * config.round;
			}
		}

		// Update the value
		if (changed || allDone) {
			this._updateValueFromNodes();
		}

		// Check if animation is complete
		if (allDone) {
			this._animating = false;
			this._flushPendingResolvers({ value: this._value, finished: true });
		}
	}

	/**
	 * Merge user config with defaults
	 */
	private _mergeConfig(config?: SpringConfig): MergedConfig {
		return {
			tension: config?.tension ?? defaults.tension,
			friction: config?.friction ?? defaults.friction,
			mass: config?.mass ?? defaults.mass,
			velocity: config?.velocity ?? 0,
			precision: config?.precision ?? 0.01,
			clamp: config?.clamp ?? defaults.clamp,
			easing: config?.easing ?? easings.linear,
			duration: config?.duration,
			decay: config?.decay,
			bounce: config?.bounce,
			round: config?.round,
			restVelocity: config?.restVelocity,
			progress: config?.progress,
		};
	}

	/**
	 * Initialize animation nodes from the initial value
	 */
	private _initNodes(): void {
		const values = this._getNumericValues(this._value);
		this._nodes = values.map((v) => ({
			position: v,
			lastPosition: v,
			velocity: 0,
			v0: null,
			elapsedTime: 0,
			durationProgress: 0,
			done: false,
		}));
	}

	/**
	 * Reset nodes for a new animation
	 */
	private _resetNodes(): void {
		const fromValues = this._getNumericValues(this._value);
		for (let i = 0; i < this._nodes.length; i++) {
			const node = this._nodes[i];
			node.position = fromValues[i];
			node.lastPosition = fromValues[i];
			node.velocity = Array.isArray(this._config.velocity)
				? (this._config.velocity[i] ?? 0)
				: this._config.velocity;
			node.v0 = null;
			node.elapsedTime = 0;
			node.durationProgress = 0;
			node.done = false;
		}
	}

	/**
	 * Extract numeric values from an animatable value
	 */
	private _getNumericValues(value: Animatable<TValue>): number[] {
		if (typeof value === 'number') {
			return [value];
		}
		if (Array.isArray(value)) {
			return value.map((v) => (typeof v === 'number' ? v : 0));
		}
		// For strings (like colors), we'd need color parsing here
		// For now, return empty array
		return [0];
	}

	/**
	 * Update the value from animation nodes
	 */
	private _updateValueFromNodes(): void {
		if (typeof this._value === 'number') {
			this._setValue(this._nodes[0].position as Animatable<TValue>);
		} else if (Array.isArray(this._value)) {
			this._setValue(
				this._nodes.map(
					(n) => n.position,
				) as unknown as Animatable<TValue>,
			);
		}
	}

	/**
	 * Set the value and notify observers
	 */
	private _setValue(value: Animatable<TValue>): void {
		if (!this._isEqual(this._value, value)) {
			this._value = value;
			this._notifyObservers();
		}
	}

	/**
	 * Notify all observers of a value change
	 */
	private _notifyObservers(): void {
		this._observers.forEach((observer) => observer(this._value, this));
	}

	/**
	 * Resolve all pending promises
	 */
	private _flushPendingResolvers(
		result: AnimationResult<Animatable<TValue>>,
	): void {
		const resolvers = this._pendingResolvers;
		this._pendingResolvers = [];
		resolvers.forEach((resolve) => resolve(result));
	}

	/**
	 * Check if two values are equal
	 */
	private _isEqual(a: Animatable<TValue>, b: Animatable<TValue>): boolean {
		if (a === b) return true;
		if (Array.isArray(a) && Array.isArray(b)) {
			return a.length === b.length && a.every((v, i) => v === b[i]);
		}
		return false;
	}
}
