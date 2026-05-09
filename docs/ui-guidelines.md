# UI Guidelines

## UX Principles
- Mobile-first by default; desktop is an enhancement layer.
- Fast first interaction: clear CTA and reduced cognitive load.
- Consistent visual language across marketing, auth, and app workspace.
- Accessibility baseline: keyboard focus, contrast, semantic headings.

## Design System Foundations
- Use one typography family (`Inter`) and one icon system (`Material Symbols`).
- Keep a tokenized palette (background/surface/text/primary/secondary).
- Prefer semantic color variables instead of hardcoded hex in templates.

## Layout Rules
- Section containers should use consistent max-width and gutters.
- Vertical rhythm should be standardized (8px/16px scale).
- Sticky top app bar allowed for navigation continuity.

## Reusable UI Component Rules
Create and reuse primitives in `shared/ui`:
- `app-section-shell`
- `app-glass-card`
- `app-button` (`primary`, `secondary`, `ghost`)
- `app-input-field`
- `app-stat-tile`

Rules:
- Reusable components are presentational.
- Business actions are passed via inputs/outputs.
- Avoid copy-pasting large style blocks between feature components.

## UX Patterns by Area
- **Landing**: bold value proposition + social proof + clear CTA.
- **Auth**: short forms, explicit labels, visible states/errors.
- **Dashboard**: KPI hierarchy and action shortcuts.
- **Booking flow**: progress clarity (stepper), strong confirmation state.
- **Settings**: grouped forms with save feedback.

## Form Guidelines
- Labels always visible (no placeholder-only forms).
- Inline validation feedback near field.
- Submit button must show loading/disabled state while pending.

## Responsive Rules
- Start at narrow viewport and scale up.
- Use breakpoint behavior intentionally:
  - nav links collapse on mobile,
  - content stacks before it grids.
- Touch targets >= 40px visual affordance.

## Motion and Interaction
- Keep transitions subtle and purposeful.
- Use hover effects as enhancement; never required for core actions.
- Avoid excessive animation in operational screens.

## Do / Avoid
- Do: extract repeated section/card/button patterns.
- Do: keep text hierarchy clear with semantic heading levels.
- Avoid: embedding business logic in template-only helper hacks.
- Avoid: one giant page component for all screens.
