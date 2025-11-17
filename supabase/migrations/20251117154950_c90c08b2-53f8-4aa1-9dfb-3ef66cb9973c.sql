-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('gestor', 'funcionario');

-- Create enum for employee status
CREATE TYPE public.employee_status AS ENUM ('ativo', 'ferias', 'afastado', 'demitido');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome_completo TEXT NOT NULL,
  cargo TEXT NOT NULL,
  setor TEXT,
  status employee_status DEFAULT 'ativo',
  data_admissao DATE,
  cpf TEXT,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create EPIs table
CREATE TABLE public.epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  tipo_epi TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_entrega DATE NOT NULL,
  observacoes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create uniforms table
CREATE TABLE public.uniformes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  tipo_uniforme TEXT NOT NULL,
  tamanho TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_entrega DATE NOT NULL,
  observacoes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create absences table (afastamentos/atestados)
CREATE TABLE public.afastamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  motivo TEXT NOT NULL,
  cid TEXT,
  documento_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time off table (folgas)
CREATE TABLE public.folgas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  motivo TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vacations table (férias)
CREATE TABLE public.ferias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  periodo_aquisitivo_inicio DATE NOT NULL,
  periodo_aquisitivo_fim DATE NOT NULL,
  periodo_gozo_inicio DATE NOT NULL,
  periodo_gozo_fim DATE NOT NULL,
  dias_totais INTEGER NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create absences/faults table (faltas)
CREATE TABLE public.faltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  justificada BOOLEAN DEFAULT FALSE,
  motivo TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniformes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faltas ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gestors can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'gestor'));

-- RLS Policies for employees
CREATE POLICY "Gestors can view all employees"
  ON public.employees FOR SELECT
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Funcionarios can view own employee record"
  ON public.employees FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Gestors can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestors can update employees"
  ON public.employees FOR UPDATE
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestors can delete employees"
  ON public.employees FOR DELETE
  USING (public.has_role(auth.uid(), 'gestor'));

-- RLS Policies for EPIs
CREATE POLICY "Gestors can manage all EPIs"
  ON public.epis FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Funcionarios can view own EPIs"
  ON public.epis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = epis.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- RLS Policies for uniformes
CREATE POLICY "Gestors can manage all uniforms"
  ON public.uniformes FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Funcionarios can view own uniforms"
  ON public.uniformes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = uniformes.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- RLS Policies for afastamentos
CREATE POLICY "Gestors can manage all absences"
  ON public.afastamentos FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Funcionarios can view own absences"
  ON public.afastamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = afastamentos.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- RLS Policies for folgas
CREATE POLICY "Gestors can manage all time off"
  ON public.folgas FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Funcionarios can view own time off"
  ON public.folgas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = folgas.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- RLS Policies for ferias
CREATE POLICY "Gestors can manage all vacations"
  ON public.ferias FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Funcionarios can view own vacations"
  ON public.ferias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = ferias.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- RLS Policies for faltas
CREATE POLICY "Gestors can manage all faults"
  ON public.faltas FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Funcionarios can view own faults"
  ON public.faltas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = faltas.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();