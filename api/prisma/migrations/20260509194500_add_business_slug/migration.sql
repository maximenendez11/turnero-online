-- AlterTable
ALTER TABLE `businesses` ADD COLUMN `slug` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `businesses_slug_key` ON `businesses`(`slug`);
