-- Adicionar novos campos na tabela avisos
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'media';
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'comunicado';
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS data_publicacao DATE;
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS funcionarios_ids UUID[] DEFAULT '{}';
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS tipo_destinatario TEXT DEFAULT 'setor';
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS anexo_url TEXT;

-- Criar tabela para rastrear leituras de avisos
CREATE TABLE IF NOT EXISTS public.avisos_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id UUID NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  lido_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(aviso_id, employee_id)
);

-- Habilitar RLS na tabela avisos_leituras
ALTER TABLE public.avisos_leituras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para avisos_leituras
CREATE POLICY "Funcionários podem ver suas próprias leituras"
ON public.avisos_leituras
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Funcionários podem marcar avisos como lidos"
ON public.avisos_leituras
FOR INSERT
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Gestores podem ver todas as leituras"
ON public.avisos_leituras
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'gestor'
  )
);

-- Criar bucket para anexos de avisos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avisos-anexos', 'avisos-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para anexos
CREATE POLICY "Anexos de avisos são públicos para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'avisos-anexos');

CREATE POLICY "Gestores podem fazer upload de anexos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avisos-anexos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'gestor'
  )
);

CREATE POLICY "Gestores podem deletar anexos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avisos-anexos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'gestor'
  )
);