# Smart Thread — Cloud Setup Guide

## Architecture

```
User → Auth Screen → Supabase Auth (email/password, Google, magic link)
                   ↓
             App loads → Supabase DB (profiles, history, account settings)
                       → localStorage (offline fallback + cache)
                       → Netlify Functions (AI generation, license verification)
```

**Users can skip auth** and use local-only mode. When they sign in later, local data is their starting point — cloud data overwrites on sync.

---

## 1. Supabase Setup (5 min)

1. Go to [supabase.com](https://supabase.com) → create a new project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Open the **SQL Editor** and paste the contents of `supabase-schema.sql` → Run
4. Enable auth providers in **Authentication → Providers**:
   - **Email** — enabled by default (supports password + magic link)
   - **Google** — add your Google OAuth Client ID & Secret ([guide](https://supabase.com/docs/guides/auth/social-login/auth-google))

### Set redirect URL for OAuth
In Supabase → Authentication → URL Configuration:
- Site URL: `https://your-app.netlify.app`
- Redirect URLs: `https://your-app.netlify.app`

---

## 2. Environment Variables

### Local development
Copy `.env.example` → `.env` and fill in:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Netlify (production)
In Netlify Dashboard → Site settings → Environment variables, add:
```
VITE_SUPABASE_URL        = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJhbGci...
ANTHROPIC_API_KEY         = sk-ant-...
GUMROAD_PRODUCT_ID        = your-product-id
```

> The `VITE_` prefix exposes vars to the frontend build. Server-side vars (ANTHROPIC_API_KEY, GUMROAD_PRODUCT_ID) stay secret.

---

## 3. Gumroad License Flow

### How it works
1. User buys on Gumroad → gets a license key via email
2. User enters key in Settings → Activate
3. App calls `/api/verify-license` (Netlify function)
4. Function calls Gumroad's `/v2/licenses/verify` API
5. Response includes tier (starter/pro/team based on variant or price)
6. Tier + key saved to Supabase `user_accounts` table
7. User logs in on any device → tier is synced

### Gumroad setup
- Create a product with **License Keys** enabled
- Use **variants** named "Grow", "Scale", "Dominate", "Forever" (the function checks variant names)
- Or use price tiers: <$49 = Grow, $49-$98 = Scale, $99-$198 = Dominate, $199+ = Forever
- Copy your Product ID to the `GUMROAD_PRODUCT_ID` env var

### Customizing tier detection
Edit `netlify/functions/verify-license.mjs` to match your Gumroad setup. The default logic checks `purchase.variants` (name-based) then falls back to `purchase.price` (price-based).

---

## 4. Database Schema

### Tables
| Table | Purpose |
|-------|---------|
| `user_accounts` | Plan, license, theme, usage counters (1 row per user) |
| `profiles` | Brand voice profiles (multiple per user) |
| `thread_history` | Generated threads (max 50 per user) |

### Row Level Security
All tables have RLS enabled. Users can only read/write their own rows via `auth.uid()`.

### Auto-provisioning
A database trigger (`handle_new_user`) auto-creates a `user_accounts` row when someone signs up.

---

## 5. How Sync Works

```
Login detected
  → Pull user_accounts, profiles, thread_history from Supabase
  → Overwrite local state + localStorage cache
  → All mutations write to BOTH localStorage + Supabase

No login (local mode)
  → All data in localStorage only
  → "Sign in to sync" button in Settings
```

**Conflict resolution**: Cloud data wins on login. Local data is the fallback/cache for offline or fast loading.

---

## 6. Running Locally

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev             # starts at localhost:5173
```

For Netlify functions locally:
```bash
npx netlify dev         # starts at localhost:8888 with functions
```

---

## 7. Deploy

```bash
git push  # Netlify auto-deploys from your connected repo
```

Or manual:
```bash
npm run build
npx netlify deploy --prod
```
