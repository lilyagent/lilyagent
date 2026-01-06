# Lily Design System

## Brand Identity

**Lily** represents a modern, elegant, and nature-inspired AI agent marketplace on Solana. The design language combines botanical aesthetics with cutting-edge technology, creating a unique and memorable user experience.

---

## Color Palette

### Primary Colors

```css
--lily-white: #FFFFFF    /* Pure white for maximum contrast */
--lily-black: #0A0A0A    /* Deep black background */
--lily-cream: #F8F7F4    /* Warm neutral for cards and accents */
```

### Accent Colors (Lily-inspired)

```css
--lily-petal: #E8D5E0   /* Soft pink-purple - gentle, feminine touch */
--lily-stem: #7FA882    /* Muted sage green - primary brand color */
--lily-bloom: #C5A4D9   /* Light lavender - secondary accent */
--lily-dew: #A8D5E2     /* Soft sky blue - interactive elements */
```

### Functional Colors

```css
--lily-success: #7FA882  /* Uses lily-stem for consistency */
--lily-error: #E07A7A    /* Soft red, not harsh */
--lily-warning: #E0C47A  /* Warm amber */
--lily-info: #A8D5E2     /* Uses lily-dew for info states */
```

### Gray Scale

```css
--lily-gray-50: #FAFAFA
--lily-gray-100: #F5F5F5
--lily-gray-200: #EEEEEE
--lily-gray-300: #E0E0E0
--lily-gray-700: #424242
--lily-gray-800: #1F1F1F
--lily-gray-900: #141414
```

---

## Typography

### Font Family

```css
font-family: 'Inter', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'
```

We use Inter as the primary font for its excellent readability and modern appearance. System fonts are included as fallbacks for performance.

### Font Weights

- **Light (300)**: Used for large headings to maintain elegance
- **Regular (400)**: Body text and most UI elements
- **Medium (500)**: Buttons, labels, and emphasis

### Font Sizes

```css
- Hero: 4rem (64px)     /* Landing page hero text */
- H1: 3rem (48px)       /* Page titles */
- H2: 2rem (32px)       /* Section headings */
- H3: 1.5rem (24px)     /* Subsection headings */
- Body: 1rem (16px)     /* Default text */
- Small: 0.875rem (14px) /* Secondary text */
- Tiny: 0.75rem (12px)  /* Labels, metadata */
```

### Letter Spacing

- Headers: `tracking-wider` (0.05em)
- Body: Normal
- Labels: `tracking-wider` (0.05em)
- Monospace: `tracking-wide` (0.025em)

---

## Spacing System

Based on an 8px grid system for consistency:

```css
--space-xs: 0.5rem   /* 8px */
--space-sm: 1rem     /* 16px */
--space-md: 1.5rem   /* 24px */
--space-lg: 2rem     /* 32px */
--space-xl: 3rem     /* 48px */
--space-2xl: 4rem    /* 64px */
--space-3xl: 6rem    /* 96px */
```

**Usage Guidelines:**
- Component padding: 24px-32px (md-lg)
- Element margins: 16px-24px (sm-md)
- Section spacing: 48px-96px (xl-3xl)

---

## Border Radius

```css
--border-lily: 8px  /* Applied via rounded-lily class */
```

Consistent 8px border radius across all interactive elements (buttons, inputs, cards, modals) for a modern, approachable feel.

---

## Transitions

```css
--transition-smooth: 300ms
```

All interactive elements use 300ms transitions for:
- Color changes
- Border changes
- Background changes
- Opacity changes
- Transform changes

**Easing:** Default cubic-bezier or ease-in-out

---

## Component Patterns

### Buttons

#### Primary Button
```css
bg-lily-stem/10
border-lily-stem/50
hover:bg-lily-stem/20
hover:border-lily-stem
text-white
rounded-lily
transition-all duration-300
```

**Usage:** Main CTAs like "CREATE AGENT", "CONNECT", "LAUNCH"

#### Secondary Button
```css
bg-transparent
border-gray-800/50
hover:border-lily-stem/50
hover:text-lily-stem
text-gray-400
rounded-lily
transition-all duration-300
```

**Usage:** Secondary actions, navigation links

### Input Fields

```css
bg-transparent
border-gray-800/50
focus:border-lily-stem
text-gray-300
px-4 py-3
rounded-lily
transition-colors duration-300
```

**States:**
- Default: Semi-transparent gray border
- Focus: Lily stem green border
- Error: Error color border
- Disabled: Reduced opacity

### Cards

#### Dashboard Stats Card
```css
bg-black/40
backdrop-blur-sm
border-gray-800/50
hover:border-lily-{color}/50
hover:bg-black/60
p-6
rounded-lily
transition-all duration-300
group
```

Each stat card uses a different accent color on hover:
- Revenue: lily-stem
- Active Agents: lily-dew
- Executions: lily-bloom
- Marketplace: lily-petal

#### Agent/API Card
```css
bg-black/40
backdrop-blur-sm
border-gray-800/50
hover:border-lily-stem/50
hover:bg-black/60
p-6
rounded-lily
cursor-pointer
transition-all duration-300
```

### Navigation

```css
bg-black/85
backdrop-blur-md
border-b border-gray-800/50
```

**Active Link Indicator:**
- Text: white
- Underline: 2px lily-stem bar

**Inactive Links:**
- Text: gray-400
- Hover: lily-stem

### Modals

```css
bg-black/95
backdrop-blur-md
border-gray-800/50
rounded-lily
shadow-2xl
```

**Backdrop:**
```css
bg-black/80
backdrop-blur-sm
```

---

## Animation Guidelines

### Fade In
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Usage:** Page loads, modal appearances

### Slide Up
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Usage:** List items, cards

### Progress Indicators

**Loading Bar:**
```css
bg-gradient-to-r from-lily-stem to-lily-dew
```

**Pulse Indicator (Connected State):**
```css
bg-lily-stem
animate-pulse
```

---

## Accessibility

### Contrast Ratios

All text/background combinations meet WCAG AA standards:
- White on black: 21:1 (AAA)
- Gray-300 on black: 12:1 (AAA)
- Gray-400 on black: 9:1 (AAA)
- Lily-stem on black: 5:1 (AA)

### Focus States

All interactive elements have clear focus states using lily-stem:
```css
focus:outline-none
focus:border-lily-stem
```

### Interactive Element Sizes

- Minimum touch target: 44x44px
- Button padding: 16px horizontal, 12px vertical minimum

---

## Responsive Design

### Breakpoints

Following Tailwind's default breakpoints:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

### Mobile-First Approach

All components are designed mobile-first and enhanced for larger screens:
- Single column layouts on mobile
- Grid layouts expand on tablet/desktop
- Font sizes scale appropriately
- Touch-friendly spacing on mobile

---

## Logo Guidelines

### Current Status
Temporary placeholder logo at `/Y (5).svg`

### Future Implementation
When the new Lily logo is provided:

**Logo Sizes:**
- Navigation: 32px height (h-8)
- Landing Hero: 128-160px height (h-32 md:h-40)
- Loading Screen: 80px height (h-20)

**Logo Variants Needed:**
- Full color (primary)
- White (for dark backgrounds)
- Monochrome (for special cases)

**Placement:**
- Top-left navigation
- Center of loading screen
- Hero section of landing page

---

## Design Principles

### 1. Simplicity
Clean layouts, generous whitespace, minimal ornamentation

### 2. Elegance
Light font weights, subtle animations, refined color palette

### 3. Nature-Inspired
Botanical colors, organic feel, growth metaphors

### 4. Modern
Contemporary UI patterns, smooth transitions, glass morphism effects

### 5. Trust
Transparent pricing, clear CTAs, consistent interactions

---

## Usage Examples

### Creating a New Button

```tsx
<button className="text-xs font-medium tracking-wider text-white bg-lily-stem/10 hover:bg-lily-stem/20 transition-all duration-300 border border-lily-stem/50 hover:border-lily-stem px-4 py-2 rounded-lily">
  BUTTON TEXT
</button>
```

### Creating a New Card

```tsx
<div className="bg-black/40 backdrop-blur-sm border border-gray-800/50 p-6 hover:border-lily-stem/50 hover:bg-black/60 transition-all duration-300 rounded-lily group">
  {/* Card content */}
</div>
```

### Creating a New Input

```tsx
<input
  type="text"
  className="w-full bg-transparent border border-gray-800/50 px-4 py-3 text-gray-300 focus:outline-none focus:border-lily-stem transition-colors duration-300 rounded-lily"
  placeholder="Enter text..."
/>
```

---

## Brand Voice

When writing copy for the Lily platform:

- **Tone:** Professional yet approachable
- **Style:** Clear, concise, empowering
- **Language:** Technical when needed, but never obscure
- **Values:** Innovation, transparency, growth, community

**Example Headlines:**
- "Build, Deploy, Grow" (not "Revolutionary AI Platform")
- "Instant Payments, No Subscriptions" (clear value proposition)
- "Your Agents, Your Rules" (empowering)

---

## File Structure

```
src/
├── index.css                 # Global styles and animations
├── components/
│   ├── Navigation.tsx        # Main navigation with Lily styling
│   ├── WalletConnect.tsx     # Wallet modal with Lily colors
│   ├── CreateAgentModal.tsx  # Agent creation flow
│   └── LoadingScreen.tsx     # Branded loading experience
└── pages/
    ├── Landing.tsx           # Hero section with brand identity
    ├── Dashboard.tsx         # Stats cards with accent colors
    └── Marketplace.tsx       # Product grid with Lily styling
```

---

## Maintenance

### Regular Reviews
- Quarterly design system audit
- User feedback integration
- Performance optimization
- Accessibility testing

### Updates
- Document all changes to this guide
- Notify team of breaking changes
- Maintain backward compatibility where possible
- Version control for major updates

---

## Resources

### Design Tools
- Figma: [Future link to design files]
- Tailwind Config: `tailwind.config.js`
- CSS Variables: `src/index.css`

### External References
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Inter Font Family](https://rsms.me/inter/)

---

**Last Updated:** 2026-01-02
**Version:** 1.0.0
**Maintained By:** Development Team
