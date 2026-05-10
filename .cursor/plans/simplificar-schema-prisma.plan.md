# Plan: esquema y código solo turnos + negocios

## Alcance del producto (aclaración)

Esta aplicación es **solo turnos y negocios**. Lo siguiente **no forma parte del proyecto** y se **elimina por completo** (schema Prisma, migraciones futuras, seed, API y front si hubiera restos):

- Pantallas (`Screen`)
- Slides (`Slide`, `SlideType`, `ConditionMode`, etc.)
- Relación pantalla–slide (`ScreenSlide`)
- Medios de slide (`SlideMedia`)
- Condiciones (`SlideCondition`, enums asociados)
- Imágenes de negocio ligadas a slides (`BusinessImage` en el rol actual del schema)

No se “archiva” ni se deja opcional: **sale del repo y de la base** (migración destructiva acordada).

## Dominio que permanece (objetivo)

- **Negocio:** dirección; **horarios** por días/tramos (ventanas por día, corrido o varios tramos; pausas = huecos entre tramos o tramos explícitos según modelo elegido en implementación); **servicios:** nombre, descripción, duración, precio.
- **Turno:** fecha/hora (`startsAt`), servicio asociado, datos de cliente (nombre completo + contacto unificado o dos campos, según decisión en implementación); **sin staff**.
- **Usuario** (`User`): se mantiene para auth/registro.

## Cambios técnicos (resumen)

1. **`api/prisma/schema.prisma`**: borrar modelos/enums del bloque pantallas/slides/imágenes/condiciones; simplificar `Business`, `BusinessService`, `Booking`; añadir modelo de **horario estructurado** (p. ej. `BusinessOpeningWindow`); quitar `StaffMember` / `StaffService` y `staffId` en reservas.
2. **Migración MySQL destructiva**: `DROP` en orden seguro de FKs de todo lo eliminado + `ALTER` de tablas que quedan.
3. **API**: [`public-booking`](api/src/app/public-booking/), [`onboarding`](api/src/app/onboarding/), [`seed`](api/prisma/seed.ts) sin staff ni rutas `/staff`.
4. **Web**: flujo de reserva sin paso staff; rutas y `PublicBookingApiService` alineados.

## Estrategia de datos

**Destructiva** (BD que se puede vaciar o recrear): sin backfill obligatorio de datos legacy de pantallas/slides.

## Orden de implementación

1. Schema + migración SQL.
2. `prisma generate` y API compilando.
3. Seed + onboarding.
4. Front reserva pública + rutas.
5. Builds `api` + `web` y prueba manual.

## Tareas

- [ ] Rediseñar `schema.prisma` (negocio + horarios + servicios + turnos; eliminar pantallas/slides/imágenes/staff).
- [ ] Migración destructiva MySQL.
- [ ] API pública + onboarding + seed.
- [ ] Angular: wizard sin staff + API.
- [ ] Verificar builds y flujo reserva.
