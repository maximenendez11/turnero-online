---
name: Deep Velocity
# Paleta y tokens estáticos de REFERENCIA (fallback del producto).
# Los colores “de marca” en flujo reserva + workspace admin son DINÁMICOS: ver sección “Runtime theme”.
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

The visual style is **Minimalist with Glassmorphism accents**. Depth comes from tonal layering and subtle translucency rather than heavy shadows. The primary objective is to reduce cognitive load for users managing complex schedules, using generous whitespace and precise alignment.

## Runtime theme (multi-tenant)

Each business can persist **two hex colors** (background + primary). At runtime the app injects a derived set of **CSS custom properties** so booking surfaces and the admin workspace stay on-brand without hard-coding that tenant’s palette.

| Concern | Source of truth |
|--------|------------------|
| Default hex fallbacks + generation rules | `web/src/app/features/booking/utils/booking-theme.utils.ts` |
| SCSS fallbacks aligned with this doc | `web/src/app/shared/styles/_design-tokens.scss` (`@use … as dv`) |
| Where vars are applied (shell) | Booking page + `WorkspaceThemeService` (same `buildBookingShellCssVars`) |

### CSS variables agents MUST use for themed UI

Use these for **reservation flow and workspace** screens that participate in the business theme. Always provide a fallback to design tokens so offline/default still renders.

| Token | Role |
|-------|------|
| `--booking-page-bg` | Page floor |
| `--booking-primary` | Primary accent, CTAs, key highlights |
| `--booking-on-primary` | Text/icons on primary (contrast is computed) |
| `--booking-text` | Main body text |
| `--booking-text-muted` | Secondary text |
| `--booking-text-hint` | Tertiary / hints |
| `--booking-surface` / `--booking-surface-2` | Raised surfaces |
| `--booking-border` | Hairline borders |
| `--booking-stepper-*` | Stepper track, todo fill, borders |

**SCSS pattern:** `var(--booking-primary, #{dv.$dv-primary})` (and the same idea for other tokens).

**Do not** assume a fixed blue such as Tailwind’s default blue for primary in these surfaces; derive from `--booking-primary` or mix with `color-mix(in srgb, var(--booking-primary, …) …)` as existing components do.

Surfaces and text colors adapt to **light vs dark** inferred from the chosen background luminance (see `relativeLuminance` in `booking-theme.utils.ts`).

### Static marketing / legacy notes

Some routes (e.g. landing) may still use local variables such as `--primary` for a fixed campaign look. That is **not** the same layer as `--booking-*`; when touching global marketing, confirm which stack applies.

## Colors (reference defaults)

The YAML frontmatter documents the **Deep Velocity** reference palette used when no tenant theme is applied and as SCSS fallbacks. It is **not** a guarantee of pixel-perfect hex at runtime for every business.

- **Primary accent:** Tenant-configurable; default reference is the blue-violet pair `primary` / `on-primary` in the YAML.
- **Success / secondary:** Semantic greens from the YAML apply to success and positive states where not overridden by product logic.
- **Surface tiers:** Neutral stacks above; elevated surfaces mix toward white/black depending on background luminance when using `--booking-*`.
- **Status indicators:** Booking states keep distinct hues for recognition on small screens; implement with semantic classes/chips, not a single brand primary.

## Typography

**Inter** for readability on low-light displays. Hierarchy uses weight and letter-spacing, not only size.

Display headings use tight tracking and bold weights. Body uses line height ~1.6 for long lists. **Label-caps** (see frontmatter) for metadata and table headers.

## Layout & Spacing

**Mobile-first** layout; **4px** baseline grid (see `spacing` in frontmatter).

Mobile: single column with **16px** side margins. Larger breakpoints: 12-column mental model; use **xl** spacing between major sections.

## Elevation & Depth

Depth is **tonal** and **glass**, not heavy drop shadows.

1. **Floor:** `--booking-page-bg` (or default `#131313`-class charcoal when vars unset).
2. **Cards / panels:** `--booking-surface` / `--booking-surface-2` with **1px** `--booking-border` “ghost” edges.
3. **Overlays / modals:** Backdrop blur (~12px) and semi-transparent surfaces; keep context visible.
4. **Active / focus:** Prefer a subtle glow using **`color-mix`** from `--booking-primary` (see sidebar / bookings SCSS), not a hard-coded rgba blue.

## Shapes

Soft, precise radii: **0.25rem** on small controls; **0.5rem** on cards/modals (see `rounded` in frontmatter).

## Components

- **Buttons:** Primary actions sit on `--booking-primary` with `--booking-on-primary` text. Secondary actions use neutral borders/surfaces from booking tokens.
- **Status chips:** Compact pills; map states to consistent semantic colors (amber/green/red etc.) independent of tenant primary where clarity requires it.
- **Booking cards:** Optional vertical accent using primary or status color; hover slightly lifts tone (existing patterns use mixes, not arbitrary hex).
- **Inputs:** Darker than surrounding surface; focus ring tied to `--booking-primary` where themed.
- **Glass overlays:** Drawers and dropdowns use blur + translucency.
- **Empty states:** Monochrome illustration + centered copy toward the next action.

## Agent / contributor checklist

1. **Themed screens:** style with `--booking-*` + SCSS fallback from `_design-tokens.scss`, not raw hex for primary/surface/text.
2. **Changing defaults:** update `booking-theme.utils.ts` **and** `_design-tokens.scss` **and** this YAML so the three stay aligned.
3. **Contrasts:** `pickOnPrimaryForHex` already picks light/dark text on primary; do not hardcode “white on primary” globally.
4. **New UI:** prefer `color-mix(in srgb, var(--booking-primary, …), …)` for hover/focus tints consistent with existing workspace components.
