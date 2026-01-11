# ngx-spring/dom

DOM-specific spring animations for Angular. This is a secondary entry point of `ngx-spring`.

## Installation

```bash
npm install ngx-spring
```

```typescript
import { spring, Spring } from 'ngx-spring/dom';
```

## API

### `spring()` Function

Creates reactive spring animations that automatically respond to signal changes.

```typescript
import { spring } from 'ngx-spring/dom';
import { config } from 'ngx-spring';

// Basic reactive animation
springValues = spring({
  opacity: () => this.isVisible() ? 1 : 0,
  scale: () => this.isHovered() ? 1.1 : 1,
});

// With custom config
springValues = spring({
  x: () => this.position(),
}, {
  config: config.wobbly,
});

// From/to style
springValues = spring({
  from: { y: () => -20, opacity: () => 0 },
  to: { y: () => 0, opacity: () => 1 },
});
```

### `Spring` Directive

Applies spring animations to DOM elements.

```html
<!-- Basic usage -->
<div [spring]="springValues">Animated content</div>

<!-- Custom target element -->
<div [spring]="springValues" [springHost]="targetElement">...</div>

<!-- Reactive element (getter function) -->
<div [spring]="springValues" [springHost]="getElement">...</div>
```

## Transform Shortcuts

Instead of writing CSS transforms, use convenient shortcuts:

```typescript
spring({
  x: () => 100,        // translateX(100px)
  y: () => 50,         // translateY(50px)
  scale: () => 1.5,    // scale(1.5)
  rotate: () => 45,    // rotate(45deg)
});
```

| Property | CSS Transform |
|----------|---------------|
| `x`, `y`, `z` | `translate()` / `translate3d()` |
| `scale`, `scaleX`, `scaleY`, `scaleZ` | `scale()` functions |
| `rotate`, `rotateX`, `rotateY`, `rotateZ` | `rotate()` functions |
| `skew`, `skewX`, `skewY` | `skew()` functions |

## CSS Properties

Regular CSS properties are also supported with automatic unit handling:

```typescript
spring({
  opacity: () => this.isVisible() ? 1 : 0,       // Unitless
  width: () => this.isExpanded() ? 200 : 100,   // Adds 'px'
  fontSize: () => 16,                            // Adds 'px'
});
```

## Options

```typescript
spring(values, {
  config: SpringConfig,      // Spring physics config
  immediate: boolean,        // Skip animation, jump to value
  loop: boolean,             // Loop animation
  injector: Injector,        // For use outside injection context
  onChange: (result) => {},  // Called on each value change
  onRest: (result) => {},    // Called when animation completes
});
```

## License

MIT - Chau Tran
