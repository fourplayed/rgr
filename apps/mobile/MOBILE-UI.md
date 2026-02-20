# RGR Fleet Mobile UI Standards

This document defines the UI standards and patterns for the RGR Fleet mobile app, based on the login screen implementation. Use this as a reference for consistent UI development.

## Table of Contents

1. [Background & Layout](#background--layout)
2. [Logo & Branding](#logo--branding)
3. [Typography](#typography)
4. [Buttons](#buttons)
5. [Tab Bar](#tab-bar)
6. [Input Fields](#input-fields)
7. [Loading States](#loading-states)
8. [Spacing Scale](#spacing-scale)
9. [Color Palette](#color-palette)

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
| Colors | `['#C0C0C0', '#E8E8E8', '#F5F5F5']` |
| Locations | `[0, 0.5, 1]` |
| Direction | Top to bottom (`start: {x: 0, y: 0}`, `end: {x: 0, y: 1}`) |

**Behavior**: Chrome gradient flowing from top to bottom.

---

## Logo & Branding

### Animated Logo

The logo features a subtle 3D tilt animation that rotates side to side.

```tsx
const tiltAnim = useRef(new Animated.Value(-1)).current;

useEffect(() => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(tiltAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(tiltAnim, {
        toValue: -1,
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ])
  );
  animation.start();
  return () => animation.stop();
}, [tiltAnim]);

<Animated.View
  style={[
    styles.logoShadow,
    {
      transform: [
        { perspective: 1000 },
        {
          rotateY: tiltAnim.interpolate({
            inputRange: [-1, 1],
            outputRange: ['-4deg', '4deg'],
          }),
        },
      ],
    },
  ]}
>
  <Animated.Image
    source={require('../../assets/logo.png')}
    style={styles.logo}
    resizeMode="contain"
  />
</Animated.View>
```

### Logo Shadow

Hard shadow style for the logo container:

```tsx
logoShadow: {
  shadowColor: colors.navy,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.5,
  shadowRadius: 1,              // Hard shadow (low blur)
  zIndex: 10,
  elevation: 10,
}
```

### Logo Dimensions

```tsx
logo: {
  width: 360,
  height: 180,
}
```

| Property | Value |
|----------|-------|
| Animation duration | 3000ms per direction (6s full cycle) |
| Tilt range | -4° to +4° |
| Shadow blur | 1px (hard) |
| Shadow opacity | 0.5 |

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
  borderRadius: borderRadius.md,    // 12
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: spacing.lg,
  height: 48,                       // Fixed height for consistent loading state
  shadowColor: colors.navy,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.5,
  shadowRadius: 0,                  // Hard shadow
  elevation: 3,  // Android
}
```

### Usage

```tsx
<TouchableOpacity
  style={styles.button}
  onPress={handlePress}
  disabled={isLoading}
>
  <Text style={styles.buttonText}>BUTTON TEXT</Text>
</TouchableOpacity>
```

**Note**: Buttons maintain their visual appearance regardless of disabled state. Only disable during loading to prevent double-submission.

---

## Tab Bar

The bottom tab bar uses icon-only navigation with no labels.

### Tab Bar Configuration

```tsx
tabBarStyle: {
  backgroundColor: '#0000CC',
  borderTopWidth: 0,
  height: 70,
  paddingBottom: 10,
  paddingTop: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 10,
}
```

### Tab Icons

| Property | Value |
|----------|-------|
| Size | 32px |
| Active color | `#FFFFFF` |
| Inactive color | `#D1D5DB` |
| Labels | Hidden (`tabBarShowLabel: false`) |

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

### Placeholder Style

Placeholder text is displayed in italic. When the user enters text, the font style returns to normal.

```tsx
<TextInput
  style={[styles.input, !value && { fontStyle: 'italic' }]}
  placeholder="Enter your email address"
  placeholderTextColor="#6B7280"
  value={value}
  onChangeText={setValue}
/>
```

### Complete Input Group

```tsx
<View style={styles.inputGroup}>
  <Text style={styles.label}>Label</Text>
  <TextInput
    style={[styles.input, !value && { fontStyle: 'italic' }]}
    placeholder="Enter your email address"
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
  style={styles.button}
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  button: {
    backgroundColor: '#0000FF',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    height: 48,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 3,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});

// Input with italic placeholder
<TextInput
  style={[styles.input, !email && { fontStyle: 'italic' }]}
  placeholder="Enter your email address"
  placeholderTextColor={colors.textSecondary}
  value={email}
  onChangeText={setEmail}
/>
```
