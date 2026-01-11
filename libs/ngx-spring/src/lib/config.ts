/**
 * Spring configuration presets
 * Ported from @react-spring/core/src/constants.ts
 */

import type { SpringConfig } from './types';

/**
 * Preset spring configurations
 *
 * @example
 * ```ts
 * spring({ scale: () => x() }, { config: config.gentle })
 * ```
 */
export const config = {
	/** Default spring: tension 170, friction 26 */
	default: { tension: 170, friction: 26 } as SpringConfig,

	/** Gentle spring: slower, less bouncy */
	gentle: { tension: 120, friction: 14 } as SpringConfig,

	/** Wobbly spring: more bouncy, less friction */
	wobbly: { tension: 180, friction: 12 } as SpringConfig,

	/** Stiff spring: fast and snappy */
	stiff: { tension: 210, friction: 20 } as SpringConfig,

	/** Slow spring: high tension but very high friction */
	slow: { tension: 280, friction: 60 } as SpringConfig,

	/** Molasses: very slow, syrupy movement */
	molasses: { tension: 280, friction: 120 } as SpringConfig,
} as const;

/**
 * Default values for animation config
 */
export const defaults = {
	tension: 170,
	friction: 26,
	mass: 1,
	damping: 1,
	clamp: false,
} as const satisfies SpringConfig;
