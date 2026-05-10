-- Turnero: elimina pantallas/slides/staff y simplifica negocios, servicios y reservas (destructivo).

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `slide_conditions`;
DROP TABLE IF EXISTS `slide_media`;
DROP TABLE IF EXISTS `screen_slides`;
DROP TABLE IF EXISTS `slides`;
DROP TABLE IF EXISTS `screens`;
DROP TABLE IF EXISTS `business_images`;
DROP TABLE IF EXISTS `staff_services`;
DROP TABLE IF EXISTS `staff_members`;
DROP TABLE IF EXISTS `bookings`;

SET FOREIGN_KEY_CHECKS = 1;

-- Servicios: sin depósitos
ALTER TABLE `business_services`
    DROP COLUMN `depositMode`,
    DROP COLUMN `depositValue`;

-- Negocios: solo datos de turno + ubicación
ALTER TABLE `businesses`
    DROP COLUMN `currency`,
    DROP COLUMN `whatsapp`,
    DROP COLUMN `instagram`,
    DROP COLUMN `openingHours`,
    DROP COLUMN `postalCode`,
    DROP COLUMN `neighborhood`,
    DROP COLUMN `locality`,
    DROP COLUMN `province`,
    DROP COLUMN `country`,
    DROP COLUMN `maxAppointmentsPerSlot`;

-- Horarios estructurados por tramo
CREATE TABLE `business_opening_windows` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `startMin` INTEGER NOT NULL,
    `endMin` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `business_opening_windows_businessId_weekday_idx`(`businessId`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `business_opening_windows`
    ADD CONSTRAINT `business_opening_windows_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Reservas sin staff; cliente unificado
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `customerFullName` VARCHAR(191) NOT NULL,
    `customerContact` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `durationMin` INTEGER NOT NULL,
    `status` ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_code_key`(`code`),
    INDEX `bookings_businessId_startsAt_idx`(`businessId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `bookings`
    ADD CONSTRAINT `bookings_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `bookings`
    ADD CONSTRAINT `bookings_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `business_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
