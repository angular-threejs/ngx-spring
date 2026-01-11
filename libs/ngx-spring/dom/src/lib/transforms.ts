/**
 * @fileoverview Transform utilities for spring animations
 *
 * Provides utilities for handling CSS transform shortcuts in spring animations.
 * Allows using convenient shorthand properties like `x`, `y`, `scale`, `rotate`
 * instead of writing full CSS transform strings.
 *
 * @module ngx-spring/dom
 * @internal
 */

/**
 * Transform property shortcuts that map to CSS transform functions.
 *
 * These shortcuts allow you to use simple property names that are
 * automatically converted to proper CSS transform syntax:
 * - `x`, `y`, `z` → `translate(x, y)` or `translate3d(x, y, z)`
 * - `scale`, `scaleX`, `scaleY`, `scaleZ` → `scale()`, `scaleX()`, etc.
 * - `rotate`, `rotateX`, `rotateY`, `rotateZ` → `rotate()`, `rotateX()`, etc.
 * - `skew`, `skewX`, `skewY` → `skew()`, `skewX()`, `skewY()`
 */
const TRANSFORM_KEYS = new Set([
	'x',
	'y',
	'z',
	'scale',
	'scaleX',
	'scaleY',
	'scaleZ',
	'rotate',
	'rotateX',
	'rotateY',
	'rotateZ',
	'skew',
	'skewX',
	'skewY',
]);

/**
 * Check if a property key is a transform shortcut.
 *
 * @param key - The property key to check
 * @returns `true` if the key is a transform shortcut
 *
 * @example
 * ```typescript
 * isTransformKey('x');       // true
 * isTransformKey('scale');   // true
 * isTransformKey('opacity'); // false
 * ```
 */
export function isTransformKey(key: string): boolean {
	return TRANSFORM_KEYS.has(key);
}

/**
 * Separate property keys into transform shortcuts and regular CSS properties.
 *
 * @param keys - Array of property keys to separate
 * @returns Object with `transformKeys` and `styleKeys` arrays
 *
 * @example
 * ```typescript
 * separateTransformKeys(['x', 'y', 'opacity', 'scale']);
 * // Returns: { transformKeys: ['x', 'y', 'scale'], styleKeys: ['opacity'] }
 * ```
 */
export function separateTransformKeys(keys: string[]): {
	transformKeys: string[];
	styleKeys: string[];
} {
	const transformKeys: string[] = [];
	const styleKeys: string[] = [];

	for (const key of keys) {
		if (isTransformKey(key)) {
			transformKeys.push(key);
		} else {
			styleKeys.push(key);
		}
	}

	return { transformKeys, styleKeys };
}

/**
 * Build a CSS transform string from transform shortcut values.
 *
 * Converts shorthand properties like `x`, `y`, `scale`, `rotate` into
 * a proper CSS transform string.
 *
 * @param values - Object mapping transform shortcuts to their values
 * @returns CSS transform string (e.g., "translate(100px, 50px) scale(1.5)")
 *
 * @example
 * ```typescript
 * buildTransformString({ x: 100, y: 50 });
 * // Returns: "translate(100px, 50px)"
 *
 * buildTransformString({ x: 100, scale: 1.5, rotate: 45 });
 * // Returns: "translate(100px, 0px) scale(1.5) rotate(45deg)"
 *
 * buildTransformString({ x: 10, y: 20, z: 30 });
 * // Returns: "translate3d(10px, 20px, 30px)"
 * ```
 */
export function buildTransformString(
	values: Record<string, number | string>,
): string {
	const transforms: string[] = [];

	// Translation
	if ('x' in values || 'y' in values || 'z' in values) {
		const x = values['x'] ?? 0;
		const y = values['y'] ?? 0;
		const z = values['z'];

		if (z !== undefined) {
			transforms.push(
				`translate3d(${formatTranslate(x)}, ${formatTranslate(y)}, ${formatTranslate(z)})`,
			);
		} else {
			transforms.push(
				`translate(${formatTranslate(x)}, ${formatTranslate(y)})`,
			);
		}
	}

	// Scale
	if ('scale' in values) {
		transforms.push(`scale(${values['scale']})`);
	} else {
		if ('scaleX' in values) transforms.push(`scaleX(${values['scaleX']})`);
		if ('scaleY' in values) transforms.push(`scaleY(${values['scaleY']})`);
		if ('scaleZ' in values) transforms.push(`scaleZ(${values['scaleZ']})`);
	}

	// Rotation
	if ('rotate' in values) {
		transforms.push(`rotate(${formatAngle(values['rotate'])})`);
	}
	if ('rotateX' in values) {
		transforms.push(`rotateX(${formatAngle(values['rotateX'])})`);
	}
	if ('rotateY' in values) {
		transforms.push(`rotateY(${formatAngle(values['rotateY'])})`);
	}
	if ('rotateZ' in values) {
		transforms.push(`rotateZ(${formatAngle(values['rotateZ'])})`);
	}

	// Skew
	if ('skew' in values) {
		transforms.push(`skew(${formatAngle(values['skew'])})`);
	}
	if ('skewX' in values) {
		transforms.push(`skewX(${formatAngle(values['skewX'])})`);
	}
	if ('skewY' in values) {
		transforms.push(`skewY(${formatAngle(values['skewY'])})`);
	}

	return transforms.join(' ');
}

/**
 * Format a translation value, adding 'px' units if numeric.
 * @internal
 */
function formatTranslate(value: number | string): string {
	return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Format an angle value, adding 'deg' units if numeric.
 * @internal
 */
function formatAngle(value: number | string): string {
	return typeof value === 'number' ? `${value}deg` : value;
}

/**
 * Convert a camelCase property name to kebab-case CSS property name.
 *
 * @param key - The camelCase property name
 * @returns The kebab-case CSS property name
 *
 * @example
 * ```typescript
 * getCssPropertyName('fontSize');      // 'font-size'
 * getCssPropertyName('backgroundColor'); // 'background-color'
 * getCssPropertyName('opacity');       // 'opacity'
 * ```
 */
export function getCssPropertyName(key: string): string {
	return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}
