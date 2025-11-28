-- Criar tabela de critérios de avaliação
CREATE TABLE public.criterios_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  peso INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  funcao_id UUID REFERENCES public.funcoes(id),
  setor_id UUID REFERENCES public.setores(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de avaliações de desempenho
CREATE TABLE public.avaliacoes_desempenho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  avaliador_id UUID,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  tipo TEXT NOT NULL, -- 'mensal', 'trimestral', 'semestral', 'anual'
  status TEXT DEFAULT 'pendente' NOT NULL, -- 'pendente', 'em_andamento', 'concluida'
  nota_final DECIMAL,
  observacoes TEXT,
  auto_avaliacao_concluida BOOLEAN DEFAULT false,
  avaliacao_gestor_concluida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de notas por critério
CREATE TABLE public.notas_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID REFERENCES public.avaliacoes_desempenho(id) ON DELETE CASCADE NOT NULL,
  criterio_id UUID REFERENCES public.criterios_avaliacao(id) ON DELETE CASCADE NOT NULL,
  nota_funcionario INTEGER, -- 1-5 (auto-avaliação)
  nota_gestor INTEGER, -- 1-5 (avaliação do gestor)
  comentario_funcionario TEXT,
  comentario_gestor TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de metas/PDI
CREATE TABLE public.metas_funcionario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  avaliacao_id UUID REFERENCES public.avaliacoes_desempenho(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prazo DATE,
  status TEXT DEFAULT 'pendente' NOT NULL, -- 'pendente', 'em_andamento', 'concluida', 'cancelada'
  percentual_conclusao INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.criterios_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_desempenho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_funcionario ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para criterios_avaliacao
CREATE POLICY "Gestors can manage all criterios"
ON public.criterios_avaliacao
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view active criterios"
ON public.criterios_avaliacao
FOR SELECT
USING (ativo = true);

-- Políticas RLS para avaliacoes_desempenho
CREATE POLICY "Gestors can manage all avaliacoes"
ON public.avaliacoes_desempenho
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view own avaliacoes"
ON public.avaliacoes_desempenho
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = avaliacoes_desempenho.employee_id
    AND employees.user_id = auth.uid()
  )
);

CREATE POLICY "Funcionarios can update own avaliacoes for auto-avaliacao"
ON public.avaliacoes_desempenho
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = avaliacoes_desempenho.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Políticas RLS para notas_avaliacao
CREATE POLICY "Gestors can manage all notas"
ON public.notas_avaliacao
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view own notas"
ON public.notas_avaliacao
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.avaliacoes_desempenho av
    JOIN public.employees e ON e.id = av.employee_id
    WHERE av.id = notas_avaliacao.avaliacao_id
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Funcionarios can update own notas for auto-avaliacao"
ON public.notas_avaliacao
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.avaliacoes_desempenho av
    JOIN public.employees e ON e.id = av.employee_id
    WHERE av.id = notas_avaliacao.avaliacao_id
    AND e.user_id = auth.uid()
  )
);

-- Políticas RLS para metas_funcionario
CREATE POLICY "Gestors can manage all metas"
ON public.metas_funcionario
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view own metas"
ON public.metas_funcionario
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = metas_funcionario.employee_id
    AND employees.user_id = auth.uid()
  )
);

CREATE POLICY "Funcionarios can update own metas progress"
ON public.metas_funcionario
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = metas_funcionario.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Triggers para updated_at
CREATE TRIGGER update_criterios_avaliacao_updated_at
BEFORE UPDATE ON public.criterios_avaliacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_avaliacoes_desempenho_updated_at
BEFORE UPDATE ON public.avaliacoes_desempenho
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notas_avaliacao_updated_at
BEFORE UPDATE ON public.notas_avaliacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_funcionario_updated_at
BEFORE UPDATE ON public.metas_funcionario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();