
REVOKE SELECT ON public.empresas FROM anon;
GRANT SELECT (id, nome, logo_url) ON public.empresas TO anon;

REVOKE SELECT ON public.vagas FROM anon;
GRANT SELECT (
  id, titulo, descricao, empresa_id, setor_id, funcao_id,
  tipo_contrato, tipo_salario, exibir_salario, quantidade_vagas,
  requisitos, beneficios, status, data_abertura, data_fechamento,
  created_by, created_at, updated_at
) ON public.vagas TO anon;

DROP POLICY IF EXISTS "Allow all operations for authenticated users"
  ON public.variaveis_fixas_funcionario;

CREATE POLICY "Gestors manage variaveis_fixas"
  ON public.variaveis_fixas_funcionario
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'admin_parcial'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'admin_parcial'::app_role)
  );

CREATE POLICY "Employees can view their own variaveis_fixas"
  ON public.variaveis_fixas_funcionario
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );
