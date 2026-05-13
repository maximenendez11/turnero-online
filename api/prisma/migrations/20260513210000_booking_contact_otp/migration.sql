-- CreateTable
CREATE TABLE `booking_contact_otps` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_contact_otps_business_id_email_created_at_idx`(`business_id`, `email`, `created_at`),
    INDEX `booking_contact_otps_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `booking_contact_otps` ADD CONSTRAINT `booking_contact_otps_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
