-- Relación negocio ↔ usuario propietario (administración)
ALTER TABLE `businesses` ADD COLUMN `owner_user_id` VARCHAR(191) NULL;

CREATE INDEX `businesses_owner_user_id_idx` ON `businesses`(`owner_user_id`);

ALTER TABLE `businesses`
  ADD CONSTRAINT `businesses_owner_user_id_fkey`
  FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
