-- Catálogo de servicios: precio a definir, modalidades, seña, imágenes extra, staff elegible.

ALTER TABLE `business_services`
    ADD COLUMN `price_on_request` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `deposit_percent` INTEGER NULL,
    ADD COLUMN `modality_presencial` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `modality_online` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `modality_domicilio` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `scheduling_type` ENUM('regular', 'variable_date', 'cupos') NOT NULL DEFAULT 'regular',
    ADD COLUMN `reminder_clarifications` TEXT NULL,
    ADD COLUMN `image_url_2` VARCHAR(2048) NULL,
    ADD COLUMN `image_url_3` VARCHAR(2048) NULL;

CREATE TABLE `business_service_staff` (
    `service_id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NOT NULL,

    INDEX `business_service_staff_staff_id_idx`(`staff_id`),
    PRIMARY KEY (`service_id`, `staff_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `business_service_staff`
    ADD CONSTRAINT `business_service_staff_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `business_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `business_service_staff`
    ADD CONSTRAINT `business_service_staff_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `business_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
