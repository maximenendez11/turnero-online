-- CreateTable
CREATE TABLE `business_images` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `slideId` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `sizeBytes` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `business_images` ADD CONSTRAINT `business_images_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_images` ADD CONSTRAINT `business_images_slideId_fkey` FOREIGN KEY (`slideId`) REFERENCES `slides`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
