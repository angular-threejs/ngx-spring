# ngx-spring

Spring-physics based animations for Angular, inspired by [react-spring](https://www.react-spring.dev/).

Create fluid, natural-feeling animations using spring physics instead of durations and easing curves. Integrates seamlessly with Angular's signal-based reactivity.

## Features

- **Spring Physics**: Natural, physics-based animations that feel alive
- **Signal Reactive**: Automatically animates when your signals change
- **Transform Shortcuts**: Use `x`, `y`, `scale`, `rotate` instead of verbose CSS
- **SSR Safe**: Only runs animations in the browser
- **TypeScript First**: Full type safety with inferred types
- **Lightweight**: Built on top of `@react-spring/rafz` for efficient frame scheduling

## Requirements

- Angular 21+ (`@angular/core` and `@angular/common`)

## Installation

```bash
npm install ngx-spring
```

## Quick Start

```typescript
import { Component, signal } from '@angular/core';
import { spring, Spring } from 'ngx-spring/dom';

@Component({
  selector: 'app-animated-box',
  standalone: true,
  imports: [Spring],
  template: `
    <div [spring]="springValues" class="box">
      Hover me!
    </div>
  `,
  host: {
    '(mouseenter)': 'isHovered.set(true)',
    '(mouseleave)': 'isHovered.set(false)',
  },
})
export class AnimatedBoxComponent {
  isHovered = signal(false);

  // Spring automatically animates when isHovered changes
  springValues = spring({
    scale: () => this.isHovered() ? 1.1 : 1,
    rotate: () => this.isHovered() ? 5 : 0,
  });
}
```

## API Overview

### `spring()` Function

Creates reactive spring animations. Accepts getter functions that are tracked for signal changes.

```typescript
import { spring, config } from 'ngx-spring/dom';

// Basic usage
springValues = spring({
  opacity: () => this.isVisible() ? 1 : 0,
  x: () => this.position().x,
});

// With custom spring physics
springValues = spring({
  y: () => this.isOpen() ? 0 : -100,
}, {
  config: config.wobbly,  // Bouncy animation
});

// From/to style
springValues = spring({
  from: { opacity: () => 0 },
  to: { opacity: () => this.isVisible() ? 1 : 0 },
});
```

### `Spring` Directive

Applies spring animations to DOM elements.

```html
<!-- Basic usage -->
<div [spring]="springValues">Animated content</div>

<!-- Custom target element -->
<div [spring]="springValues" [springHost]="targetRef">
  <div #targetRef>This element gets animated</div>
</div>
```

### Transform Shortcuts

Use convenient shortcuts instead of writing CSS transforms:

| Shortcut | CSS Transform |
|----------|---------------|
| `x`, `y`, `z` | `translate()` / `translate3d()` |
| `scale`, `scaleX`, `scaleY` | `scale()` / `scaleX()` / `scaleY()` |
| `rotate`, `rotateX`, `rotateY`, `rotateZ` | `rotate()` / `rotateX()` / etc. |
| `skew`, `skewX`, `skewY` | `skew()` / `skewX()` / `skewY()` |

### Spring Presets

Built-in spring configurations:

```typescript
import { config } from 'ngx-spring';

config.default   // tension: 170, friction: 26
config.gentle    // tension: 120, friction: 14
config.wobbly    // tension: 180, friction: 12
config.stiff     // tension: 210, friction: 20
config.slow      // tension: 280, friction: 60
config.molasses  // tension: 280, friction: 120
```

## Package Structure

- `ngx-spring` - Core animation primitives (`SpringValue`, `config`, `easings`)
- `ngx-spring/dom` - DOM-specific utilities (`spring()`, `Spring` directive)

## Credits

Inspired by [react-spring](https://www.react-spring.dev/) - A spring-physics first animation library.

## License

MIT - Chau Tran
