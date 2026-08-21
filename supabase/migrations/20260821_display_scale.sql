-- Per-painting wall-portrait size in rooms (Steward's Ledger S/M/L, 2026-08-21).
-- Additive + nullable: 'sm' | 'md' | 'lg'; NULL = 'md' (current size).
-- The app is null-safe until this runs: updateMemory retries without
-- display_scale when the column is missing, so nothing errors pre-migration.
alter table public.memories add column if not exists display_scale text;
