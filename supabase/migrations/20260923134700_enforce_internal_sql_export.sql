CREATE OR REPLACE FUNCTION public.export_sql_tables()
RETURNS TABLE(table_name text, total_rows bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  table_record record;
  row_total bigint;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Acesso negado à exportação interna.';
  END IF;

  FOR table_record IN
    SELECT c.relname AS name
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relispartition
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', table_record.name) INTO row_total;
    table_name := table_record.name;
    total_rows := row_total;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.export_sql_table_chunk(
  _table_name text,
  _offset integer DEFAULT 0,
  _limit integer DEFAULT 250
)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  column_list text;
  value_expression text;
  export_query text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Acesso negado à exportação interna.';
  END IF;

  IF _offset < 0 OR _limit < 1 OR _limit > 500 THEN
    RAISE EXCEPTION 'Faixa de exportação inválida.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = _table_name
      AND c.relkind IN ('r', 'p')
      AND NOT c.relispartition
  ) THEN
    RAISE EXCEPTION 'Tabela inválida para exportação.';
  END IF;

  SELECT
    string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum),
    string_agg(format('quote_nullable(t.%I::text)', a.attname), ' || '', '' || ' ORDER BY a.attnum)
  INTO column_list, value_expression
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = _table_name
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND a.attgenerated = '';

  IF column_list IS NULL OR value_expression IS NULL THEN
    RETURN;
  END IF;

  export_query := format(
    'SELECT %L || %s || '');'' FROM public.%I t OFFSET %s LIMIT %s',
    'INSERT INTO public.' || format('%I', _table_name) || ' (' || column_list || ') OVERRIDING SYSTEM VALUE VALUES (',
    value_expression,
    _table_name,
    _offset,
    _limit
  );

  RETURN QUERY EXECUTE export_query;
END;
$$;
