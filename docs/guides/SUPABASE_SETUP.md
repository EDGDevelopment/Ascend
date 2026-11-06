# Connecting Supabase

Ascend runs without Supabase in **demo mode** (any email with a 6+ character password signs in, nothing is stored remotely). Follow these steps to switch to real authentication.

## 1. Create the project

1. Sign in at https://supabase.com/dashboard and click **New project**.
2. Choose an organization, name it `ascend`, set a strong database password (store it in your password manager, the app never needs it), and pick the region closest to your users.
3. Wait for provisioning to finish (about two minutes).

When the create-project form asks about the Data API options, use:

| Option | Setting | Why |
| --- | --- | --- |
| Enable Data API | On | supabase-js reads and writes tables through it |
| Automatically expose new tables | Off | Safer default. `0001_profiles.sql` grants access explicitly |
| Enable automatic RLS | On | Any table you add later starts with Row Level Security enabled |

## 2. Copy the API values

In the dashboard open **Project Settings > API** (or **API Keys**):

| Value | Where it goes | Variable |
| --- | --- | --- |
| Project URL, for example `https://abcd1234.supabase.co` | `.env.local` | `VITE_SUPABASE_URL` |
| Publishable key (previously called the anon key) | `.env.local` | `VITE_SUPABASE_PUBLISHABLE_KEY` |

Do **not** use the `service_role` or secret key anywhere in this repo. It bypasses Row Level Security and must never reach the browser.

## 3. Create `.env.local`

```bash
cp .env.example .env.local
```

Fill in the two values, then restart `npm run dev` (Vite only reads env files at startup). `.env.local` is git-ignored. Only `.env.example`, which has no real values, is committed.

## 4. Run the schema

Open **SQL Editor > New query**, paste the contents of `supabase/migrations/0001_profiles.sql`, and run it. This creates `profiles` and `businesses` with Row Level Security, plus a trigger that creates a profile whenever someone signs up.

Using the CLI instead:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## 5. Configure authentication

Under **Authentication > Providers**, make sure **Email** is enabled.

Under **Authentication > URL Configuration**:

- **Site URL**: `http://localhost:5173` for local work (change to your deployed URL later).
- **Redirect URLs**: add `http://localhost:5173/**`, plus `https://<your-domain>/**` once deployed. Password reset and email confirmation links must land on an allowed URL.

Under **Authentication > Sign In / Providers > Email**:

- **Confirm email**: on for production. For the sprint review you can turn it off so new accounts sign in immediately. With it on, the signup screen shows a "Check your inbox" message instead.

Supabase's built-in email sender is rate limited. For anything beyond light testing, configure a custom SMTP provider under **Authentication > SMTP Settings**.

## 6. Verify

1. `npm run dev` and open http://localhost:5173/signup. The "Demo mode" box on the login page should no longer appear.
2. Create an account. Check **Authentication > Users** and **Table Editor > profiles** to see the new rows.
3. Sign out and back in. Try **Forgot password** and follow the emailed link to `/reset-password`.

## Deploying

Set the same two `VITE_` variables in your host (Vercel, Netlify, and so on) as environment variables, add the deployed URL to Supabase's **Site URL** and **Redirect URLs**, and for single page app routing make sure the host rewrites unknown paths to `index.html`.

## Where the code lives

- `src/lib/env.ts` and `src/lib/supabase.ts`: read the variables and create the client.
- `src/auth/supabaseAuth.ts`: sign in, sign up, sign out, reset password.
- `src/auth/demoAuth.ts`: the offline fallback.
- `src/auth/authService.ts`: picks one based on whether the variables are set.
- `src/data/useDashboardData.ts`: the single place to swap mock dashboard data for Supabase queries.
