-- Add new role for partial admins
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_parcial';