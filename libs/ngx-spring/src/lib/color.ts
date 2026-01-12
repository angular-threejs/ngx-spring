/**
 * @fileoverview Color parsing and conversion utilities
 *
 * Supports parsing and converting between color formats for animation.
 * Handles hex, rgb, rgba, hsl, hsla, and named CSS colors.
 *
 * @module ngx-spring
 * @internal
 */

/**
 * RGBA color representation as [r, g, b, a] where:
 * - r, g, b: 0-255
 * - a: 0-1
 */
export type RGBA = [number, number, number, number];

/**
 * Named CSS colors mapped to their hex values
 */
const NAMED_COLORS: Record<string, string> = {
	transparent: '#00000000',
	aliceblue: '#f0f8ff',
	antiquewhite: '#faebd7',
	aqua: '#00ffff',
	aquamarine: '#7fffd4',
	azure: '#f0ffff',
	beige: '#f5f5dc',
	bisque: '#ffe4c4',
	black: '#000000',
	blanchedalmond: '#ffebcd',
	blue: '#0000ff',
	blueviolet: '#8a2be2',
	brown: '#a52a2a',
	burlywood: '#deb887',
	cadetblue: '#5f9ea0',
	chartreuse: '#7fff00',
	chocolate: '#d2691e',
	coral: '#ff7f50',
	cornflowerblue: '#6495ed',
	cornsilk: '#fff8dc',
	crimson: '#dc143c',
	cyan: '#00ffff',
	darkblue: '#00008b',
	darkcyan: '#008b8b',
	darkgoldenrod: '#b8860b',
	darkgray: '#a9a9a9',
	darkgreen: '#006400',
	darkgrey: '#a9a9a9',
	darkkhaki: '#bdb76b',
	darkmagenta: '#8b008b',
	darkolivegreen: '#556b2f',
	darkorange: '#ff8c00',
	darkorchid: '#9932cc',
	darkred: '#8b0000',
	darksalmon: '#e9967a',
	darkseagreen: '#8fbc8f',
	darkslateblue: '#483d8b',
	darkslategray: '#2f4f4f',
	darkslategrey: '#2f4f4f',
	darkturquoise: '#00ced1',
	darkviolet: '#9400d3',
	deeppink: '#ff1493',
	deepskyblue: '#00bfff',
	dimgray: '#696969',
	dimgrey: '#696969',
	dodgerblue: '#1e90ff',
	firebrick: '#b22222',
	floralwhite: '#fffaf0',
	forestgreen: '#228b22',
	fuchsia: '#ff00ff',
	gainsboro: '#dcdcdc',
	ghostwhite: '#f8f8ff',
	gold: '#ffd700',
	goldenrod: '#daa520',
	gray: '#808080',
	green: '#008000',
	greenyellow: '#adff2f',
	grey: '#808080',
	honeydew: '#f0fff0',
	hotpink: '#ff69b4',
	indianred: '#cd5c5c',
	indigo: '#4b0082',
	ivory: '#fffff0',
	khaki: '#f0e68c',
	lavender: '#e6e6fa',
	lavenderblush: '#fff0f5',
	lawngreen: '#7cfc00',
	lemonchiffon: '#fffacd',
	lightblue: '#add8e6',
	lightcoral: '#f08080',
	lightcyan: '#e0ffff',
	lightgoldenrodyellow: '#fafad2',
	lightgray: '#d3d3d3',
	lightgreen: '#90ee90',
	lightgrey: '#d3d3d3',
	lightpink: '#ffb6c1',
	lightsalmon: '#ffa07a',
	lightseagreen: '#20b2aa',
	lightskyblue: '#87cefa',
	lightslategray: '#778899',
	lightslategrey: '#778899',
	lightsteelblue: '#b0c4de',
	lightyellow: '#ffffe0',
	lime: '#00ff00',
	limegreen: '#32cd32',
	linen: '#faf0e6',
	magenta: '#ff00ff',
	maroon: '#800000',
	mediumaquamarine: '#66cdaa',
	mediumblue: '#0000cd',
	mediumorchid: '#ba55d3',
	mediumpurple: '#9370db',
	mediumseagreen: '#3cb371',
	mediumslateblue: '#7b68ee',
	mediumspringgreen: '#00fa9a',
	mediumturquoise: '#48d1cc',
	mediumvioletred: '#c71585',
	midnightblue: '#191970',
	mintcream: '#f5fffa',
	mistyrose: '#ffe4e1',
	moccasin: '#ffe4b5',
	navajowhite: '#ffdead',
	navy: '#000080',
	oldlace: '#fdf5e6',
	olive: '#808000',
	olivedrab: '#6b8e23',
	orange: '#ffa500',
	orangered: '#ff4500',
	orchid: '#da70d6',
	palegoldenrod: '#eee8aa',
	palegreen: '#98fb98',
	paleturquoise: '#afeeee',
	palevioletred: '#db7093',
	papayawhip: '#ffefd5',
	peachpuff: '#ffdab9',
	peru: '#cd853f',
	pink: '#ffc0cb',
	plum: '#dda0dd',
	powderblue: '#b0e0e6',
	purple: '#800080',
	rebeccapurple: '#663399',
	red: '#ff0000',
	rosybrown: '#bc8f8f',
	royalblue: '#4169e1',
	saddlebrown: '#8b4513',
	salmon: '#fa8072',
	sandybrown: '#f4a460',
	seagreen: '#2e8b57',
	seashell: '#fff5ee',
	sienna: '#a0522d',
	silver: '#c0c0c0',
	skyblue: '#87ceeb',
	slateblue: '#6a5acd',
	slategray: '#708090',
	slategrey: '#708090',
	snow: '#fffafa',
	springgreen: '#00ff7f',
	steelblue: '#4682b4',
	tan: '#d2b48c',
	teal: '#008080',
	thistle: '#d8bfd8',
	tomato: '#ff6347',
	turquoise: '#40e0d0',
	violet: '#ee82ee',
	wheat: '#f5deb3',
	white: '#ffffff',
	whitesmoke: '#f5f5f5',
	yellow: '#ffff00',
	yellowgreen: '#9acd32',
};

/**
 * Check if a string is a color value
 */
export function isColor(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const v = value.trim().toLowerCase();
	return (
		v.startsWith('#') ||
		v.startsWith('rgb') ||
		v.startsWith('hsl') ||
		v in NAMED_COLORS
	);
}

/**
 * Parse any color format to RGBA array
 *
 * @param color - Color string (hex, rgb, rgba, hsl, hsla, or named)
 * @returns RGBA tuple [r, g, b, a] or null if invalid
 */
export function parseColor(color: string): RGBA | null {
	const trimmed = color.trim().toLowerCase();

	// Named color
	if (trimmed in NAMED_COLORS) {
		return parseHex(NAMED_COLORS[trimmed]);
	}

	// Hex color
	if (trimmed.startsWith('#')) {
		return parseHex(trimmed);
	}

	// RGB/RGBA
	if (trimmed.startsWith('rgb')) {
		return parseRgb(trimmed);
	}

	// HSL/HSLA
	if (trimmed.startsWith('hsl')) {
		return parseHsl(trimmed);
	}

	return null;
}

/**
 * Parse hex color to RGBA
 * Supports: #rgb, #rgba, #rrggbb, #rrggbbaa
 */
function parseHex(hex: string): RGBA | null {
	const h = hex.slice(1);
	let r: number, g: number, b: number, a: number;

	if (h.length === 3) {
		// #rgb
		r = parseInt(h[0] + h[0], 16);
		g = parseInt(h[1] + h[1], 16);
		b = parseInt(h[2] + h[2], 16);
		a = 1;
	} else if (h.length === 4) {
		// #rgba
		r = parseInt(h[0] + h[0], 16);
		g = parseInt(h[1] + h[1], 16);
		b = parseInt(h[2] + h[2], 16);
		a = parseInt(h[3] + h[3], 16) / 255;
	} else if (h.length === 6) {
		// #rrggbb
		r = parseInt(h.slice(0, 2), 16);
		g = parseInt(h.slice(2, 4), 16);
		b = parseInt(h.slice(4, 6), 16);
		a = 1;
	} else if (h.length === 8) {
		// #rrggbbaa
		r = parseInt(h.slice(0, 2), 16);
		g = parseInt(h.slice(2, 4), 16);
		b = parseInt(h.slice(4, 6), 16);
		a = parseInt(h.slice(6, 8), 16) / 255;
	} else {
		return null;
	}

	if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
		return null;
	}

	return [r, g, b, a];
}

/**
 * Parse rgb() or rgba() to RGBA
 */
function parseRgb(rgb: string): RGBA | null {
	// Match rgb(r, g, b) or rgba(r, g, b, a) or modern rgb(r g b / a)
	const match = rgb.match(
		/rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*(?:[,/]\s*([\d.]+))?\s*\)/,
	);

	if (!match) return null;

	const r = parseInt(match[1], 10);
	const g = parseInt(match[2], 10);
	const b = parseInt(match[3], 10);
	const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

	if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
		return null;
	}

	return [
		Math.min(255, Math.max(0, r)),
		Math.min(255, Math.max(0, g)),
		Math.min(255, Math.max(0, b)),
		Math.min(1, Math.max(0, a)),
	];
}

/**
 * Parse hsl() or hsla() to RGBA
 */
function parseHsl(hsl: string): RGBA | null {
	// Match hsl(h, s%, l%) or hsla(h, s%, l%, a) or modern hsl(h s% l% / a)
	const match = hsl.match(
		/hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+))?\s*\)/,
	);

	if (!match) return null;

	const h = parseFloat(match[1]) / 360;
	const s = parseFloat(match[2]) / 100;
	const l = parseFloat(match[3]) / 100;
	const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

	if (isNaN(h) || isNaN(s) || isNaN(l) || isNaN(a)) {
		return null;
	}

	// HSL to RGB conversion
	let r: number, g: number, b: number;

	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return [
		Math.round(r * 255),
		Math.round(g * 255),
		Math.round(b * 255),
		Math.min(1, Math.max(0, a)),
	];
}

/**
 * Convert RGBA array to rgba() string
 */
export function rgbaToString(rgba: RGBA): string {
	const [r, g, b, a] = rgba;
	if (a === 1) {
		return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
	}
	return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}
