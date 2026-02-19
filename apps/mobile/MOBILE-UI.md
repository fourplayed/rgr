# RGR Fleet Mobile UI Standards

This document defines the UI standards and patterns for the RGR Fleet mobile app, based on the login screen implementation. Use this as a reference for consistent UI development.

## Table of Contents

1. [Background & Layout](#background--layout)
2. [Typography](#typography)
3. [Buttons](#buttons)
4. [Input Fields](#input-fields)
5. [Loading States](#loading-states)
6. [Spacing Scale](#spacing-scale)
7. [Color Palette](#color-palette)

---

## Background & Layout

The app uses a gradient background that transitions from brand blue to chrome.

### Gradient Configuration

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

<LinearGradient
  colors={[...colors.gradientColors]}
  locations={[...colors.gradientLocations]}
  style={styles.container}
>
  {/* Content */}
</LinearGradient>
```

### Gradient Values

| Property | Value |
|----------|-------|
| Colors | `['#0000CC', '#0000CC', '#E8E8E8', '#E8E8E8']` |
| Locations | `[0, 0.01, 0.5, 1]` |

**Behavior**: Solid blue for first 1%, transition from 1% to 50%, solid chrome from 50% to 100%.

---

## Typography

### Font Family

The primary font is **Lato Bold** (`Lato_700Bold`).

```tsx
import { useFonts, Lato_700Bold } from '@expo-google-fonts/lato';

const [fontsLoaded] = useFonts({
  Lato_700Bold,
});
```

### Labels

Used for form field labels and section headers.

```tsx
label: {
  fontSize: fontSize.sm,        // 14px
  fontFamily: 'Lato_700Bold',
  fontWeight: fontWeight.bold,  // '700'
  color: '#000000',
  textTransform: 'uppercase',
  letterSpacing: 1,
}
```

### Button Text

```tsx
buttonText: {
  fontSize: fontSize.lg,        // 18px
  fontFamily: 'Lato_700Bold',
  fontWeight: fontWeight.bold,  // '700'
  color: '#FFFFFF',
  textTransform: 'uppercase',
}
```

### Font Size Scale

| Key | Value |
|-----|-------|
| `xs` | 12px |
| `sm` | 14px |
| `base` | 16px |
| `lg` | 18px |
| `xl` | 20px |
| `2xl` | 24px |
| `3xl` | 30px |
| `4xl` | 36px |

---

## Buttons

### Primary Button

```tsx
button: {
  backgroundColor: '#0000FF',
  paddingVertical: spacing.base,    // 16
  borderRadius: borderRadius.md,    // 12
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
  elevation: 8,  // Android
}
```

### Disabled State

```tsx
buttonDisabled: {
  backgroundColor: '#D1D5DB',
  shadowOpacity: 0,
  elevation: 0,
}
```

### Usage

```tsx
<TouchableOpacity
  style={[styles.button, disabled && styles.buttonDisabled]}
  onPress={handlePress}
  disabled={disabled}
>
  <Text style={styles.buttonText}>BUTTON TEXT</Text>
</TouchableOpacity>
```

---

## Input Fields

### Standard Text Input

```tsx
input: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: borderRadius.md,      // 12
  paddingHorizontal: spacing.base,    // 16
  paddingVertical: spacing.md,        // 12
  fontSize: fontSize.base,            // 16
  color: '#111827',
}
```

### Placeholder Color

```tsx
<TextInput
  placeholderTextColor="#6B7280"
  // ...
/>
```

### Complete Input Group

```tsx
<View style={styles.inputGroup}>
  <Text style={styles.label}>Label</Text>
  <TextInput
    style={styles.input}
    placeholder="Placeholder text"
    placeholderTextColor="#6B7280"
    value={value}
    onChangeText={setValue}
  />
</View>

// Styles
inputGroup: {
  gap: spacing.sm,  // 8
}
```

---

## Loading States

### LoadingDots Component

A custom loading indicator with 3 animated dots. Use this instead of button text during loading states.

```tsx
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1.2],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}
```

### Animation Properties

| Property | Value |
|----------|-------|
| Dot diameter | 10px |
| Dot color | `#FFFFFF` |
| Scale range | 0.6 → 1.2 |
| Opacity range | 0.4 → 1.0 |
| Stagger delay | 150ms between dots |
| Animation duration | 300ms per direction |

### Usage in Button

```tsx
<TouchableOpacity
  style={[styles.button, isLoading && styles.buttonDisabled]}
  onPress={handlePress}
  disabled={isLoading}
>
  {isLoading ? <LoadingDots /> : <Text style={styles.buttonText}>Submit</Text>}
</TouchableOpacity>
```

---

## Spacing Scale

Import from `../theme/spacing`:

```tsx
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/spacing';
```

### Spacing Values

| Key | Value | Use Case |
|-----|-------|----------|
| `xs` | 4px | Tight spacing, icons |
| `sm` | 8px | Input group gaps, small margins |
| `md` | 12px | Input padding vertical |
| `base` | 16px | Standard padding, input horizontal |
| `lg` | 20px | Form gaps, button margin top |
| `xl` | 24px | Content padding, section margins |
| `2xl` | 32px | Large sections |
| `3xl` | 48px | Major section breaks |
| `4xl` | 64px | Page-level spacing |

### Border Radius Values

| Key | Value |
|-----|-------|
| `none` | 0 |
| `sm` | 4px |
| `base` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 24px |
| `full` | 9999px |

---

## Color Palette

Import from `../theme/colors`:

```tsx
import { colors } from '../theme/colors';
```

### Brand Colors

| Key | Value | Description |
|-----|-------|-------------|
| `navy` | `#000030` | Dark navy brand color |
| `electricBlue` | `#00A8FF` | Accent blue |
| `chrome` | `#E8E8E8` | Light gray/chrome |

### UI Colors

| Key | Value | Description |
|-----|-------|-------------|
| `background` | `#FFFFFF` | Primary background |
| `backgroundDark` | `#0000CC` | Dark background (gradient blue) |
| `surface` | `#F8FAFC` | Card/surface background |
| `border` | `#E2E8F0` | Standard borders |

### Text Colors

| Key | Value | Description |
|-----|-------|-------------|
| `text` | `#1E293B` | Primary text |
| `textSecondary` | `#64748B` | Secondary/muted text |
| `textInverse` | `#FFFFFF` | Text on dark backgrounds |

### Semantic Colors

| Key | Value | Description |
|-----|-------|-------------|
| `success` | `#22C55E` | Success states |
| `warning` | `#F59E0B` | Warning states |
| `error` | `#EF4444` | Error states |
| `info` | `#3B82F6` | Info states |

### Status Colors

For asset and maintenance status indicators:

```tsx
colors.status.active       // #22C55E
colors.status.maintenance  // #F59E0B
colors.status.outOfService // #EF4444
colors.status.retired      // #6B7280
colors.status.inspection   // #3B82F6
```

---

## Quick Reference

### Complete Login Form Example

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Lato_700Bold } from '@expo-google-fonts/lato';
import { colors } from '../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../theme/spacing';

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: '#111827',
  },
  button: {
    backgroundColor: '#0000FF',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
```
