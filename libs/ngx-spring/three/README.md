# ngx-spring/three

Spring-physics animations for Angular Three (angular-three).

## Installation

```bash
npm install ngx-spring angular-three
```

## Usage

### Basic Animation

```typescript
import { Component, signal } from '@angular/core';
import { spring, Spring, config } from 'ngx-spring/three';
import { NgtCanvas } from 'angular-three';

@Component({
 selector: 'app-animated-box',
 standalone: true,
 imports: [Spring],
 template: `
  <ngt-mesh [spring]="springValues" (pointerover)="isHovered.set(true)" (pointerout)="isHovered.set(false)">
   <ngt-box-geometry />
   <ngt-mesh-standard-material color="hotpink" />
  </ngt-mesh>
 `,
})
export class AnimatedBox {
 isHovered = signal(false);

 // Spring automatically animates when isHovered changes
 springValues = spring({
  scale: () => (this.isHovered() ? [1.2, 1.2, 1.2] : [1, 1, 1]),
 });
}
```

### Vector Animations

Animate position, rotation, and scale using arrays:

```typescript
springValues = spring({
 position: () => (this.isActive() ? [0, 2, 0] : [0, 0, 0]),
 rotation: () => (this.isSpinning() ? [0, Math.PI, 0] : [0, 0, 0]),
 scale: () => (this.isLarge() ? [2, 2, 2] : [1, 1, 1]),
});
```

### Pierced Properties

Animate individual components using dot notation:

```typescript
springValues = spring({
 'position.y': () => (this.isJumping() ? 3 : 0),
 'rotation.z': () => this.angle(),
 'scale.x': () => this.stretchX(),
});
```

### Custom Spring Config

```typescript
import { config } from 'ngx-spring';

// Using presets
springValues = spring(
 {
  position: () => this.targetPosition(),
 },
 {
  config: config.wobbly, // Bouncy animation
 },
);

// Custom physics
springValues = spring(
 {
  scale: () => this.targetScale(),
 },
 {
  config: {
   tension: 300,
   friction: 10,
   mass: 1,
  },
 },
);
```

### Available Presets

- `config.default` - Balanced (tension: 170, friction: 26)
- `config.gentle` - Soft, slow (tension: 120, friction: 14)
- `config.wobbly` - Bouncy (tension: 180, friction: 12)
- `config.stiff` - Quick, minimal overshoot (tension: 210, friction: 20)
- `config.slow` - Slow, smooth (tension: 280, friction: 60)
- `config.molasses` - Very slow (tension: 280, friction: 120)

### From/To Style

Specify explicit starting values:

```typescript
springValues = spring({
 from: {
  position: () => [0, -10, 0],
  scale: () => [0, 0, 0],
 },
 to: {
  position: () => [0, 0, 0],
  scale: () => [1, 1, 1],
 },
});
```

### Imperative Control

```typescript
springValues = spring({
  position: () => this.position(),
});

// Programmatic animation
async animate() {
  await this.springValues.start({
    to: { position: [5, 0, 0] },
  });

  await this.springValues.start({
    to: { position: [0, 0, 0] },
  });
}

// Control methods
pause() {
  this.springValues.pause();
}

resume() {
  this.springValues.resume();
}

stop() {
  this.springValues.stop();
}
```

### Event Callbacks

```typescript
springValues = spring(
 {
  position: () => this.targetPosition(),
 },
 {
  onChange: (result, spring) => {
   console.log('Current value:', result.value);
  },
  onRest: (result, spring) => {
   console.log('Animation finished:', result.finished);
  },
 },
);
```

### Custom Target Element

Apply spring to a different element than the directive host:

```typescript
@Component({
 template: `
  <ngt-group>
   <ngt-mesh #targetMesh [spring]="springValues" [springHost]="targetMesh">
    <ngt-box-geometry />
   </ngt-mesh>
  </ngt-group>
 `,
})
export class Example {
 springValues = spring({
  scale: () => this.scale(),
 });
}
```

## Mixing with DOM Springs

When using both Three.js and DOM animations in the same component:

```typescript
import { spring as domSpring, Spring as DomSpring } from 'ngx-spring/dom';
import { spring as threeSpring, Spring as ThreeSpring } from 'ngx-spring/three';

@Component({
 imports: [DomSpring, ThreeSpring],
 template: `
  <ngt-mesh [spring]="meshSpring">...</ngt-mesh>

  <ngts-html>
   <div htmlContent [spring]="htmlSpring">Overlay</div>
  </ngts-html>
 `,
})
export class MixedExample {
 meshSpring = threeSpring({
  scale: () => (this.isActive() ? [1.5, 1.5, 1.5] : [1, 1, 1]),
 });

 htmlSpring = domSpring({
  opacity: () => (this.isActive() ? 1 : 0),
 });
}
```

## API Reference

### `spring(values, options?)`

Creates a reactive spring animation.

**Parameters:**

- `values` - Object mapping property names to getter functions, or `{ from, to }` config
- `options` - Optional configuration:
  - `config` - Spring physics (tension, friction, mass, etc.)
  - `immediate` - Skip animation, jump to value
  - `loop` - Loop animation continuously
  - `onChange` - Callback on each frame
  - `onRest` - Callback when animation completes
  - `injector` - Angular injector (for use outside injection context)

**Returns:** `SpringRef<T>` with methods:

- `get(key)` - Get current value for a key
- `getAll()` - Get all current values
- `start(props)` - Start new animation
- `stop(cancel?)` - Stop animation
- `pause()` / `resume()` - Pause/resume
- `finish()` - Jump to end value
- `animating` - Whether any spring is animating

### `Spring` Directive

Applies spring values to a Three.js object.

**Inputs:**

- `spring` - Required. The `SpringRef` from `spring()`
- `springHost` - Optional. Target element (defaults to host)

## Requirements

- Angular 21+
- angular-three ^4.0.0
- Must be used within `NgtCanvas` context
