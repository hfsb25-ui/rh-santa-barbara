CREATE TABLE public.nr1_auditoria_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID,
  periodo_inicio DATE,
  periodo_fim DATE,
  responsavel_nome TEXT,
  responsavel_cargo TEXT,
  formato TEXT NOT NULL,
  hash_integridade TEXT,
  gerado_por UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_auditoria_exports TO authenticated;
GRANT ALL ON public.nr1_auditoria_exports TO service_role;

ALTER TABLE public.nr1_auditoria_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver exports de auditoria"
ON public.nr1_auditoria_exports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores podem criar exports de auditoria"
ON public.nr1_auditoria_exports FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gestor'));