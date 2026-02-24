-- Remove the auto-cleanup trigger and function that deletes conversations older than 30 days
DROP FUNCTION IF EXISTS public.cleanup_old_whatsapp_conversas() CASCADE;