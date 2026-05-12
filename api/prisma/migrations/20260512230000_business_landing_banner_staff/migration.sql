-- Landing pública: banner, valoraciones, imágenes de servicios y equipo.
ALTER TABLE `businesses`
ADD COLUMN `banner_image_url` VARCHAR(2048) NULL,
ADD COLUMN `rating_average` DOUBLE NULL,
ADD COLUMN `rating_count` INT NOT NULL DEFAULT 0;

ALTER TABLE `business_services`
ADD COLUMN `image_url` VARCHAR(2048) NULL;

CREATE TABLE `business_staff` (
  `id` VARCHAR(191) NOT NULL,
  `business_id` VARCHAR(191) NOT NULL,
  `display_name` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NULL,
  `photo_url` VARCHAR(2048) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `business_staff_business_id_idx` (`business_id`),
  CONSTRAINT `business_staff_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
