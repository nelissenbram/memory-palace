-- Create push_subscriptions table with proper RLS
-- Previously only documented in a code comment with a broad USING(true) SELECT
-- policy. The service role already bypasses RLS, so that policy would have
-- allowed any authenticated user to read ALL push subscriptions.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  on_this_day BOOLEAN DEFAULT true,
  time_capsule BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NO broad SELECT policy — the service role (used by cron/send endpoints)
-- already bypasses RLS and can read all rows without a permissive policy.
