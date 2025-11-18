-- Criar tabela de empresas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para empresas
CREATE POLICY "Gestors can manage all companies"
ON public.empresas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Adicionar coluna empresa_id na tabela employees
ALTER TABLE public.employees
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

-- Criar índice para performance
CREATE INDEX idx_employees_empresa_id ON public.employees(empresa_id);

-- Atualizar trigger para updated_at em empresas
CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();