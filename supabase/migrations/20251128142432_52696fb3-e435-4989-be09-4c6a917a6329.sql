-- Criar tabela de ciclos de avaliação
CREATE TABLE public.ciclos_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('mensal', 'trimestral', 'semestral', 'anual')),
  data_inicio DATE NOT NULL,
  data_proxima_execucao DATE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  
  -- Filtros de funcionários
  empresa_id UUID REFERENCES public.empresas(id),
  setor_id UUID REFERENCES public.setores(id),
  funcao_id UUID REFERENCES public.funcoes(id),
  
  -- Configurações
  dias_para_conclusao INTEGER DEFAULT 30,
  criar_metas BOOLEAN DEFAULT false,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de execuções de ciclo
CREATE TABLE public.execucoes_ciclo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  data_execucao TIMESTAMPTZ DEFAULT now(),
  avaliacoes_criadas INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sucesso' CHECK (status IN ('sucesso', 'erro', 'parcial')),
  detalhes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ciclos_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_ciclo ENABLE ROW LEVEL SECURITY;

-- RLS Policies para ciclos_avaliacao
CREATE POLICY "Gestors can manage all ciclos"
ON public.ciclos_avaliacao
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- RLS Policies para execucoes_ciclo
CREATE POLICY "Gestors can view execucoes"
ON public.execucoes_ciclo
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "System can insert execucoes"
ON public.execucoes_ciclo
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_ciclos_avaliacao_updated_at
BEFORE UPDATE ON public.ciclos_avaliacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();