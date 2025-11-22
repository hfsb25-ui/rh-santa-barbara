-- Criar bucket para logos das empresas
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- Políticas de storage para logos
CREATE POLICY "Gestores podem fazer upload de logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Gestores podem atualizar logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Gestores podem deletar logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Logos são públicos para visualização"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Adicionar campo logo_url na tabela empresas
ALTER TABLE public.empresas
ADD COLUMN logo_url TEXT;