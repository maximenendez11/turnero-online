---
name: Deep Velocity
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is engineered for high-performance multi-tenant booking environments, blending the systematic rigor of Linear with the polished aesthetics of Stripe. The brand personality is authoritative yet approachable, prioritizing speed and clarity above all else.

The visual style is **Minimalist with Glassmorphism accents**. It utilizes a sophisticated dark-mode architecture where depth is established through tonal layering and subtle translucency rather than heavy shadows. The primary objective is to reduce cognitive load for users managing complex schedules, using generous whitespace and precise mathematical alignment to create a sense of calm and control.

## Colors

The palette is anchored in a "True Dark" philosophy. The base background is a deep charcoal (#121212), which provides a stable foundation for high-contrast elements. 

- **Primary Accent:** Electric Blue (#3B82F6) is used for active states, primary CTAs, and the 'completado' status.
- **Success/Secondary:** Emerald Green (#10B981) is reserved for success confirmations and the 'confirmado' status.
- **Surface Tiers:** Higher elevation surfaces move toward Zinc/Slate tones to create a clear visual hierarchy.
- **Status Indicators:** Each booking state is mapped to a high-chroma color to ensure instant recognition even at small scale on mobile devices.

## Typography

This design system utilizes **Inter** for its exceptional readability on low-light displays. The hierarchy is strictly enforced through weight and letter-spacing adjustments rather than just size.

Display headings feature tight tracking and bold weights to ground the page. Body text uses a slightly increased line height (1.6) to ensure long booking lists remain legible. "Label-caps" are used for secondary metadata and table headers to provide a structural contrast to the primary content.

## Layout & Spacing

A **mobile-first fluid grid** approach is used. The system follows a 4px baseline grid to ensure mathematical consistency across all components.

On mobile devices, the layout uses a single-column fluid structure with 16px side margins. On tablet and desktop, it transitions to a 12-column grid. Generous whitespace (the "xl" unit) is used between major sections to emphasize the minimalist aesthetic and prevent the interface from feeling "crowded" during high-volume booking periods.

## Elevation & Depth

Depth is communicated through **Tonal Layers** and **Glassmorphism**. 

1. **Floor:** The #121212 background.
2. **Cards:** Elevated to #1E1E1E with a 1px solid border of #2D2D30. Shadows are avoided in favor of these "ghost borders" to maintain a crisp, flat look.
3. **Overlays/Modals:** Utilize a backdrop-filter (blur: 12px) with a semi-transparent surface (#1E1E1E at 80% opacity). This creates a sense of spatial awareness, keeping the user contextually grounded in the booking flow.
4. **Active Elements:** Interactive components use a subtle glow effect (box-shadow: 0 0 15px rgba(59, 130, 246, 0.2)) when focused or active.

## Shapes

The shape language is **Soft** and precise. A standard border-radius of 0.25rem (4px) is applied to most small components (inputs, buttons) to maintain a professional, architectural feel. 

Larger containers like cards or modals use a 0.5rem (8px) radius to soften the overall appearance of the dashboard. This subtle rounding mimics the hardware of modern smartphones and laptops, reinforcing the premium SaaS aesthetic.

## Components

- **Buttons:** Primary buttons are high-contrast, using the Electric Blue background with white text. Ghost buttons use the Zinc border and are reserved for secondary actions.
- **Status Chips:** Small, pill-shaped indicators. For example, 'Pendiente' uses a 10% opacity amber background with a solid amber dot and text.
- **Booking Cards:** Feature a vertical accent bar on the left edge corresponding to the status color. They include a subtle hover state that lightens the background by 2%.
- **Input Fields:** Darker than the surface (#121212), with a 1px border that illuminates to Electric Blue on focus. Labels are always positioned above the field for mobile clarity.
- **Glass Overlays:** Used for mobile navigation drawers and desktop dropdowns, providing a sophisticated transition effect.
- **Empty States:** Use monochromatic line-art illustrations and centered typography to guide the user toward their first booking action.