-- Create table to store Google OAuth tokens for calendar sync
CREATE TABLE public.google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own tokens
CREATE POLICY "Users can view own tokens" ON public.google_calendar_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.google_calendar_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.google_calendar_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.google_calendar_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Add google_event_id to eventos if not exists (to track synced events)
-- This column already exists based on the schema, so we skip it