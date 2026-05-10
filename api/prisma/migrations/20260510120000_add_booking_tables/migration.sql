-- CreateTable
CREATE TABLE `business_services` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `durationMin` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `depositMode` ENUM('none', 'fixed', 'percent') NOT NULL DEFAULT 'none',
    `depositValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `business_services_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_members` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `bio` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `staff_members_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_services` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `staff_services_staffId_serviceId_key`(`staffId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `durationMin` INTEGER NOT NULL,
    `status` ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_code_key`(`code`),
    INDEX `bookings_businessId_startsAt_idx`(`businessId`, `startsAt`),
    INDEX `bookings_staffId_startsAt_idx`(`staffId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `business_services` ADD CONSTRAINT `business_services_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `staff_members` ADD CONSTRAINT `staff_members_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `staff_services` ADD CONSTRAINT `staff_services_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `staff_services` ADD CONSTRAINT `staff_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `business_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `bookings` ADD CONSTRAINT `bookings_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `bookings` ADD CONSTRAINT `bookings_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `business_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `bookings` ADD CONSTRAINT `bookings_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
