-- Make the memories bucket public so getPublicUrl() URLs work.
-- Files are in user-specific folders (user_id/*) so URLs are not guessable.
UPDATE storage.buckets SET public = true WHERE id = 'memories';
