# Cursor Follower Component

An elegant, performant interactive cursor effect that enhances user experience with smooth animations and particle trails.

## Features

- **Smooth Cursor Tracking**: Uses requestAnimationFrame for 60fps animations
- **Particle Trail Effect**: Optional trailing particles that fade out gracefully
- **Accessibility Compliant**: Automatically respects `prefers-reduced-motion` setting
- **Performance Optimized**: Efficient rendering with minimal DOM operations
- **Fully Customizable**: Adjust size, color, opacity, delay, and trail effects
- **Responsive Design**: Works seamlessly across all screen sizes
- **Non-Intrusive**: Uses `pointer-events-none` to avoid interfering with page interactions
- **Universal Visibility**: Works on both light and dark backgrounds without blend modes

## Usage

```tsx
import CursorFollower from './components/CursorFollower';

function App() {
  return (
    <div>
      <CursorFollower />
      {/* Your content */}
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable the cursor follower |
| `size` | `number` | `24` | Base size of the cursor orb in pixels |
| `color` | `string` | `'#9333ea'` | Color of the cursor effect (hex, rgb, etc.) |
| `opacity` | `number` | `0.3` | Opacity of the effect (0-1) |
| `delay` | `number` | `0.15` | Delay factor for smooth following (0-1, lower = slower) |
| `showTrail` | `boolean` | `true` | Enable/disable particle trail effect |

## Customization Examples

### Subtle Blue Effect
```tsx
<CursorFollower
  size={28}
  color="#3b82f6"
  opacity={0.2}
  delay={0.12}
  showTrail={false}
/>
```

### Bold Pink with Trail (Current Implementation)
```tsx
<CursorFollower
  size={32}
  color="#ec4899"
  opacity={0.25}
  delay={0.15}
  showTrail={true}
/>
```

### Fast-Following Green Orb
```tsx
<CursorFollower
  size={20}
  color="#10b981"
  opacity={0.4}
  delay={0.25}
  showTrail={true}
/>
```

### Minimal White Glow
```tsx
<CursorFollower
  size={16}
  color="#ffffff"
  opacity={0.15}
  delay={0.1}
  showTrail={false}
/>
```

## Performance Considerations

- **requestAnimationFrame**: Uses browser's native animation API for optimal performance
- **Limited Trail Particles**: Maximum of 9 trail particles to prevent memory bloat
- **Efficient Updates**: Only updates when mouse moves, idle when static
- **GPU Acceleration**: Uses CSS transforms and blur for hardware acceleration
- **Conditional Rendering**: Automatically disabled for users with motion sensitivity

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+
- ⚠️ Mobile devices: Effect is disabled (no cursor on touch devices)

## Accessibility

The component automatically respects the user's `prefers-reduced-motion` system setting:

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

If the user has requested reduced motion, the entire effect is disabled to prevent discomfort or distraction.

## Technical Implementation

### Animation Loop
The component uses a smooth interpolation technique to create a "lagging" effect:

```javascript
const dx = mousePosition.x - prev.x;
const dy = mousePosition.y - prev.y;

return {
  x: prev.x + dx * delay,  // Smooth interpolation
  y: prev.y + dy * delay,
};
```

### Trail Effect
Particles are created randomly (30% chance per move) and fade out over time:

```javascript
if (showTrail && Math.random() > 0.7) {
  // Create new trail particle
  const newTrail = { x, y, id, opacity: 1 };
  // Fade out over 30ms intervals
  setInterval(() => {
    trail.opacity -= 0.05;
  }, 30);
}
```

### Visual Layers
1. **Outer Glow**: Large blurred radial gradient
2. **Core Orb**: Solid center with gradient
3. **Trail Particles**: Small fading circles

## Best Practices

1. **Works on All Backgrounds**: The effect is designed to be visible on both light and dark backgrounds
2. **Adjust for Brand**: Match the `color` prop to your brand's accent color
3. **Test Performance**: On complex pages, consider disabling the trail effect
4. **Respect User Preferences**: Never force-enable for users who prefer reduced motion
5. **Single Instance**: Only render one CursorFollower per application

## Troubleshooting

**Effect not visible:**
- Check that z-index isn't being covered by other elements (cursor uses z-9999)
- Ensure the color has sufficient opacity - try increasing the `opacity` value
- Verify that `prefers-reduced-motion` is not enabled in your browser settings
- The effect automatically disables on touch devices (mobile/tablet)

**Performance issues:**
- Disable trail effect: `showTrail={false}`
- Reduce size: `size={16}`
- Increase delay: `delay={0.2}`
- Consider disabling on low-end devices

**Not working on mobile:**
- This is expected behavior - mobile devices don't have cursor hover states
- The component automatically detects and disables on touch-only devices

## Future Enhancements

Potential improvements for future versions:
- Custom shape support (star, heart, etc.)
- Multiple color gradient support
- Interactive hover effects on clickable elements
- Velocity-based scaling
- Custom easing functions
