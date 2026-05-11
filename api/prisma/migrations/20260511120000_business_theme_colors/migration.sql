-- Colores de tema para la página pública de reserva del negocio.
ALTER TABLE `businesses`
ADD COLUMN `theme_background_hex` VARCHAR(7) NULL,
ADD COLUMN `theme_primary_hex` VARCHAR(7) NULL;
