-- Removes the fundamental authorization-model confusion: today the proxy authorizes a row found by a SUBSTRING ilike on thumbnail_url, then serves bytes for the attacker-supplied filePath. A dedicated thumbnail_path column matched with .eq() makes the authorized row and the streamed object identical. The code guard already shipped (reject %/_ + escape LIKE) closes the injection so the app is safe before this migration; after it runs, switch the fallback in src/app/api/media/[...path]/route.ts to `.eq('thumbnail_path', filePath)` and stream that column's value.

-- Long-term fix for the media-proxy LIKE-injection / authorize-A-serve-B confusion.
-- Store each thumbnail's REAL storage object path in a dedicated column so the
-- proxy can match it with an EXACT .eq('thumbnail_path', filePath) and stream that
-- same matched path (authorized row == served object). Backfill best-effort from
-- the existing proxy-style thumbnail_url values, then switch the route to .eq.

ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS thumbnail_path text;

-- Best-effort backfill: extract the storage path from proxy-style thumbnail_urls
-- of the form '/api/media/memories/<path>' or 'https://host/api/media/memories/<path>'.
-- Rows whose thumbnail_url is a raw signed/full URL will remain NULL and must be
-- backfilled by the app on next thumbnail (re)generation.
UPDATE public.memories
SET thumbnail_path = regexp_replace(thumbnail_url, '^.*/api/media/memories/', '')
WHERE thumbnail_url IS NOT NULL
  AND thumbnail_path IS NULL
  AND thumbnail_url ~ '/api/media/memories/';

-- Unique-ish lookup index for the exact-match path (partial: only populated rows).
CREATE INDEX IF NOT EXISTS memories_thumbnail_path_idx
  ON public.memories (thumbnail_path)
  WHERE thumbnail_path IS NOT NULL;
