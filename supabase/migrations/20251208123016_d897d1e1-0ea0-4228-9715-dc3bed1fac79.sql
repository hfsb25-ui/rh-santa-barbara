-- Criar tabela para controlar liberação de certificados
CREATE TABLE public.certificados_liberados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  liberado_por UUID REFERENCES auth.users(id),
  data_liberacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_conclusao TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (employee_id, curso_id)
);

-- Habilitar RLS
ALTER TABLE public.certificados_liberados ENABLE ROW LEVEL SECURITY;

-- Gestores podem gerenciar todas as liberações
CREATE POLICY "Gestors can manage all certificate releases"
ON public.certificados_liberados
FOR ALL
USING (has_role(auth.uid(), 'gestor'));

-- Funcionários podem ver suas próprias liberações
CREATE POLICY "Employees can view own certificate releases"
ON public.certificados_liberados
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = certificados_liberados.employee_id
  AND e.user_id = auth.uid()
));