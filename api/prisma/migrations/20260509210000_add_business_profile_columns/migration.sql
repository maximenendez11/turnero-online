-- Columnas del modelo `Business` en schema.prisma que no estaban en migraciones anteriores
-- (evita P2022 al consultar negocio / reserva pública).
ALTER TABLE `businesses`
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'ARS',
    ADD COLUMN `whatsapp` VARCHAR(191) NULL,
    ADD COLUMN `instagram` VARCHAR(191) NULL,
    ADD COLUMN `openingHours` VARCHAR(191) NULL,
    ADD COLUMN `bookingIntervalMin` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `maxAppointmentsPerSlot` INTEGER NOT NULL DEFAULT 1;
