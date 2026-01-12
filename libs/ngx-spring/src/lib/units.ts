/**
 * @fileoverview Unit string parsing utilities
 *
 * Parses CSS-style values with units (e.g., "100px", "50%", "2rem")
 * and allows animating the numeric portion while preserving the unit.
 *
 * @module ngx-spring
 * @internal
 */

/**
 * Parsed unit value containing numeric value and unit suffix
 */
export interface ParsedUnit {
	/** Numeric value */
	value: number;
	/** Unit suffix (e.g., "px", "%", "rem") */
	unit: string;
}

/**
 * Common CSS units for validation
 */
const CSS_UNITS = new Set([
	// Absolute lengths
	'px',
	'cm',
	'mm',
	'in',
	'pt',
	'pc',
	// Relative lengths
	'em',
	'rem',
	'ex',
	'ch',
	'vw',
	'vh',
	'vmin',
	'vmax',
	'%',
	// Angles
	'deg',
	'rad',
	'grad',
	'turn',
	// Time
	's',
	'ms',
	// Frequency
	'hz',
	'khz',
	// Resolution
	'dpi',
	'dpcm',
	'dppx',
	// Flex
	'fr',
]);

/**
 * Regex to match number with optional unit
 * Matches: "100", "100px", "-50.5%", ".5em", "2.5rem"
 */
const UNIT_REGEX = /^(-?[\d.]+)([a-z%]+)?$/i;

/**
 * Check if a string is a value with a unit
 * Returns false for plain numbers, colors, or other values
 */
export function isUnitValue(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const trimmed = value.trim();

	// Must have at least one digit
	if (!/\d/.test(trimmed)) return false;

	const match = trimmed.match(UNIT_REGEX);
	if (!match) return false;

	// Must have a unit suffix to be considered a "unit value"
	const unit = match[2];
	if (!unit) return false;

	return CSS_UNITS.has(unit.toLowerCase());
}

/**
 * Parse a string with units into its numeric value and unit
 *
 * @param value - String value like "100px", "50%", "2rem"
 * @returns ParsedUnit or null if invalid
 */
export function parseUnit(value: string): ParsedUnit | null {
	const trimmed = value.trim();
	const match = trimmed.match(UNIT_REGEX);

	if (!match) return null;

	const num = parseFloat(match[1]);
	if (isNaN(num)) return null;

	return {
		value: num,
		unit: match[2] || '',
	};
}

/**
 * Format a numeric value with a unit suffix
 *
 * @param value - Numeric value
 * @param unit - Unit suffix
 * @returns Formatted string like "100px"
 */
export function formatUnit(value: number, unit: string): string {
	return `${value}${unit}`;
}
