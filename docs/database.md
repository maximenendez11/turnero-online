# Database and Tenancy Model

## Current Core Entities (Prisma)
- `User`
- `Business` (tenant anchor)
- `Screen`
- `Slide`
- `ScreenSlide` (join)
- `SlideMedia` (join)
- `BusinessImage`
- `SlideCondition`

## Relationship Overview
- `Business` 1..n `Screen`
- `Business` 1..n `Slide`
- `Business` 1..n `BusinessImage`
- `Screen` n..m `Slide` via `ScreenSlide`
- `Slide` n..m media via `SlideMedia`
- `Slide` 1..n `SlideCondition`

## Tenant Isolation Rules
- `Business` is the tenant root.
- Every mutable business entity must include `businessId`.
- Every query in application code must filter by `businessId` from tenant context.
- Composite uniques should include `businessId` where names/keys can repeat across tenants.

## Recommended Missing Entity
Add a membership model:
- `BusinessMember`
  - `id`
  - `businessId`
  - `userId`
  - `role` (`OWNER`, `MANAGER`, `STAFF`)
  - `status`
  - timestamps

Why:
- Current model does not explicitly map users to tenants.
- Membership is required for secure role-based tenant access.

## Data Integrity Rules
- Use foreign keys with `onDelete` policy aligned to business behavior.
- Use soft-delete for records required by analytics/audit.
- Keep audit fields (`createdAt`, `updatedAt`, optional `deletedAt`) consistent.
- Use explicit indexes for:
  - `businessId`,
  - booking datetime windows,
  - active status filters.

## Migration Rules
- Never run destructive resets in shared/prod environments.
- Use forward-only migrations for production.
- Validate migrations against staging data volume before release.

## Future Supabase Readiness
Even if Supabase is integrated later:
- keep Prisma schema as source of domain model truth (or migrate intentionally),
- avoid direct table access from UI,
- preserve tenant guardrails at service level.

## Query Safety Checklist
- Does query include `businessId`?
- Is role/membership validated?
- Is pagination present for list endpoints?
- Are soft-deleted records excluded by default?
