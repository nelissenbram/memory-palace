-- Native push (APNs/FCM) is not implemented: nothing ever read `push_tokens`
-- to send a native push (real-time delivery uses web-push /
-- `push_subscriptions` only). The table was write-only — tokens accumulated
-- forever, were never delivered to, and were never pruned.
--
-- The /api/push/register route no longer writes to this table. Drop it to stop
-- retaining orphaned device tokens. If native push is implemented later,
-- recreate the table together with an actual APNs/FCM send path and dead-token
-- cleanup on delivery failure.

DROP TABLE IF EXISTS push_tokens;
