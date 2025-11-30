-- Create cursos table
CREATE TABLE public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  funcao_id UUID REFERENCES public.funcoes(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  obrigatorio BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create modulos table
CREATE TABLE public.modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create aulas table
CREATE TABLE public.aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  duracao_minutos INTEGER,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create progresso_treinamento table
CREATE TABLE public.progresso_treinamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  concluida BOOLEAN DEFAULT false,
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, aula_id)
);

-- Enable RLS
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_treinamento ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cursos
CREATE POLICY "Gestors can manage all courses"
ON public.cursos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view active courses for their sector/function"
ON public.cursos
FOR SELECT
TO authenticated
USING (
  ativo = true AND
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.user_id = auth.uid()
    AND (
      (cursos.setor_id IS NULL OR employees.setor = (SELECT nome FROM public.setores WHERE id = cursos.setor_id))
      OR
      (cursos.funcao_id IS NULL OR employees.cargo = (SELECT nome FROM public.funcoes WHERE id = cursos.funcao_id))
      OR
      (cursos.empresa_id IS NULL OR employees.empresa_id = cursos.empresa_id)
    )
  )
);

-- RLS Policies for modulos
CREATE POLICY "Gestors can manage all modules"
ON public.modulos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view modules of accessible courses"
ON public.modulos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cursos
    WHERE cursos.id = modulos.curso_id
    AND cursos.ativo = true
    AND EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.user_id = auth.uid()
      AND (
        (cursos.setor_id IS NULL OR employees.setor = (SELECT nome FROM public.setores WHERE id = cursos.setor_id))
        OR
        (cursos.funcao_id IS NULL OR employees.cargo = (SELECT nome FROM public.funcoes WHERE id = cursos.funcao_id))
        OR
        (cursos.empresa_id IS NULL OR employees.empresa_id = cursos.empresa_id)
      )
    )
  )
);

-- RLS Policies for aulas
CREATE POLICY "Gestors can manage all lessons"
ON public.aulas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can view lessons of accessible modules"
ON public.aulas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modulos
    JOIN public.cursos ON cursos.id = modulos.curso_id
    WHERE modulos.id = aulas.modulo_id
    AND cursos.ativo = true
    AND EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.user_id = auth.uid()
      AND (
        (cursos.setor_id IS NULL OR employees.setor = (SELECT nome FROM public.setores WHERE id = cursos.setor_id))
        OR
        (cursos.funcao_id IS NULL OR employees.cargo = (SELECT nome FROM public.funcoes WHERE id = cursos.funcao_id))
        OR
        (cursos.empresa_id IS NULL OR employees.empresa_id = cursos.empresa_id)
      )
    )
  )
);

-- RLS Policies for progresso_treinamento
CREATE POLICY "Gestors can view all progress"
ON public.progresso_treinamento
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Funcionarios can manage own progress"
ON public.progresso_treinamento
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.id = progresso_treinamento.employee_id
    AND employees.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_cursos_updated_at
BEFORE UPDATE ON public.cursos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_modulos_curso_id ON public.modulos(curso_id);
CREATE INDEX idx_aulas_modulo_id ON public.aulas(modulo_id);
CREATE INDEX idx_progresso_employee_id ON public.progresso_treinamento(employee_id);
CREATE INDEX idx_progresso_aula_id ON public.progresso_treinamento(aula_id);