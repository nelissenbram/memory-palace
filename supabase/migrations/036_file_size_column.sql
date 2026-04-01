-- Add file_size column to memories table for storage quota tracking
alter table public.memories add column if not exists file_size bigint default 0;

-- Create index for efficient per-user storage queries
create index if not exists idx_memories_user_file_size on public.memories(user_id) where file_size > 0;

-- Backfill: set file_size to 0 for existing rows (explicit, not null)
update public.memories set file_size = 0 where file_size is null;
