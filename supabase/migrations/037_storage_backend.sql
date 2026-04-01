-- Track which storage backend holds each memory's file
-- 'supabase' = legacy files in Supabase Storage
-- 'r2' = new files in Cloudflare R2
alter table public.memories add column if not exists storage_backend text not null default 'supabase';
