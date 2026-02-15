# Login Components

This directory contains all components related to the login functionality.

## Components

### AnimatedSignInIcon

**File**: `AnimatedSignInIcon.tsx`

Animated icon component for the sign-in button with slide-in and rotation animations.

**Features:**
- Slide-in animation every 6 seconds
- 360° rotation on button hover
- GPU-accelerated animations
- Full accessibility support (prefers-reduced-motion)
- Theme-aware (works in light/dark modes)

**Usage:**
```tsx
import { AnimatedSignInIcon } from './AnimatedSignInIcon';

function MyButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatedSignInIcon isHovered={isHovered} size={24} />
      <span>Sign In</span>
    </button>
  );
}
```

**Props:**
- `isHovered?: boolean` - Controls rotation animation
- `size?: number` - Icon size in pixels (default: 24)
- `className?: string` - Additional CSS classes

**Documentation:**
- Component API: [AnimatedSignInIcon.md](./AnimatedSignInIcon.md)
- Architecture: [/docs/architecture/animated-icon-system.md](/docs/architecture/animated-icon-system.md)
- Visual Guide: [/docs/architecture/animated-icon-visual-guide.md](/docs/architecture/animated-icon-visual-guide.md)
- Diagram: [/docs/architecture/animated-icon-architecture-diagram.txt](/docs/architecture/animated-icon-architecture-diagram.txt)

**Tests:**
- Test file: `__tests__/AnimatedSignInIcon.test.tsx`
- Coverage: 100% (24/24 tests passing)
- Run: `npm run test -- AnimatedSignInIcon.test.tsx`

---

### LoginFormCard

**File**: `LoginFormCard.tsx`

Main login form component with email, password inputs, and sign-in button.

**Features:**
- Email and password inputs with validation
- Remember me checkbox
- Forgot password link
- Chrome-styled sign-in button with animated icon
- Theme support (light/dark)
- Loading state handling

**Usage:**
```tsx
import { LoginFormCard } from './LoginFormCard';

<LoginFormCard
  state={loginState}
  actions={loginActions}
  ButtonComponent={Button}
  onForgotPassword={handleForgotPassword}
  isDark={isDarkTheme}
/>
```

---

### ThemedInput

**File**: `ThemedInput.tsx`

Themed input component for form fields.

**Features:**
- Theme-aware styling
- Label support
- Validation states
- Autofill support
- Placeholder styling

---

### LoadingSpinner

**File**: `LoadingSpinner.tsx`

Loading spinner for button states.

**Features:**
- Animated spinner
- Theme-aware
- Accessible (aria-live)

---

## File Structure

```
login/components/
├── AnimatedSignInIcon.tsx          # Animated icon component
├── AnimatedSignInIcon.md           # Component documentation
├── LoginFormCard.tsx               # Main form component
├── ThemedInput.tsx                 # Themed input component
├── LoadingSpinner.tsx              # Loading spinner
├── README.md                       # This file
└── __tests__/
    └── AnimatedSignInIcon.test.tsx # Icon component tests
```

## Development

### Running Tests

```bash
# Run all login component tests
npm run test -- src/pages/login/components

# Run specific test file
npm run test -- AnimatedSignInIcon.test.tsx

# Run with coverage
npm run test:coverage
```

### Type Checking

```bash
npm run typecheck
```

### Building

```bash
npm run build
```

## Related Documentation

- [Login Page Architecture](/packages/web/src/pages/login/README.md)
- [Animated Icon System](/docs/architecture/animated-icon-system.md)
- [RGR Theme System](/packages/web/src/index.css)
- [Project Architecture](/docs/ARCHITECTURE.md)

## Design Patterns

### Atomic Design

Components follow atomic design methodology:
- **Atoms**: `AnimatedSignInIcon`, `ThemedInput`, `LoadingSpinner`
- **Organisms**: `LoginFormCard`

### Composition

Components use composition patterns:
- Props for customization
- Children for content
- Render props where appropriate
- Custom hooks for logic

### State Management

- Local state with `useState`
- Effect management with `useEffect`
- Controlled components
- Proper cleanup

### Performance

- GPU-accelerated animations
- Memoization where beneficial
- Lazy loading
- Tree-shakeable exports

### Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- Reduced motion support
- ARIA attributes

## Contributing

When adding new components:

1. Follow atomic design principles
2. Include TypeScript types
3. Write comprehensive tests
4. Add documentation
5. Ensure accessibility
6. Optimize performance
7. Support themes

## Support

For questions or issues:
1. Check component documentation
2. Review architecture docs
3. Examine test examples
4. Consult this README

---

**Last Updated**: 2026-01-03
**Maintainer**: RGR Fleet Manager Team
