# Product Flows and Screen Map

## Scope
Platform type: multi-tenant SaaS appointment booking.

Design constraints preserved:
- premium SaaS look
- dark mode first
- Inter typography
- Stripe + Linear inspired UI
- soft rounded corners
- subtle depth with glass accents
- mobile-first layouts

## Current Screen Inventory

### Exported Stitch Screens
- `inicio_y_acceso`: marketing + access entry.
- `panel_principal`: business dashboard.
- `calendario_maestro`: operational calendar.
- `reserva_p_blica`: customer booking wizard.
- `configuraci_n_del_negocio`: business onboarding setup.

### Implemented in Angular (before expansion)
- `/` landing (`marketing/pages/landing`).

## Product Journeys

## Journey A: Business Owner / Subscriber

### A1. Auth and Access
1. `GET /auth/register`
2. `GET /auth/verify-email` (token-based result screen)
3. `GET /auth/login`
4. `GET /auth/forgot-password`
5. `GET /auth/reset-password`

### A2. Onboarding Wizard
1. `GET /onboarding/business-profile`
2. `GET /onboarding/business-media`
3. `GET /onboarding/services`
4. `GET /onboarding/schedule`
5. `GET /onboarding/payments`
6. `GET /onboarding/review`

### A3. Business App (Subscriber Workspace)
1. `GET /app/dashboard`
2. `GET /app/calendar`
3. `GET /app/appointments`
4. `GET /app/services`
5. `GET /app/staff`
6. `GET /app/customers`
7. `GET /app/notifications`
8. `GET /app/analytics`
9. `GET /app/subscription`
10. `GET /app/settings/business`

## Journey B: Customer / Client Booking

### B1. Customer Auth
1. `GET /c/auth/register`
2. `GET /c/auth/verify-email`
3. `GET /c/auth/login`
4. `GET /c/auth/forgot-password`

### B2. Booking Flow (Public by tenant)
1. `GET /:tenantSlug/book/service`
2. `GET /:tenantSlug/book/staff`
3. `GET /:tenantSlug/book/date-time`
4. `GET /:tenantSlug/book/confirm`
5. `GET /:tenantSlug/book/payment` (conditional if deposit required)
6. `GET /:tenantSlug/book/success/:bookingCode`

### B3. Customer Self-Service
1. `GET /:tenantSlug/manage/:bookingCode`
2. `GET /c/profile`
3. `GET /c/appointments`
4. `GET /c/favorites`

## Navigation Map

### Public
- `/` -> marketing landing
- CTA "Comenzar" -> `/auth/register`
- CTA "Acceso" -> `/auth/login`

### Owner authenticated
- `/app/dashboard` as default
- Top-level app nav:
  - Dashboard, Calendar, Appointments, Services, Staff, Customers, Analytics, Settings

### Customer public booking
- Tenant route prefix: `/:tenantSlug/book/*`
- sticky summary and stepper visible across steps

## Missing Flows and Edge Cases (Detected)

### Auth
- email not verified state
- expired verification link
- invalid reset token
- account locked / too many attempts

### Onboarding
- skip/resume onboarding
- partial save and continue later
- validation for missing required business data
- media upload failure/retry

### Calendar and booking operations
- slot conflict race condition
- timezone mismatch warnings
- blocked day and holiday handling
- employee unavailable/day off
- max appointments per slot reached

### Payments
- required deposit but payment failed
- refund policy accepted/rejected path
- free-booking vs paid-booking branch logic

### Customer booking
- invalid tenant slug
- no services configured
- no staff available
- no slots available
- selected slot expired before confirmation

## Required UI States Per Screen

All operational screens should define these minimum states:
- `loading`: skeleton cards/lists + disabled CTAs.
- `empty`: explanatory message + primary action.
- `error`: concise message + retry action.
- `success`: non-blocking confirmation feedback.

### Critical state examples
- Appointments list:
  - loading list skeleton
  - empty "No hay turnos hoy"
  - error "No se pudo cargar agenda"
- Booking wizard:
  - loading slots
  - empty "Sin horarios disponibles"
  - error payment confirmation
  - success with booking reference

## MVP Screen List (Production-Ready Baseline)

### Owner side MVP
- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/onboarding/business-profile`
- `/onboarding/services`
- `/onboarding/schedule`
- `/onboarding/payments`
- `/onboarding/review`
- `/app/dashboard`
- `/app/calendar`
- `/app/appointments`
- `/app/services`
- `/app/staff`
- `/app/customers`
- `/app/analytics`
- `/app/subscription`
- `/app/settings/business`

### Customer side MVP
- `/c/auth/login`
- `/c/auth/register`
- `/:tenantSlug/book/service`
- `/:tenantSlug/book/staff`
- `/:tenantSlug/book/date-time`
- `/:tenantSlug/book/confirm`
- `/:tenantSlug/book/payment` (conditional)
- `/:tenantSlug/book/success/:bookingCode`
- `/:tenantSlug/manage/:bookingCode`
- `/c/appointments`
- `/c/profile`

## Implementation Order
1. Foundation routes and shells (marketing, app, booking).
2. Owner auth screens.
3. Owner onboarding screens.
4. Owner dashboard + calendar + core resources.
5. Customer auth screens.
6. Customer booking wizard screens.
7. Shared empty/loading/error/success components.

This order reduces risk while preserving the design language and mobile-first behavior.
