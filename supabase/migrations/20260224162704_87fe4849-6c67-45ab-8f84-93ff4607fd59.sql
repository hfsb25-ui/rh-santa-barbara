
CREATE TABLE public.consultas_judiciais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data_consulta timestamp with time zone NOT NULL DEFAULT now(),
  resultado jsonb DEFAULT '{}',
  processos_encontrados integer NOT NULL DEFAULT 0,
  resumo text,
  consultado_por uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consultas_judiciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can manage all consultas judiciais"
  ON public.consultas_judiciais
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE INDEX idx_consultas_judiciais_employee ON public.consultas_judiciais(employee_id);
CREATE INDEX idx_consultas_judiciais_data ON public.consultas_judiciais(data_consulta DESC);
