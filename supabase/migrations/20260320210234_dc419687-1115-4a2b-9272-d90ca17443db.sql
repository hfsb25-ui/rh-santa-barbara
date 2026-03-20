
CREATE TABLE public.informacoes_contabilidade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  observacoes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.informacoes_contabilidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can manage all contabilidade info"
ON public.informacoes_contabilidade
FOR ALL
USING (public.has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_informacoes_contabilidade_updated_at
BEFORE UPDATE ON public.informacoes_contabilidade
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
