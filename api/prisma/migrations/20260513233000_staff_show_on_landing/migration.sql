-- Profesionales: visibilidad en vidriera pública (landing) sin borrar el registro.
ALTER TABLE `business_staff` ADD COLUMN `show_on_landing` BOOLEAN NOT NULL DEFAULT true;
