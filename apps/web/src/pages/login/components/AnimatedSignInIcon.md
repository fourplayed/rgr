# AnimatedSignInIcon Component

A specialized animated icon component for the sign-in button that provides visual feedback through continuous slide-in animations and hover interactions.

## Overview

The `AnimatedSignInIcon` component renders a right-pointing arrow icon with two distinct animation behaviors:
1. **Periodic Slide-In**: Icon slides in from the left every 6 seconds
2. **Hover Rotation**: Icon rotates 360° when the parent button is hovered

## Features

- **GPU-Accelerated Animations**: Uses `transform` and `opacity` for optimal performance
- **Accessibility First**: Respects `prefers-reduced-motion` media query
- **Theme Compatible**: Works seamlessly in both light and dark themes
- **Customizable**: Configurable size and positioning via CSS variables
- **Memory Safe**: Proper cleanup of timers and event listeners

## API Reference

### Props

```typescript
interface AnimatedSignInIconProps {
  /** Whether the parent button is being hovered */
  isHovered?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Icon size in pixels (default: 24) */
  size?: number;
}
```

### Prop Details

#### `isHovered`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Controls the rotation animation. Set to `true` when the parent button is hovered.

#### `className`
- **Type**: `string`
- **Default**: `''`
- **Description**: Additional CSS classes to apply to the SVG element.

#### `size`
- **Type**: `number`
- **Default**: `24`
- **Description**: The width and height of the icon in pixels.

## Usage Examples

### Basic Usage

```tsx
import { AnimatedSignInIcon } from './components/AnimatedSignInIcon';

function SignInButton() {
  return (
    <button className="sign-in-button">
      <AnimatedSignInIcon />
      <span>Sign In</span>
    </button>
  );
}
```

### With Hover State

```tsx
import { useState } from 'react';
import { AnimatedSignInIcon } from './components/AnimatedSignInIcon';

function SignInButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="sign-in-button"
    >
      <AnimatedSignInIcon isHovered={isHovered} />
      <span>Sign In</span>
    </button>
  );
}
```

### Custom Size

```tsx
<AnimatedSignInIcon size={32} />
```

### With Custom Styling

```tsx
<AnimatedSignInIcon
  className="text-blue-500 drop-shadow-lg"
  size={28}
/>
```

## Animation Behavior

### Slide-In Animation

The slide-in animation triggers automatically on these occasions:
- **Initial Load**: 500ms after component mounts
- **Periodic**: Every 6 seconds thereafter

**Animation Details:**
- **Duration**: 600ms
- **Timing Function**: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bouncy easing)
- **Properties**: `translateX`, `scale`, `opacity`

**Keyframe Breakdown:**
```css
0%   → translateX(-100px) scale(0.8) opacity(0)
50%  → opacity(1)
100% → translateX(0) scale(1) opacity(1)
```

### Rotation Animation

The rotation animation triggers on hover:
- **Duration**: 500ms
- **Timing Function**: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bouncy easing)
- **Rotation**: 360° clockwise
- **Transform Origin**: `center`

## Customization

### CSS Variables

The component uses CSS custom properties for easy customization:

```css
:root {
  /* Animation durations */
  --icon-slide-duration: 0.6s;
  --icon-rotate-duration: 0.5s;

  /* Positioning */
  --icon-position-left: calc(50% - 70px);
}
```

### Override Example

```tsx
<style>{`
  :root {
    --icon-slide-duration: 0.8s;
    --icon-rotate-duration: 0.7s;
    --icon-position-left: calc(50% - 80px);
  }
`}</style>

<AnimatedSignInIcon />
```

## Accessibility

### Reduced Motion Support

The component automatically respects user preferences for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  .sign-in-icon {
    transition: none !important;
    animation: none !important;
  }
}
```

When `prefers-reduced-motion: reduce` is enabled:
- Slide-in animation is disabled
- Rotation animation is disabled
- Icon appears statically

### Screen Reader Support

The icon is decorative and properly hidden from screen readers:
- `aria-hidden="true"` prevents screen reader announcement
- `role="img"` provides semantic meaning for the SVG
- Button text provides the actual accessible label

## Performance Optimization

### GPU Acceleration

The component uses GPU-accelerated properties exclusively:
- ✅ `transform` (translateX, rotate, scale)
- ✅ `opacity`
- ❌ No layout-triggering properties (width, height, left, top)

### Will-Change Hint

```css
.sign-in-icon {
  will-change: transform;
}
```

The `will-change` property informs the browser to optimize for transform animations.

### Timer Management

The component properly manages timers to prevent memory leaks:
```typescript
useEffect(() => {
  const initialTimer = setTimeout(...);
  const interval = setInterval(...);

  // Cleanup on unmount
  return () => {
    clearTimeout(initialTimer);
    clearInterval(interval);
  };
}, []);
```

## Theme Integration

The icon works seamlessly with the RGR theme system:

### Dark Theme
```css
:root.dark .sign-in-icon svg {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}
```

### Light Theme
```css
.sign-in-icon svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}
```

### Current Color Inheritance

The icon uses `stroke="currentColor"` to inherit the text color from its parent:
```tsx
<svg stroke="currentColor">
```

This ensures the icon matches the button's text color in both themes.

## Integration with LoginFormCard

### File Structure
```
packages/web/src/pages/login/components/
├── LoginFormCard.tsx          # Parent component
├── AnimatedSignInIcon.tsx     # Icon component
└── __tests__/
    └── AnimatedSignInIcon.test.tsx
```

### Integration Example

```tsx
// LoginFormCard.tsx
import { useState } from 'react';
import { AnimatedSignInIcon } from './AnimatedSignInIcon';

export function LoginFormCard() {
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setIsButtonHovered(true)}
      onMouseLeave={() => setIsButtonHovered(false)}
      className="chrome-button"
    >
      <span className="chrome-button-content">
        <AnimatedSignInIcon isHovered={isButtonHovered} />
        <span>Sign In</span>
      </span>
    </button>
  );
}
```

## Testing

### Test Coverage

The component includes comprehensive tests:
- ✅ Rendering with default and custom props
- ✅ Animation state transitions
- ✅ Timer management and cleanup
- ✅ Accessibility attributes
- ✅ CSS injection and styling
- ✅ Performance optimizations
- ✅ SVG structure and attributes

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test File Location
```
packages/web/src/pages/login/components/__tests__/AnimatedSignInIcon.test.tsx
```

## Browser Support

The component uses modern CSS features and should work in:
- ✅ Chrome/Edge 88+
- ✅ Firefox 78+
- ✅ Safari 14+
- ✅ Opera 74+

### Fallback Behavior

For browsers that don't support certain features:
- Animations gracefully degrade to static icon
- Core functionality (button clicking) remains intact
- No JavaScript errors occur

## Troubleshooting

### Icon Not Animating

**Problem**: Icon appears static without animations.

**Solutions**:
1. Check if `prefers-reduced-motion` is enabled in OS settings
2. Verify parent component passes `isHovered` prop correctly
3. Check browser developer tools for CSS conflicts
4. Ensure component is not inside a loading state

### Icon Position Wrong

**Problem**: Icon is not positioned correctly relative to text.

**Solutions**:
1. Adjust `--icon-position-left` CSS variable
2. Ensure parent has `position: relative`
3. Check for conflicting absolute positioning

### Performance Issues

**Problem**: Animations are janky or stuttering.

**Solutions**:
1. Check if browser is hardware-accelerated
2. Reduce number of simultaneous animations on page
3. Verify no heavy JavaScript blocking the main thread
4. Check browser performance profiler for bottlenecks

## Future Enhancements

Potential improvements for future iterations:

1. **Animation Variants**: Additional animation styles (fade, bounce, pulse)
2. **Configurable Timing**: Props to customize animation durations and delays
3. **Custom Icons**: Support for different icon types (chevron, arrow variants)
4. **Sound Effects**: Optional audio feedback on animation/hover
5. **Haptic Feedback**: Vibration on mobile devices
6. **Animation Sequencing**: Complex multi-step animation choreography

## Related Components

- **LoadingSpinner**: Loading indicator for button states
- **ThemedInput**: Form inputs with theme support
- **VisionTopNav**: Navigation with similar animation patterns

## Version History

### v1.0.0 (2026-01-03)
- Initial release
- Slide-in animation every 6 seconds
- 360° rotation on hover
- Accessibility support with `prefers-reduced-motion`
- Theme compatibility (light/dark)
- Comprehensive test coverage

## License

Part of the RGR Fleet Manager project.
