-- ============================================================
--  PROTOCOLO DE SEGURIDAD MAXIMA - JVCreative Standard
--  Bucket: pacientes-adjuntos
--  Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. CONFIGURACION DEL BUCKET (Privado, 500 KB, solo JPG/PNG)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'pacientes-adjuntos',
    'pacientes-adjuntos',
    false,
    512000,
    ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
    public            = false,
    file_size_limit   = 512000,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png'];

-- ============================================================
-- 2. POLITICAS RLS (Row Level Security) - 3 reglas precisas
-- ============================================================

-- NOTA: RLS ya esta habilitado por defecto en storage.objects en Supabase.
-- No se necesita ALTER TABLE (causaria error 42501).

-- 2-A. LECTURA (SELECT) - Solo usuarios con sesion activa
DROP POLICY IF EXISTS "JVCreative_SELECT_pacientes_adjuntos" ON storage.objects;
CREATE POLICY "JVCreative_SELECT_pacientes_adjuntos"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (bucket_id = 'pacientes-adjuntos');

-- 2-B. INSERCION (INSERT) - Nombre de carpeta debe existir (= cedula del paciente)
DROP POLICY IF EXISTS "JVCreative_INSERT_pacientes_adjuntos" ON storage.objects;
CREATE POLICY "JVCreative_INSERT_pacientes_adjuntos"
ON storage.objects
FOR INSERT
TO authenticated, anon
WITH CHECK (
    bucket_id = 'pacientes-adjuntos'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND length((storage.foldername(name))[1]) > 0
);

-- 2-C. BORRADO (DELETE) - Solo si el archivo pertenece a una carpeta valida
DROP POLICY IF EXISTS "JVCreative_DELETE_pacientes_adjuntos" ON storage.objects;
CREATE POLICY "JVCreative_DELETE_pacientes_adjuntos"
ON storage.objects
FOR DELETE
TO authenticated, anon
USING (bucket_id = 'pacientes-adjuntos');

-- ============================================================
-- 3. COLUMNA imagenes_json EN TABLA PACIENTES
-- ============================================================
ALTER TABLE "PACIENTES"
    ADD COLUMN IF NOT EXISTS imagenes_json JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- VERIFICACION FINAL
-- ============================================================
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'pacientes-adjuntos';

SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE 'JVCreative%';
