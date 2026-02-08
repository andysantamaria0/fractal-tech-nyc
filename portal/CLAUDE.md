# Portal — Agent Reference

## CRITICAL: Engineer Subdomain Auth Flow

**This is the #1 UX rule for this codebase. Violating it is unacceptable.**

### The Rule

Any user on `eng.fractaltech.nyc` must NEVER see any company page. Not `/login`, not `/complete-profile`, not `/dashboard`, not `/signup`. NEVER. They must only ever see `/engineer/*` routes.

### Why This Breaks

Supabase magic links redirect through Supabase's auth server to the project's **Site URL** (`partners.fractaltech.nyc`), NOT the subdomain the user was on (`eng.fractaltech.nyc`). This means:

1. Engineer visits `eng.fractaltech.nyc` → gets `/engineer/login`
2. Enters email → magic link sent with `emailRedirectTo: https://eng.fractaltech.nyc/callback?next=/engineer/onboard`
3. Supabase sends email with link to `https://<project>.supabase.co/auth/v1/verify?...&redirect_to=https://eng.fractaltech.nyc/callback?next=/engineer/onboard`
4. **BUT** if `eng.fractaltech.nyc` is not in Supabase's Redirect URLs, Supabase strips it and redirects to the Site URL instead
5. User lands on `partners.fractaltech.nyc/callback` **WITHOUT** the `?next=/engineer/onboard` parameter
6. Callback defaults `next` to `/dashboard`, engineer detection branch is skipped
7. New user (no profiles row) gets sent to `/complete-profile` — the COMPANY setup page

### The Defenses (multi-layered, do NOT remove any)

1. **Server-side login intent** (`engineer_login_intents` table + `app/api/engineer/mark-flow/route.ts`): When the engineer login page sends a magic link, it also writes the user's email to the `engineer_login_intents` table. The callback checks this table. This is the PRIMARY defense — it works across browsers, devices, and subdomains. Cleaned up after use.

1b. **Cross-subdomain cookie** (backup): The engineer login page also sets `x-engineer-flow=1` cookie on `.fractaltech.nyc` domain. Works in same-browser flows even if the DB write fails.

2. **Middleware hard guard** (`middleware.ts`): If `host.startsWith('eng.')`, redirect ALL company pages (`/`, `/login`, `/signup`, `/complete-profile`, `/dashboard`, `/cycles/*`, `/settings/*`, `/hiring-spa/*`) to engineer equivalents. This runs BEFORE any auth logic.

3. **Callback route fallback** (`app/(auth)/callback/route.ts`): If user has no engineer record AND no profiles record, redirect to `/engineer/onboard` (not `/complete-profile`). Rationale: company users ALWAYS have a profiles row created by admin invite. A profileless user is always an engineer. NOTE: This fallback can be defeated if the bug previously ran and created a stale profiles row — that's why the cookie (defense #1) exists.

4. **Middleware auth-page redirect** (`middleware.ts` line ~182): Authenticated user on `/engineer/login` with no engineer record → `/engineer/onboard`.

### Why the profiles table is NOT a reliable signal

The bug itself creates stale `profiles` rows. When an engineer gets redirected to `/complete-profile` and fills out the form, a `profiles` row is created. This row then permanently defeats any "no profile = engineer" check. The cookie is the only reliable signal because it's set BEFORE the magic link is sent, not after.

### When Modifying Auth Flow

- ALWAYS test with a brand-new email on `eng.fractaltech.nyc`
- Verify the user sees `/engineer/onboard`, NOT `/complete-profile`
- Check that the `?next=` parameter survives the Supabase redirect (it often doesn't — that's why we have the fallback)
- NEVER assume `next` parameter will be present in the callback
- NEVER use the `profiles` table as a signal for "is this a company user" — the bug creates stale profiles rows
- The `x-engineer-flow` cookie on `.fractaltech.nyc` is the source of truth — do NOT remove it

## Architecture Notes

### Subdomain Routing
- `eng.fractaltech.nyc` — Engineer-facing portal
- `partners.fractaltech.nyc` — Company/partner-facing portal
- Both served by the same Next.js app; middleware differentiates by `host` header

### Auth Flow
- Supabase magic link OTP (PKCE flow)
- Callback at `/callback` exchanges code for session
- Middleware handles redirects based on user type (engineer vs company)
- Engineers table: `engineers` (checked by `auth_user_id` then `email`)
- Company users table: `profiles` (always created by admin invite)

### Key Files
- `middleware.ts` — All routing/redirect logic
- `app/(auth)/callback/route.ts` — Post-auth routing decisions
- `app/engineer/login/page.tsx` — Engineer magic link entry point
- `lib/api/admin-helpers.ts` — `withAdmin()` wrapper for admin API routes
