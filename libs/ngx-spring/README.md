# ngx-spring

Spring-physics based animations for Angular, inspired by [react-spring](https://www.react-spring.dev/).

## Requirements

- Angular 21+ (`@angular/core` and `@angular/common`)

## Installation

```bash
npm install ngx-spring
```

## Entry Points

### `ngx-spring` (Main)

Core animation primitives and utilities:

```typescript
import {
  SpringValue,      // Core animated value class
  config,           // Spring presets (default, gentle, wobbly, stiff, slow, molasses)
  easings,          // Easing functions for duration-based animations
  // Types
  type SpringConfig,
  type AnimatableValue,
  type Animatable,
  type SpringRef,
} from 'ngx-spring';
```

### `ngx-spring/dom`

DOM-specific spring animations:

```typescript
import {
  spring,           // Create reactive spring animations
  Spring,           // Directive to apply animations to elements
} from 'ngx-spring/dom';
```

## Basic Usage

```typescript
import { Component, signal } from '@angular/core';
import { spring, Spring } from 'ngx-spring/dom';
import { config } from 'ngx-spring';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [Spring],
  template: `
    <div [spring]="springValues" class="box">
      Click me!
    </div>
  `,
  host: {
    '(click)': 'toggle()',
  },
})
export class DemoComponent {
  isActive = signal(false);

  springValues = spring({
    scale: () => this.isActive() ? 1.2 : 1,
    opacity: () => this.isActive() ? 1 : 0.5,
  }, {
    config: config.wobbly,
  });

  toggle() {
    this.isActive.update(v => !v);
  }
}
```

## Spring Presets

```typescript
import { config } from 'ngx-spring';

config.default   // { tension: 170, friction: 26 } - Balanced default
config.gentle    // { tension: 120, friction: 14 } - Slow and smooth
config.wobbly    // { tension: 180, friction: 12 } - Bouncy
config.stiff     // { tension: 210, friction: 20 } - Fast and snappy
config.slow      // { tension: 280, friction: 60 } - Very slow
config.molasses  // { tension: 280, friction: 120 } - Extremely slow
```

## Custom Spring Configuration

```typescript
// Custom tension/friction
spring(values, {
  config: { tension: 300, friction: 10 },
});

// Duration-based (uses easing instead of physics)
spring(values, {
  config: { duration: 500, easing: easings.easeOutCubic },
});
```

## Credits

Inspired by [react-spring](https://www.react-spring.dev/).

## License

MIT - Chau Tran
