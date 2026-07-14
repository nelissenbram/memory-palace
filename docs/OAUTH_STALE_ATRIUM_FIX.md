I have all the evidence I need. Writing the definitive diagnosis.

---

# Definitive Diagnosis: Stale `/atrium` After Web "Sign in with Apple" (Manual-Reload Bug)

**Status:** Root cause confirmed against source. Website-only (never the iOS app). Fix is buildable and covers primary cause + defense-in-depth so it cannot recur.

---

## 1. THE Root Cause

**The shipped service worker `public/sw.js` serves every top-level HTML navigation with a Stale-While-Revalidate strategy that returns a previously-cached `/atrium` shell instantly and only revalidates in the background. After web Sign in with Apple, the browser's document navigation to `/atrium` is answered from cache with a stale (pre-login / prior-deploy) shell, never the fresh authenticated network response. Nothing re-reads auth or swaps in the revalidated HTML, so the user is stuck on the stale first paint until a manual reload.**

### Proof (file:line)

**`public/sw.js:116-132`** — the only HTML-navigation branch, and it is Stale-While-Revalidate, not NetworkFirst (despite the file header at line 1 falsely claiming "NetworkFirst for pages"):

```js
116  // ── StaleWhileRevalidate: HTML pages ──
117  // Serve cached page immediately, update in background
118  if (event.request.headers.get('accept')?.includes('text/html')) {
119    event.respondWith(
120      caches.open(PAGE_CACHE).then((cache) =>
121        cache.match(event.request).then((cached) => {
122          const fetchPromise = fetch(event.request).then((response) => {
123            if (response.ok) cache.put(event.request, response.clone());   // caches ANY ok, no auth/redirect awareness
124            return response;
125          }).catch(() => cached);
126
127          return cached || fetchPromise;   // ← THE BUG: cached wins instantly; network is background-only
128        })
129      )
130    );
131    return;
132  }
```

Line **127** `return cached || fetchPromise` is the defect. There is **no exclusion** for `/atrium`, `/palace`, `/login`, or `/auth`, and line **123** caches any `response.ok` HTML keyed purely on URL with zero auth/`Cache-Control`/redirect awareness.

**The trigger sequence:**

1. `src/app/auth/callback/route.ts:34` — `exchangeCodeForSession(code)` sets valid Supabase auth cookies (these DO reach the browser — see §4).
2. `src/app/auth/callback/route.ts:97` — `return NextResponse.redirect(`${origin}/atrium`)` — a plain, cacheable document navigation, no cache-busting.
3. Browser issues a top-level `GET /atrium` with `Accept: text/html`. `public/sw.js:118` intercepts it and `:127` returns the already-cached `/atrium` HTML **instantly**.
4. `next.config.ts:215` rewrites `/atrium → /palace`; `src/app/(app)/palace/page.tsx:22-25` renders `MemoryPalace` via `dynamic(..., { ssr:false })` — an **auth-agnostic client shell**. Auth is resolved entirely client-side.
5. `src/components/MemoryPalace.tsx:344` calls `loadProfile()` **exactly once on mount**; `src/lib/stores/userStore.ts:102` does one `supabase.auth.getUser()`. There is **no `onAuthStateChange` listener, no `controllerchange` handler, and no `SW_UPDATED` consumer anywhere in `src`** (grep = zero matches). So the background-revalidated fresh HTML is written to cache but never surfaced, and auth is never re-read.
6. `src/components/MemoryPalace.tsx:366-371` — a 3s safety timeout force-clears `profileLoading`, so the stale/unauthenticated shell is *revealed* rather than held on a spinner.
7. Manual reload re-requests `/atrium`; by then the earlier background revalidation has replaced the cache entry, so the reload serves correct authenticated HTML → "works after one refresh."

### Why it's website-only

`src/components/ServiceWorkerRegistration.tsx:18-33` actively unregisters the SW and purges all caches inside the Capacitor WKWebView, so the native iOS app never hits this path — exactly matching the report.

### Which worker actually ships (the one contested fact — resolved)

The fix must be correct whether the deployed worker is the hand-written `public/sw.js` **or** a next-pwa/Workbox-generated one. Verified on disk:

- `public/sw.js` is **git-committed, hand-written, 4965 bytes, dated Jun 25** (`git show HEAD:public/sw.js` = the SWR worker). `.gitignore` ignores `public/workbox-*.js` and `public/sw.js.map` but **NOT** `public/sw.js`.
- **No `public/workbox-*.js` exists** on disk (only `public/fallback-ce627215c0e4a9af.js`, a next-pwa artifact).
- `src/components/ServiceWorkerRegistration.tsx:88` registers `/sw.js`.
- `next.config.ts:255` wraps prod builds with `withPWA` (a **webpack** plugin) while `next.config.ts:245` sets `turbopack: {}` and Next 16.1.6 (`package.json:45`) defaults `next build` to Turbopack — under which the webpack-only next-pwa plugin does **not** regenerate the worker.

**Conclusion:** the committed hand-written `public/sw.js` is what ships, and the `next.config.ts:17-31` NetworkFirst `pages-cache` runtimeCaching is effectively dead config. **Because build tooling can silently flip (a future webpack build WOULD regenerate `public/sw.js` from the config), we fix BOTH the hand-written worker AND the runtimeCaching config** so the outcome is identical regardless of which worker is emitted. This is the decisive, future-proof choice.

---

## 2. Secondary Contributors (real, but not the trigger)

| # | Contributor | File:line | Effect |
|---|---|---|---|
| S1 | **No client auth re-sync.** `loadProfile()` runs once on mount; no `onAuthStateChange`. | `MemoryPalace.tsx:344`, `userStore.ts:102` | A stale/one-shot auth read never self-heals → manual reload is the only recovery. |
| S2 | **3s timeout reveals the unauth shell.** | `MemoryPalace.tsx:366-371` | Flips `profileLoading` off, unmasking the logged-out view instead of holding a spinner. |
| S3 | **No `SW_UPDATED`/`controllerchange` consumer.** SW broadcasts `SW_UPDATED` (`sw.js:30`) but nothing listens. | grep = 0 matches | Background revalidation can't refresh the live page. |
| S4 | **Callback redirect is freely cacheable.** No `no-store`, no `force-dynamic`. | `route.ts:97` | Lets any cache layer (SW here) store/replay the OAuth landing. |
| S5 | **`/atrium→/login` redirect-body poisoning.** Logged-out `/atrium` 302s to `/login` (`middleware.ts:88`); `fetch()` follows it and `sw.js:123` can cache the `/login` body under the `/atrium` key. | `middleware.ts:88`, `sw.js:123` | Makes the stale shell specifically look logged-out. |
| S6 | **Dual-worker confusion.** Hand-written `public/sw.js` + dead `next.config.ts:17-31` runtimeCaching coexist. | `next.config.ts:17-31` | Future builds could flip which worker ships. |

**Ruled OUT (do not chase):**
- **Cookies dropped on the callback redirect** — FALSE. `src/lib/supabase/server.ts:28-38` uses `next/headers` `cookieStore.set()`, which in a **Route Handler** flushes `Set-Cookie` onto `NextResponse.redirect`. Proof: a manual reload (same cookies) works. If cookies were dropped, reload would also fail.
- **Next.js route/data caching (`force-static`/prerender of `/palace`)** — FALSE. `(app)/layout.tsx` awaits `getUser()` via `cookies()`, making the subtree dynamic; `palace/page.tsx` is `ssr:false` with no `revalidate`/`force-static`. Server always renders fresh; staleness is injected only at the SW layer.

---

## 3. The EXACT Fix

Ship **all four** changes. Fix A is load-bearing; B–D are belt-and-suspenders so the bug cannot recur through any layer or future build-tool flip.

### Fix A (PRIMARY) — `public/sw.js`: NetworkFirst for HTML + never cache auth routes + evict poisoned cache

Replace the block at `public/sw.js:116-132`:

```js
  // ── NetworkFirst: HTML pages (auth-sensitive; never serve stale shells) ──
  if (
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    const NO_CACHE = ['/atrium', '/palace', '/library', '/me', '/auth', '/login'];
    const bypass = NO_CACHE.some((r) => url.pathname === r || url.pathname.startsWith(r + '/'));
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Never cache redirects (stops the /atrium→/login body being stored under
          // the /atrium key) or auth-sensitive app routes.
          if (!bypass && response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.open(PAGE_CACHE).then((c) =>
            c.match(event.request).then((cached) => cached || caches.match('/offline'))
          )
        )
    );
    return;
  }
```

Then **bump the cache version** at `public/sw.js:4` so the `activate` handler (`sw.js:14-25`) purges the already-poisoned `pages-*` cache on installed clients:

```diff
- const CACHE_VERSION = 'v2026-06-25a';
+ const CACHE_VERSION = 'v2026-07-14a';
```

And fix the misleading header at `public/sw.js:1`:

```diff
- // Service Worker — CacheFirst for static assets, NetworkFirst for pages
+ // Service Worker — CacheFirst for static assets, NetworkFirst for HTML pages,
+ // with auth-sensitive routes (/atrium,/palace,/library,/me,/auth,/login) never cached.
```

Bump `APP_VERSION` at `src/components/ServiceWorkerRegistration.tsx:6` so returning browsers clear caches and pick up the new worker once:

```diff
- const APP_VERSION = "2026-04-19a";
+ const APP_VERSION = "2026-07-14a";
```

> Without **both** version bumps, existing users keep the poisoned cache and still need one final manual reload.

### Fix B — `next.config.ts`: make the generated worker (if any build emits one) match Fix A

So a future webpack/`next build` that regenerates `public/sw.js` cannot reintroduce the bug. Replace the navigate entry at `next.config.ts:19-31`:

```ts
      // App shell — HTML navigations: NetworkFirst, but NEVER cache auth-sensitive routes.
      {
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.mode === "navigate" &&
          !["/atrium", "/palace", "/library", "/me", "/login"].some(
            (p) => url.pathname === p || url.pathname.startsWith(p + "/")
          ) &&
          !url.pathname.startsWith("/auth/"),
        handler: "NetworkFirst" as const,
        options: {
          cacheName: "pages-cache",
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
        },
      },
      // Auth-sensitive HTML navigations — always live network.
      {
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.mode === "navigate" &&
          (["/atrium", "/palace", "/library", "/me", "/login"].some(
            (p) => url.pathname === p || url.pathname.startsWith(p + "/")
          ) ||
            url.pathname.startsWith("/auth/")),
        handler: "NetworkOnly" as const,
        options: { cacheName: "auth-pages-cache" },
      },
```

The `document: "/offline"` fallback (`next.config.ts:11-13`) still covers offline for the NetworkOnly routes.

### Fix C — `src/app/auth/callback/route.ts`: make the OAuth landing uncacheable and attach cookies to the redirect explicitly

At the top of the module:

```ts
export const dynamic = "force-dynamic";
```

Replace the final success redirect at `route.ts:97`:

```ts
    const res = NextResponse.redirect(`${origin}/atrium`);
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return res;
```

(Optionally apply the same `no-store` to the `/reset-password`, `/invite/…`, and `/login?error=auth` redirects.) The Supabase cookies set during `exchangeCodeForSession` are already flushed onto the returned `NextResponse` by `server.ts:28-38`; this makes that explicit and prevents any HTTP-layer cache from storing the landing.

### Fix D — `src/components/MemoryPalace.tsx`: client-side auth re-sync (self-heals any residual race)

Add next to the existing `loadProfile()` mount effect (after line 364). Import `createClient` from `@/lib/supabase/client`:

```ts
  // Re-read auth the instant the browser client picks up freshly-set cookies
  // (post-OAuth). Closes any first-mount cookie-commit race independent of the SW.
  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        loadProfile();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);
```

**Note on `middleware.ts` / `updateSession`:** these are already correct — `updateSession` (`src/lib/supabase/middleware.ts:18-26`) rotates cookies onto the response, and `redirectWith` (`middleware.ts:21-25`) copies them onto redirects. No change required; this was a false lead.

---

## 4. Verification Plan

**A. Confirm which worker ships (do this first).**
```
curl -sL https://www.thememorypalace.ai/sw.js | head -20
```
Confirm it contains the NetworkFirst HTML block and `CACHE_VERSION = 'v2026-07-14a'` from Fix A. If it instead contains Workbox `importScripts`/precache, Fix B is the one governing — either way both are patched.

**B. Reproduce the bug on current prod (baseline).** In a fresh Chrome profile: sign in with Apple → observe `/atrium` renders logged-out/stale → manual reload fixes it. This is the regression oracle.

**C. Verify the fix (primary scenario).**
1. Fresh Chrome profile (or DevTools → Application → Clear storage), load the deployed site once so the new SW installs and `activate` purges old caches.
2. Sign out, then Sign in with Apple.
3. **PASS:** the first `/atrium` paint is fully authenticated (correct avatar/palace, no onboarding for returning users) with **zero manual reloads**.
4. DevTools → Network: the `/atrium` document request shows **`(from network)`, not `(from ServiceWorker)` cache** — status 200, fresh.
5. DevTools → Application → Cache Storage → `pages-v2026-07-14a`: **no `/atrium`, `/palace`, `/login`, or `/auth/*` entry** exists.

**D. Verify the "already-poisoned existing user" path.**
1. On current prod (old worker), load `/atrium` while logged out to poison the cache; confirm a stale entry exists in `pages-v2026-06-25a`.
2. Deploy the fix. Reload once → confirm `ServiceWorkerRegistration` clears caches / new SW activates and the old `pages-v2026-06-25a` cache is deleted (Application → Cache Storage).
3. Repeat scenario C → passes with no reload.

**E. Regression guards.**
- **Offline:** DevTools → Network → Offline, navigate to a non-auth cached page → still served from cache; navigate to `/atrium` → `/offline` fallback (acceptable; auth pages are intentionally network-only).
- **iOS app unaffected:** launch the Capacitor build; confirm `ServiceWorkerRegistration.tsx:18-33` still tears down the SW (no SW controlling the WKWebView) and login works.
- **No `/login⇄/atrium` loop:** sign in, hard-navigate to `/`, confirm redirect to `/atrium` stays authenticated (validates `updateSession` cookie rotation still intact).

**F. Automated assertion (optional, Puppeteer — already a devDependency).** Script: clear storage → OAuth login → assert the `/atrium` document response `response.fromCache() === false` and that an authenticated DOM marker is present on first load without calling `page.reload()`.

**Definition of done:** Scenario C steps 3–5 pass on a fresh profile AND scenario D passes for an already-poisoned client — first post-Apple-login `/atrium` render is authenticated, fresh, and reload-free, for both new and existing users.