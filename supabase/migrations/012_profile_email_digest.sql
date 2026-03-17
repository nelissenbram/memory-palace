-- Add email digest preference and last-seen tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_digest BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
