-- AlterTable
ALTER TABLE `slides` ADD COLUMN `conditionMode` ENUM('all', 'any') NOT NULL DEFAULT 'all';
