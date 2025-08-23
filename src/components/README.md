# Components Architecture - Atomic Design System

This component library follows the Atomic Design methodology, creating a scalable and maintainable UI system for the Dawah Nigeria mobile app.

## Structure

```
src/components/
├── atoms/           # Basic building blocks
├── molecules/       # Simple groups of UI elements  
├── organisms/       # Complex UI components
├── templates/       # Page layouts (future)
└── index.ts         # Main exports
```

## Design System

### Design Tokens (`src/theme/designTokens.ts`)

- **Spacing**: 4px base unit (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- **Typography**: 8-step scale (xs: 12, sm: 14, base: 16, lg: 18, xl: 20, 2xl: 24, 3xl: 30, 4xl: 36)
- **Border Radius**: (sm: 4, md: 8, lg: 12, xl: 16, 2xl: 20, 3xl: 24, full: 9999)
- **Colors**: Semantic naming with brand, background, text, and semantic colors
- **Shadows**: 4-level elevation system
- **Hit Targets**: Minimum 44x44 for accessibility

## Components

### Atoms

Basic UI elements that can't be broken down further:

- **Text**: Typography component with variants (h1-h4, body, bodySmall, caption, overline)
- **Button**: Interactive button with variants (primary, secondary, outline, ghost, danger)
- **Icon**: Consistent icon wrapper with size and color controls
- **Badge**: Status and label indicators
- **Touchable**: Base touchable component with haptic feedback
- **Chip**: Selectable filter/tag components

### Molecules

Simple combinations of atoms:

- **SearchBar**: Input field with search and voice functionality
- **Card**: Content cards in square, landscape, and list variants

### Organisms

Complex UI sections:

- **Row**: Horizontal scrolling sections with headers and "see all" functionality
- **HeroCarousel**: Featured content carousel with autoplay
- **ActionGrid**: Grid of action buttons for navigation
- **MiniPlayer**: Persistent bottom player interface

## Accessibility Features

All components include:

- Proper accessibility labels and hints
- Minimum 44x44 hit targets
- Keyboard navigation support
- Screen reader compatibility
- High contrast color ratios
- Focus states

## Usage Examples

### Basic Usage

```tsx
import { Text, Button, Card, Row } from '@/components';

// Typography
<Text variant="h1" color="primary">Welcome</Text>

// Buttons
<Button variant="primary" size="large" onPress={handlePress}>
  Get Started
</Button>

// Cards
<Card 
  variant="square" 
  data={episode} 
  onPress={handleEpisodePress}
  showTime
  showBadge
/>

// Rows
<Row title="Featured Episodes" onSeeAll={handleSeeAll}>
  {episodes.map(episode => (
    <Card key={episode.id} variant="square" data={episode} />
  ))}
</Row>
```

### Using Design Tokens

```tsx
import { designTokens } from '@/theme/designTokens';

const styles = {
  container: {
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.background.primary,
    borderRadius: designTokens.borderRadius.xl,
    ...designTokens.shadows.md,
  }
};
```

## Migration Guide

### From Old Components

The refactored components maintain the same API for backward compatibility:

```tsx
// Old imports still work
import { Card, Row, SearchBar } from '@/components';

// New atomic imports also available
import { Card } from '@/components/molecules';
import { Text, Button } from '@/components/atoms';
import { Row } from '@/components/organisms';
```

### Breaking Changes

- Color props now use semantic names (`primary`, `muted`) instead of raw values
- Some spacing values have been normalized to the 4px grid
- Font weights use semantic names (`normal`, `medium`, `semibold`, `bold`)

## Best Practices

1. **Use semantic color names**: `color="primary"` instead of `color="#FFFFFF"`
2. **Follow the spacing scale**: Use design tokens for consistent spacing
3. **Provide accessibility labels**: Always include `accessibilityLabel` for interactive elements
4. **Use proper hit targets**: Ensure touchable areas are at least 44x44
5. **Maintain visual hierarchy**: Use the typography scale consistently
6. **Test with screen readers**: Verify accessibility labels and navigation flow

## Performance Optimizations

- All components are memoized where appropriate
- Images use `expo-image` for better performance
- Haptic feedback is optimized to avoid excessive calls
- Scroll performance is optimized with proper `scrollEventThrottle` values

## Future Enhancements

- Template components for common page layouts
- Dark mode support with automatic color switching
- Animation presets using the design token durations
- Form components with validation
- Data visualization components