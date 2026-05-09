-- Rediseño de relaciones entre businesses, screens, slides e imágenes

-- Crear tabla de relación entre pantallas y slides
CREATE TABLE `screen_slides` (
    `id` VARCHAR(191) NOT NULL,
    `screenId` VARCHAR(191) NOT NULL,
    `slideId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear tabla de relación entre slides y medios (imágenes / videos)
CREATE TABLE `slide_media` (
    `id` VARCHAR(191) NOT NULL,
    `slideId` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Añadir nuevas columnas para soportar el nuevo modelo
ALTER TABLE `slides`
    ADD COLUMN `businessId` VARCHAR(191) NULL,
    ADD COLUMN `title` VARCHAR(191) NULL;

ALTER TABLE `slide_conditions`
    ADD COLUMN `screenSlideId` VARCHAR(191) NULL;

-- Poblar `screen_slides` a partir de la relación actual 1:1 entre `slides` y `screens`
INSERT INTO `screen_slides` (`id`, `screenId`, `slideId`, `position`)
SELECT UUID(), `screenId`, `id`, `order`
FROM `slides`;

-- Poblar la nueva relación `slide_media` usando las filas existentes de `business_images`
INSERT INTO `slide_media` (`id`, `slideId`, `mediaId`, `order`)
SELECT UUID(), `slideId`, `id`, 0
FROM `business_images`;

-- Rellenar `businessId` en slides usando la relación actual con screens
UPDATE `slides` s
JOIN `screens` sc ON s.`screenId` = sc.`id`
SET s.`businessId` = sc.`businessId`;

-- Rellenar `screenSlideId` en slide_conditions apuntando al nuevo enlace screen_slide
UPDATE `slide_conditions` sc
JOIN `slides` s ON sc.`slideId` = s.`id`
JOIN `screen_slides` ss ON ss.`slideId` = s.`id` AND ss.`screenId` = s.`screenId`
SET sc.`screenSlideId` = ss.`id`;

-- Marcar columnas nuevas como NOT NULL una vez migrados los datos
ALTER TABLE `slides`
    MODIFY `businessId` VARCHAR(191) NOT NULL;

ALTER TABLE `slide_conditions`
    MODIFY `screenSlideId` VARCHAR(191) NOT NULL;

-- Crear claves foráneas para las nuevas relaciones
ALTER TABLE `slides`
    ADD CONSTRAINT `slides_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `screen_slides`
    ADD CONSTRAINT `screen_slides_screenId_fkey` FOREIGN KEY (`screenId`) REFERENCES `screens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `screen_slides_slideId_fkey` FOREIGN KEY (`slideId`) REFERENCES `slides`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `slide_media`
    ADD CONSTRAINT `slide_media_slideId_fkey` FOREIGN KEY (`slideId`) REFERENCES `slides`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `slide_media_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `business_images`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `slide_conditions`
    ADD CONSTRAINT `slide_conditions_screenSlideId_fkey` FOREIGN KEY (`screenSlideId`) REFERENCES `screen_slides`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Eliminar claves foráneas antiguas que ya no se usan
ALTER TABLE `slides` DROP FOREIGN KEY `slides_screenId_fkey`;
ALTER TABLE `business_images` DROP FOREIGN KEY `business_images_slideId_fkey`;
ALTER TABLE `slide_conditions` DROP FOREIGN KEY `slide_conditions_slideId_fkey`;

-- Limpiar columnas obsoletas
ALTER TABLE `slides`
    DROP COLUMN `screenId`,
    DROP COLUMN `fileUrl`;

ALTER TABLE `business_images`
    DROP COLUMN `slideId`;

ALTER TABLE `slide_conditions`
    DROP COLUMN `slideId`;

-- Índices de ayuda para consultas frecuentes
CREATE INDEX `screen_slides_screenId_idx` ON `screen_slides`(`screenId`);
CREATE INDEX `screen_slides_slideId_idx` ON `screen_slides`(`slideId`);
CREATE INDEX `slide_media_slideId_idx` ON `slide_media`(`slideId`);
CREATE INDEX `slide_media_mediaId_idx` ON `slide_media`(`mediaId`);
CREATE INDEX `slide_conditions_screenSlideId_idx` ON `slide_conditions`(`screenSlideId`);

