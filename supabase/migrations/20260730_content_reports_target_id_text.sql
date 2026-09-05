-- Finding 1 root cause: target_id is UUID NOT NULL but /api/report and the authenticated safety-actions path accept targetType 'gallery' (share slug) and 'family_tree' (share token). Postgres 22P02 makes those reports fail; the route previously 500'd. Widening to TEXT is the recommended fix so slugs/tokens/uuids coexist and reporting works. The code guard I added (22P02 -> 400) keeps the endpoint from 500ing before this migration is applied, but the reports themselves only succeed once this runs.

-- content_reports.target_id must hold public gallery share-slugs and shared
-- family-tree share-tokens (not just UUIDs). Inserting a slug/token into the
-- UUID column raises 22P02, so every anonymous gallery/family_tree report 500s
-- (breaks the exact Apple Guideline 1.2 anonymous reporting surface). Widen to
-- TEXT so slugs, tokens and UUIDs coexist. The dedupe unique index is on
-- (reporter_id, target_type, target_id) and rebuilds transparently for TEXT;
-- the idx_content_reports_target index likewise. No data migration needed
-- (existing UUID values cast losslessly to their text form).
ALTER TABLE content_reports ALTER COLUMN target_id TYPE TEXT USING target_id::text;
