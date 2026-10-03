# Ascend

AI-powered growth intelligence for small businesses. Ascend learns the pattern of a business from 12 to 24 months of its own data, forecasts what comes next, flags unusual changes, and turns them into ranked growth opportunities.

This repository holds the web frontend. The custom time-series neural network and the backend are in development, so the dashboard currently runs on sample data.

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- React Router
- Recharts
- Supabase Auth (optional, demo mode when not configured)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173. Without Supabase credentials the app runs in demo mode: use **Continue as demo user** on the login page.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Serve the production build |

## Connecting Supabase

See [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never commit `.env.local`.

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login`, `/signup` | Public | Authentication |
| `/forgot-password`, `/reset-password` | Public | Password recovery |
| `/dashboard` | Signed in | Overview |
| `/dashboard/forecasts` | Signed in | Forecasts and scenario explorer |
| `/dashboard/opportunities` | Signed in | Ranked growth opportunities |
| `/dashboard/data` | Signed in | Data sources and CSV upload (mock) |
| `/dashboard/model` | Signed in | Model details and training runs (mock) |

## Project layout

```
src/
  auth/        Auth service, Supabase and demo implementations, route guard
  components/  Shared UI (logo, buttons, form fields)
  dashboard/   App shell, dashboard pages and components
  data/        Types and mock data behind useDashboardData
  lib/         Env, Supabase client, formatters
  pages/       Landing and auth screens
supabase/      SQL migrations
docs/          Setup guides
```

## Status

Mocked for now: all dashboard data, forecasts, opportunities, model metrics, CSV validation, and the scenario slider. Real authentication works as soon as Supabase is connected.
