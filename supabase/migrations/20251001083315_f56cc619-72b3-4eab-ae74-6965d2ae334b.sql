-- Fix infinite recursion in RLS policies by using security definer functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all API calls" ON public.api_calls;

-- Create security definer function to check admin status (prevents recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = is_admin.user_id
      AND profiles.is_admin = true
  )
$$;

-- Recreate admin policies using the security definer function
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all API calls"
ON public.api_calls
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create api_settings table for configurable API URLs
CREATE TABLE IF NOT EXISTS public.api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API settings
CREATE POLICY "Admins can view API settings"
ON public.api_settings
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert API settings"
ON public.api_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update API settings"
ON public.api_settings
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete API settings"
ON public.api_settings
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Insert default API URL setting
INSERT INTO public.api_settings (setting_key, setting_value, description)
VALUES ('api_base_url', 'https://cc.yeasirar.xyz/gen', 'Base URL for the card generation API')
ON CONFLICT (setting_key) DO NOTHING;

-- Add trigger for api_settings updated_at
CREATE TRIGGER update_api_settings_updated_at
BEFORE UPDATE ON public.api_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();