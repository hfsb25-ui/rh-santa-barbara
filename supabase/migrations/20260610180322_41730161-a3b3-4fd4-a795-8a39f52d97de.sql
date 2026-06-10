CREATE TABLE public.holerite_import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'processando',
  resultado JSONB,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.holerite_import_jobs TO authenticated;
GRANT ALL ON public.holerite_import_jobs TO service_role;
ALTER TABLE public.holerite_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own import jobs"
ON public.holerite_import_jobs
FOR SELECT TO authenticated
USING (auth.uid() = user_id);