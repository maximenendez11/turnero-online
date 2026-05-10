# Contexto de la aplicación — Turnero Online

## Qué es el producto

**Turnero Online** es una aplicación para **gestionar negocios que ofrecen turnos** y para que **clientes reserven en la web** sin asignar profesional: el comercio define **servicios** (nombre, descripción, duración, precio), **ventanas de apertura** por día de la semana y el cliente elige **fecha/hora** según disponibilidad.

**Fuera de alcance (no está en el modelo ni en el código):** pantallas digitales, slides, condiciones de reproducción, imágenes ligadas a ese flujo, staff por turno ni depósitos de reserva.

## Stack técnico

| Capa        | Tecnología |
|------------|------------|
| Monorepo   | **Nx** (`api` + `web`) |
| Frontend   | **Angular** 21, **PrimeNG** 21, standalone components, rutas lazy |
| Backend    | **NestJS** 11 |
| Datos      | **MySQL** + **Prisma** 5 |
| Tooling    | **pnpm**, ESLint, builds con targets Nx |

## Arquitectura del repo

- **`web/`**: SPA Angular (marketing, auth, onboarding, workspace placeholder, **reserva pública** por `/:tenantSlug/book/...`, área cliente `c/...`).
- **`api/`**: API REST NestJS bajo prefijo configurable; módulos por dominio (`public-booking`, `onboarding`, auth, prisma, etc.).
- **Reglas de código**: archivos fuente preferiblemente por debajo de 400 líneas; evitar monolitos; separar vista, estado, servicios HTTP y utilidades cuando crezca una pantalla.

## Dominio de datos (Prisma)

- **`User`**: autenticación y roles (`ADMIN` / `USER`).
- **`Business`**: identidad del negocio, `slug` público, dirección, `timezone`, `bookingIntervalMin`, estado.
- **`BusinessOpeningWindow`**: tramos por `weekday` (0 domingo … 6 sábado) con `startMin` / `endMin` y `sortOrder`; varios registros el mismo día = varios tramos; la pausa es el hueco entre tramos.
- **`BusinessService`**: catálogo de servicios reservables.
- **`Booking`**: turno con `startsAt`, servicio, `customerFullName`, `customerContact`, `code` único para enlaces públicos.

## Flujos principales

1. **Onboarding (usuario logueado)**: alta de negocio + primer servicio + intervalo de reserva; el backend crea ventanas de apertura por defecto (p. ej. lun–vie) hasta que exista UI de horarios avanzada.
2. **Reserva pública**: búsqueda/listado de negocios → elegir servicio → franjas disponibles (API según ventanas y solapes) → confirmar con nombre y contacto → código de reserva.
3. **Workspace (`/app/...`)**: shell de backoffice (dashboard, calendario, etc.) mayormente **placeholder**; el foco del dominio simplificado está en turnos/negocio y reserva pública.

## API (orientación)

- **`GET /public/businesses`**, **`GET /public/businesses/:slug`**, servicios, disponibilidad y **POST** de reservas bajo rutas públicas documentadas en `public-booking`.
- **`POST /onboarding/setup`**: cuerpo validado con `class-validator` (`forbidNonWhitelisted` activo en la app).

## Objetivos de diseño

- Escalabilidad por features y servicios acotados.
- Evitar componentes monolíticos; extraer subcomponentes y servicios cuando una pantalla crece.
- Favorecer piezas reutilizables (shared UI, guards, servicios HTTP).

## Documentación relacionada

- **`DESIGN.md`**: tokens de color y tipografía (tema oscuro tipo Material).
- **Plan de simplificación** (solo referencia): `.cursor/plans/simplificar-schema-prisma.plan.md` — describe el alcance “solo turnos + negocios”; no editar ese archivo salvo decisión explícita del equipo.
