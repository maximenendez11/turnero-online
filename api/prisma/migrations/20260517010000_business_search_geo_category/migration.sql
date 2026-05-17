-- Búsqueda pública: rubro y coordenadas para mapa.
ALTER TABLE `businesses`
    ADD COLUMN `category` VARCHAR(64) NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL;

CREATE INDEX `businesses_category_idx` ON `businesses`(`category`);
