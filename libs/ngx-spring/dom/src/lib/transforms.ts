/**
 * Transform utilities for spring animations
 */

/**
 * Transform property shortcuts that map to CSS transform functions
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
 * Check if a key is a transform shortcut
 */
export function isTransformKey(key: string): boolean {
	return TRANSFORM_KEYS.has(key);
}

/**
 * Separate keys into transform shortcuts and regular style properties
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
 * Build a CSS transform string from transform values
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
 * Format a translation value (add px if number)
 */
function formatTranslate(value: number | string): string {
	return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Format an angle value (add deg if number)
 */
function formatAngle(value: number | string): string {
	return typeof value === 'number' ? `${value}deg` : value;
}

/**
 * Convert camelCase to kebab-case for CSS properties
 */
export function getCssPropertyName(key: string): string {
	return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}
