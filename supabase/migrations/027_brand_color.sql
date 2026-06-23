-- ============================================================================
-- 027_brand_color — Añade brand_color a applications
-- ============================================================================
-- Cada aplicación puede tener su propio color de marca (hex).
-- Si es NULL, el PWA hereda un color por defecto según su tipo:
--   programa     → #4f46e5 (indigo)
--   herramienta  → #2563eb (blue)
--   encuesta     → #d97706 (amber)
--   recurso      → #059669 (emerald)
--
-- También se asignan colores a las apps existentes para que
-- cada una tenga su propia identidad visual desde ya.

-- 1. Añadir la columna (idempotente)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS brand_color text;

COMMENT ON COLUMN public.applications.brand_color
  IS 'Color de marca en hex (#rrggbb). NULL = el PWA usa el color por defecto del tipo.';

-- 2. Asignar colores a apps existentes
UPDATE public.applications SET brand_color = '#0d9488'
  WHERE nombre = 'Mindful30 Adultos' AND brand_color IS NULL;

UPDATE public.applications SET brand_color = '#7c3aed'
  WHERE nombre = 'Mindful30 Adolescentes' AND brand_color IS NULL;

UPDATE public.applications SET brand_color = '#3b82f6'
  WHERE nombre = 'Mindful30 Cuidadores' AND brand_color IS NULL;

UPDATE public.applications SET brand_color = '#2563eb'
  WHERE nombre = 'Cita Previa Sanitaria' AND brand_color IS NULL;

UPDATE public.applications SET brand_color = '#059669'
  WHERE nombre = 'Recursos de Bienestar' AND brand_color IS NULL;
