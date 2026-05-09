# Technical Architecture

## Architecture Goals
- Mobile-first UX with responsive layout from the first render.
- Strict TypeScript in frontend and backend.
- Clear separation between UI, application logic, and infrastructure.
- Strong tenant isolation by design.
- Incremental path for future Supabase integration.

## Current Runtime Topology
- `web/`: Angular standalone app (client).
- `api/`: NestJS API + Prisma data access.
- `docker/`: local MySQL and deployment-oriented containers.

## Target SaaS Architecture
Use a layered modular architecture in both apps.

### Frontend (`web/src/app`)
- `core/`: platform concerns (api client, auth/session, tenant context, interceptors, guards).
- `shared/ui/`: reusable presentational primitives (buttons, cards, inputs, section shells).
- `features/marketing/`: public landing and product content.
- `features/auth/`: login/register/password reset.
- `features/app/`: authenticated workspace (dashboard, bookings, settings).
- `features/public-booking/`: tenant public booking flow.

Rule:
- Components in `shared/ui` must not contain business logic.
- Business logic lives in feature services/facades/state.

### Backend (`api/src/app`)
- `common/`: filters, pipes, guards, decorators, base DTOs.
- `config/`: env parsing and config contracts.
- `tenancy/`: tenant resolution + tenant guard + tenant context provider.
- `auth/`: JWT access/refresh, role checks.
- `modules/*`: bounded contexts (`business`, `screen`, `slide`, `booking`, etc.).
- `infra/`: concrete adapters (Prisma, email provider, future Supabase integrations).

Rule:
- Controllers orchestrate request/response.
- Services contain business use-cases.
- Repositories/adapters isolate persistence concerns.

## Clean Boundaries
- UI components do not call HTTP directly if they are reusable; they receive inputs/outputs.
- Feature containers call facades/services.
- API services do not embed SQL logic outside repository/data adapters.

## Config and Environment Strategy
- Environment variables are required for secrets and runtime endpoints.
- Build-time constants are only fallback values.
- `ConfigService` should be the single source of truth for runtime URLs/keys on frontend.

## Future Supabase Integration Strategy
Do not couple business modules to Supabase SDK directly.

Use ports/adapters:
- Define ports/interfaces (`AuthPort`, `StoragePort`, `RealtimePort`) in app layer.
- Keep current implementation on Nest + Prisma + local providers.
- Add Supabase adapters in `infra/supabase/*` behind feature flags or env selection.

This enables:
- progressive migration (module by module),
- testing with mocks,
- no UI breakage.

## Deployment Shape (Recommended)
- `web`: static app behind CDN/reverse proxy.
- `api`: stateless Nest service.
- `db`: MySQL/Postgres managed instance.
- object storage for media.
- queue/worker for async notifications.

## Cross-Cutting Concerns
- Observability: request IDs, structured logs, error tracing.
- Security: rate limiting, secure CORS, helmet, validation pipes.
- Performance: pagination defaults, index strategy, lazy loading in UI.
