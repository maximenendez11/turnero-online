# Coding Rules

## TypeScript Standards
- Enable and keep strict mode (`strict: true`) in all TS configs.
- Avoid `any`; use explicit interfaces/types and discriminated unions.
- Favor `readonly` for immutable inputs and constants.
- Use narrow return types for public methods.

## Naming Conventions
- Components: `FeatureThingComponent`.
- Services: `ThingService` or `ThingFacade`.
- DTOs: `CreateThingDto`, `UpdateThingDto`, `ThingResponseDto`.
- Files: kebab-case, one main symbol per file.

## Frontend Architecture Rules
- Separate container vs presentational components.
- Container components handle data fetching and orchestration.
- Presentational components receive data via `@Input` and emit `@Output`.
- Shared UI components cannot import feature services.

## Backend Architecture Rules
- Controller: HTTP transport only.
- Service: business use-cases.
- Repository/adapter: persistence/integration implementation.
- No direct persistence calls inside controllers.

## Multi-Tenant Safety Rules
- Every business-sensitive endpoint must resolve tenant context first.
- Tenant context must be used in all read/write filters.
- Add tests for cross-tenant isolation regressions.

## Reusability Rules
- If a UI pattern appears 2+ times, extract to `shared/ui`.
- If logic appears 2+ times, extract to shared service/helper.
- Keep utility functions pure when possible.

## Testing Rules
- Unit tests for domain/service logic.
- Integration tests for tenancy filters and role guards.
- E2E smoke tests for critical user journeys:
  - landing render,
  - auth flow,
  - booking creation.

## Error Handling
- Backend uses typed HTTP exceptions and consistent error shape.
- Frontend maps API errors to user-friendly messages.
- Never swallow errors silently.

## Performance and Quality
- Use lazy loading for feature routes.
- Avoid unnecessary re-renders and expensive pipes in templates.
- Run lint and build before merge.

## Review Checklist
- No duplicated components/styles.
- No tenant leaks.
- No business logic inside reusable UI primitives.
- No TODO-critical code in merged changes.
