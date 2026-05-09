# Product Roadmap

## Phase 0 - Foundation (Now)
- Stabilize architecture and context docs.
- Keep current Stitch-inspired UI intact.
- Split monolithic UI into reusable components.
- Prepare integration boundaries for Supabase (ports/adapters).

## Phase 1 - MVP (High Priority)
- Tenant-aware auth (access/refresh tokens + role checks).
- Business membership model (`BusinessMember`).
- Core booking domain:
  - services,
  - staff availability,
  - appointment CRUD,
  - cancellation/reschedule rules.
- Public booking page by tenant slug.
- Basic operational dashboard KPIs.

## Phase 2 - Commercial Readiness
- Billing/subscription integration.
- Notifications (email/WhatsApp/SMS adapters).
- Tenant onboarding wizard.
- Basic audit log for critical actions.
- Better analytics and exportable reports.

## Phase 3 - Scale and Ecosystem
- Integrations (Google Calendar, Stripe, Zapier, CRM connectors).
- Multi-location and franchise support.
- Advanced permissions and approval workflows.
- Realtime updates for schedule and appointment state.

## Technical Milestones
- M1: frontend feature route structure complete.
- M2: backend modules aligned with Prisma entities.
- M3: tenancy guard + isolation test suite.
- M4: infra adapter layer for optional Supabase providers.

## Product Success Criteria
- >95% successful booking completion flow.
- <2s p95 public booking page interactive load.
- Zero cross-tenant data exposure incidents.
- Reduced manual scheduling effort for tenant operators.
