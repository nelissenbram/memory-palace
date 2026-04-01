-- Fix: the INSERT policy "Authenticated users can create notifications" allows
-- any authenticated user to insert notifications targeting ANY user_id.
-- Replace with a restrictive policy that only allows users to create
-- notifications as themselves (from_user_id = auth.uid()).

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

CREATE POLICY "Users can only create notifications as themselves"
  ON notifications FOR INSERT
  WITH CHECK (from_user_id = auth.uid());
