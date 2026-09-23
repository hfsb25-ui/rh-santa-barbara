REVOKE ALL ON FUNCTION public.export_sql_tables() FROM authenticated;
REVOKE ALL ON FUNCTION public.export_sql_table_chunk(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.export_sql_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.export_sql_table_chunk(text, integer, integer) TO service_role;