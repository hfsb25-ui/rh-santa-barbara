
-- Add OpenAI support columns to configuracoes_ia
ALTER TABLE public.configuracoes_ia 
  ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
  ADD COLUMN IF NOT EXISTS provedor TEXT DEFAULT 'gemini';
