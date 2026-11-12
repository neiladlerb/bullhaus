-- Tipos de propiedad que el sitio anterior publicaba y el back office no tenía.
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'bodega' BEFORE 'otro';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'estacionamiento' BEFORE 'otro';
