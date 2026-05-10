# Business Context

## Product Vision
Tu turno digital is a multi-tenant SaaS for service businesses (barbershops, salons, clinics, studios) that need a modern booking experience and an operational backoffice.

The product must solve two connected problems:
- Public booking for end customers (fast, mobile-first, low friction).
- Internal operations for staff and owners (availability, capacity, services, analytics).

Long-term objective:
- Become an operating system for appointment-based businesses in Latin America, starting with SMBs and then scaling to chains/franchises.

## Target Users
- **Tenant Owner (Business Admin)**: configures business profile, services, team, schedules, billing.
- **Staff Member**: manages assigned schedule, accepts/updates appointments.
- **Reception/Manager**: supervises calendar occupancy and customer communications.
- **End Customer**: books appointments from public booking page without needing backoffice access.

## Core Business Flows
- **Tenant onboarding**: create tenant, configure branding/timezone/contact channels.
- **Service setup**: define services, duration, pricing, buffers, resources.
- **Availability setup**: define working hours, breaks, exceptions, holidays.
- **Booking flow**: customer selects service -> staff/resource -> slot -> confirmation.
- **Operations flow**: reschedule/cancel/no-show handling, reminders, status transitions.
- **Insight flow**: occupancy, revenue, repeat customers, channel effectiveness.

## Multi-Tenant Business Rules
- Every business entity belongs to exactly one tenant (`Business`).
- No cross-tenant data reads/writes are allowed.
- Public booking must only expose the selected tenant inventory.
- Admin actions are constrained by tenant membership and role.

## Access and Role Rules
- Minimum roles:
  - `OWNER`: full tenant control.
  - `MANAGER`: operational management.
  - `STAFF`: own schedule + assigned bookings.
- Role checks are enforced in API, not only in UI.

## Operational Rules
- Time is stored in UTC and rendered by tenant timezone.
- Overbooking is prevented by slot capacity + resource availability.
- Deletions should be soft-delete when historical reporting is needed.
- Audit-critical actions (cancel, reassignment, price changes) should be traceable.

## Non-Goals (Current Stage)
- No marketplace across multiple businesses.
- No enterprise SSO at MVP stage.
- No custom plugin system yet.

## KPIs
- Booking conversion rate (public page).
- Slot occupancy by day/week.
- Cancellation/no-show rate.
- Revenue per staff and per service.
- Customer repeat rate.
