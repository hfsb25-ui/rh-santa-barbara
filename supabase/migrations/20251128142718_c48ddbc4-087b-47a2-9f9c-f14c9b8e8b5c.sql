-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Habilitar extensão pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Configurar cron job para processar ciclos diariamente às 6h
SELECT cron.schedule(
  'processar-ciclos-avaliacao-diario',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://uyrdlevpowoviwvyehro.supabase.co/functions/v1/processar-ciclos-avaliacao',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cmRsZXZwb3dvdml3dnllaHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTE2OTYsImV4cCI6MjA3ODk2NzY5Nn0.CoLfBEBrTJliavd4GIbxZrb1lePrRAz7Pt40aNaYois"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);