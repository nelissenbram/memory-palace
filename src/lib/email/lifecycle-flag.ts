/**
 * Master kill-switch for the redesigned lifecycle email program
 * (weekly report, monthly report, 30-day win-back).
 *
 * Default OFF. The owner flips LIFECYCLE_EMAILS_ENABLED=true in Vercel env +
 * redeploys to go live. Crons may be wired in vercel.json before the flip —
 * each lifecycle route checks this and no-ops (early-returns, sends nothing)
 * while paused.
 *
 * Does NOT gate the onboarding drip (days 1-14) or the 7-day re-engagement
 * push — those were never part of the owner-requested pause and stay live.
 */
export function lifecycleEmailsEnabled(): boolean {
  return process.env.LIFECYCLE_EMAILS_ENABLED === "true";
}
