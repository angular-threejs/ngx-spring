/**
 * Easing functions for duration-based animations
 * Ported from @react-spring/shared/src/easings.ts
 *
 * With thanks to ai easings.net
 * https://github.com/ai/easings.net/blob/master/src/easings/easingsFunctions.ts
 */

import type { EasingFunction } from './types';

export type Direction = 'start' | 'end';

/**
 * Clamp a value between min and max
 */
export function clamp(min: number, max: number, value: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Steps easing function - creates discrete steps in the animation
 */
export function steps(
	numSteps: number,
	direction: Direction = 'end',
): EasingFunction {
	return (progress: number) => {
		progress =
			direction === 'end'
				? Math.min(progress, 0.999)
				: Math.max(progress, 0.001);
		const expanded = progress * numSteps;
		const rounded =
			direction === 'end' ? Math.floor(expanded) : Math.ceil(expanded);
		return clamp(0, 1, rounded / numSteps);
	};
}

// Constants for easing calculations
const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3;
const c5 = (2 * Math.PI) / 4.5;

const bounceOut: EasingFunction = (x) => {
	const n1 = 7.5625;
	const d1 = 2.75;

	if (x < 1 / d1) {
		return n1 * x * x;
	}

	if (x < 2 / d1) {
		return n1 * (x -= 1.5 / d1) * x + 0.75;
	}

	if (x < 2.5 / d1) {
		return n1 * (x -= 2.25 / d1) * x + 0.9375;
	}

	return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

/**
 * Collection of standard easing functions
 */
export const easings = {
	linear: (x: number) => x,

	// Quad
	easeInQuad: (x: number) => x * x,
	easeOutQuad: (x: number) => 1 - (1 - x) * (1 - x),
	easeInOutQuad: (x: number) =>
		x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,

	// Cubic
	easeInCubic: (x: number) => x * x * x,
	easeOutCubic: (x: number) => 1 - Math.pow(1 - x, 3),
	easeInOutCubic: (x: number) =>
		x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,

	// Quart
	easeInQuart: (x: number) => x * x * x * x,
	easeOutQuart: (x: number) => 1 - Math.pow(1 - x, 4),
	easeInOutQuart: (x: number) =>
		x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2,

	// Quint
	easeInQuint: (x: number) => x * x * x * x * x,
	easeOutQuint: (x: number) => 1 - Math.pow(1 - x, 5),
	easeInOutQuint: (x: number) =>
		x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2,

	// Sine
	easeInSine: (x: number) => 1 - Math.cos((x * Math.PI) / 2),
	easeOutSine: (x: number) => Math.sin((x * Math.PI) / 2),
	easeInOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,

	// Expo
	easeInExpo: (x: number) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
	easeOutExpo: (x: number) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
	easeInOutExpo: (x: number) =>
		x === 0
			? 0
			: x === 1
				? 1
				: x < 0.5
					? Math.pow(2, 20 * x - 10) / 2
					: (2 - Math.pow(2, -20 * x + 10)) / 2,

	// Circ
	easeInCirc: (x: number) => 1 - Math.sqrt(1 - Math.pow(x, 2)),
	easeOutCirc: (x: number) => Math.sqrt(1 - Math.pow(x - 1, 2)),
	easeInOutCirc: (x: number) =>
		x < 0.5
			? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2
			: (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2,

	// Back
	easeInBack: (x: number) => c3 * x * x * x - c1 * x * x,
	easeOutBack: (x: number) =>
		1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
	easeInOutBack: (x: number) =>
		x < 0.5
			? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
			: (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2,

	// Elastic
	easeInElastic: (x: number) =>
		x === 0
			? 0
			: x === 1
				? 1
				: -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4),
	easeOutElastic: (x: number) =>
		x === 0
			? 0
			: x === 1
				? 1
				: Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1,
	easeInOutElastic: (x: number) =>
		x === 0
			? 0
			: x === 1
				? 1
				: x < 0.5
					? -(
							Math.pow(2, 20 * x - 10) *
							Math.sin((20 * x - 11.125) * c5)
						) / 2
					: (Math.pow(2, -20 * x + 10) *
							Math.sin((20 * x - 11.125) * c5)) /
							2 +
						1,

	// Bounce
	easeInBounce: (x: number) => 1 - bounceOut(1 - x),
	easeOutBounce: bounceOut,
	easeInOutBounce: (x: number) =>
		x < 0.5
			? (1 - bounceOut(1 - 2 * x)) / 2
			: (1 + bounceOut(2 * x - 1)) / 2,

	// Steps
	steps,
} as const;
