-- Conceder ao admin_parcial os mesmos acessos de dados que o gestor.
-- O controle granular por módulo é feito no frontend (sidebar/rotas).
-- Para cada policy existente que usa has_role(auth.uid(), 'gestor'),
-- criamos uma policy equivalente para 'admin_parcial'.

DO $$
DECLARE
  r RECORD;
  new_polname TEXT;
  cmd_clause TEXT;
  using_clause TEXT;
  check_clause TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check, permissive, roles
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual LIKE '%''gestor''::app_role%'
        OR with_check LIKE '%''gestor''::app_role%'
      )
  LOOP
    new_polname := r.policyname || ' (admin_parcial)';

    -- Evita duplicar
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = r.schemaname
        AND tablename = r.tablename
        AND policyname = new_polname
    ) THEN
      CONTINUE;
    END IF;

    cmd_clause := CASE r.cmd
      WHEN 'ALL' THEN 'ALL'
      WHEN 'SELECT' THEN 'SELECT'
      WHEN 'INSERT' THEN 'INSERT'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
      ELSE 'ALL'
    END;

    using_clause := '';
    check_clause := '';

    IF r.qual IS NOT NULL AND r.cmd <> 'INSERT' THEN
      using_clause := ' USING (' || replace(r.qual, '''gestor''::app_role', '''admin_parcial''::app_role') || ')';
    END IF;

    IF r.with_check IS NOT NULL AND r.cmd IN ('INSERT','UPDATE','ALL') THEN
      check_clause := ' WITH CHECK (' || replace(r.with_check, '''gestor''::app_role', '''admin_parcial''::app_role') || ')';
    END IF;

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO public%s%s',
      new_polname,
      r.schemaname,
      r.tablename,
      cmd_clause,
      using_clause,
      check_clause
    );
  END LOOP;
END $$;