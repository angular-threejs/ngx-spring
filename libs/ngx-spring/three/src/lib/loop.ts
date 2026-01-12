/**
 * Frameloop bridge for integrating ngx-spring with angular-three
 *
 * This module hooks ngx-spring's frameLoop into angular-three's render loop
 * via addEffect, ensuring spring animations are synchronized with Three.js rendering.
 */

import { addEffect } from 'angular-three';
import { frameLoop } from 'ngx-spring';

let initialized = false;
let cleanup: (() => void) | null = null;
let lastTime = 0;

/**
 * Initialize the frameloop bridge between ngx-spring and angular-three.
 *
 * This registers ngx-spring's frameLoop.advance() with angular-three's addEffect,
 * so spring animations run in sync with the Three.js render loop.
 *
 * Called automatically on first spring() call in a Three.js context.
 * Safe to call multiple times - only initializes once.
 */
export function initThreeSpringLoop(): void {
	if (initialized) return;
	initialized = true;

	cleanup = addEffect((timestamp: number) => {
		// Calculate delta time in milliseconds
		const dt = lastTime ? timestamp - lastTime : 16.67; // Default to ~60fps
		lastTime = timestamp;

		// Advance all spring animations
		frameLoop.advance(dt);

		// Return true to keep the effect running
		return true;
	});
}

/**
 * Cleanup the frameloop bridge.
 * Called when all springs are destroyed.
 */
export function cleanupThreeSpringLoop(): void {
	if (cleanup) {
		cleanup();
		cleanup = null;
	}
	initialized = false;
	lastTime = 0;
}

/**
 * Check if the frameloop bridge is initialized.
 */
export function isThreeSpringLoopInitialized(): boolean {
	return initialized;
}
