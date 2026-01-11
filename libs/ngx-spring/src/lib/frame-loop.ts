/**
 * Frame loop wrapper for ngx-spring
 * Provides a priority-based animation queue using @react-spring/rafz
 */

import { raf } from '@react-spring/rafz';

/**
 * Interface for objects that can be animated
 */
export interface OpaqueAnimation {
	/** When true, the animation is not advancing */
	idle: boolean;
	/** Priority for execution order (lower = first) */
	priority: number;
	/** Advance the animation by delta time in milliseconds */
	advance(dt: number): void;
}

// Animations to start on next frame
const startQueue = new Set<OpaqueAnimation>();

// Current frame animations, sorted by priority
let currentFrame: OpaqueAnimation[] = [];
let prevFrame: OpaqueAnimation[] = [];

// Priority of currently advancing animation
let priority = 0;

/**
 * The frame loop executes animations in order of lowest priority first.
 * Animations are retained until idle.
 */
export const frameLoop = {
	get idle() {
		return !startQueue.size && !currentFrame.length;
	},

	/** Advance the given animation on every frame until idle */
	start(animation: OpaqueAnimation) {
		if (priority > animation.priority) {
			startQueue.add(animation);
			raf.onStart(flushStartQueue);
		} else {
			startSafely(animation);
			raf(advance);
		}
	},

	/** Advance all animations by the given time */
	advance,

	/** Call when an animation's priority changes */
	sort(animation: OpaqueAnimation) {
		if (priority) {
			raf.onFrame(() => frameLoop.sort(animation));
		} else {
			const prevIndex = currentFrame.indexOf(animation);
			if (~prevIndex) {
				currentFrame.splice(prevIndex, 1);
				startUnsafely(animation);
			}
		}
	},

	/** Clear all animations (for testing) */
	clear() {
		currentFrame = [];
		startQueue.clear();
	},
};

function flushStartQueue() {
	startQueue.forEach(startSafely);
	startQueue.clear();
	raf(advance);
}

function startSafely(animation: OpaqueAnimation) {
	if (!currentFrame.includes(animation)) {
		startUnsafely(animation);
	}
}

function startUnsafely(animation: OpaqueAnimation) {
	currentFrame.splice(
		findIndex(currentFrame, (other) => other.priority > animation.priority),
		0,
		animation,
	);
}

function advance(dt: number): boolean {
	const nextFrame = prevFrame;

	for (let i = 0; i < currentFrame.length; i++) {
		const animation = currentFrame[i];
		priority = animation.priority;

		if (!animation.idle) {
			animation.advance(dt);
			if (!animation.idle) {
				nextFrame.push(animation);
			}
		}
	}
	priority = 0;

	// Reuse arrays to avoid GC
	prevFrame = currentFrame;
	prevFrame.length = 0;
	currentFrame = nextFrame;

	return currentFrame.length > 0;
}

function findIndex<T>(arr: T[], test: (value: T) => boolean): number {
	const index = arr.findIndex(test);
	return index < 0 ? arr.length : index;
}
