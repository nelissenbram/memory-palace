-- Legacy pure-Stripe rows and the checkout placeholder row were created before subscription_source existed and are NULL. The code now correctly treats NULL as Stripe-owned (source IS NULL OR source = 'stripe'), so this is optional. It makes the 'stripe' vs 'apple' ownership explicit and simplifies future queries. Do NOT set 'stripe' on any row that has apple_original_transaction_id.

-- OPTIONAL data-hygiene backfill. The code fixes already treat subscription_source = NULL as Stripe-owned, so this is NOT required for correctness, only for clarity/consistency. Only run if you have verified no Apple-linked rows currently have a NULL source.
UPDATE public.subscriptions
SET subscription_source = 'stripe'
WHERE subscription_source IS NULL
  AND stripe_customer_id IS NOT NULL
  AND apple_original_transaction_id IS NULL;
