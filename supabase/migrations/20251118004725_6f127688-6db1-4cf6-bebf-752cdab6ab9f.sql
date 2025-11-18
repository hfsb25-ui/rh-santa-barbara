-- Criar tabela de avisos
CREATE TABLE public.avisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem TEXT NOT NULL,
  setores TEXT[] NOT NULL,
  data_expiracao DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Habilitar RLS
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

-- Gestores podem gerenciar todos os avisos
CREATE POLICY "Gestors can manage all notices"
  ON public.avisos
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role));

-- Funcionários podem ver avisos do seu setor que ainda não expiraram
CREATE POLICY "Funcionarios can view active notices for their sector"
  ON public.avisos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.user_id = auth.uid()
      AND employees.setor = ANY(avisos.setores)
      AND avisos.data_expiracao >= CURRENT_DATE
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_avisos_updated_at
  BEFORE UPDATE ON public.avisos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();