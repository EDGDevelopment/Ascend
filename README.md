# Ascend

AI-powered growth intelligence for small businesses and non-profits. Upload a spreadsheet of monthly revenue (and spending, if you have it) and Ascend:

- **Forecasts** the next 12 months, with a range instead of a single guess.
- **Values** a local business, or reports the **cash runway** and funding risk of a non-profit.
- **Flags** unusual months, works out break-even, and lets you try "what if" changes.
- **Answers questions**: an AI assistant that has read your spreadsheet and results, with **Explain this** buttons beside the main numbers.
- **Writes a growth plan**: ranked, specific opportunities, each with the figures from your own data behind it.

Everything on the dashboards comes from the spreadsheet you upload. Nothing is sample data.

## How it works

| Part | What it does | Where |
| --- | --- | --- |
| Forecasting engine | Blends statistical methods with the **Ascend Patch Forecaster**, a small transformer trained on 48,000 real series. Ranges come from a Monte Carlo of simulated futures, and each run tests itself on your most recent months. | `supabase/functions/_shared/valuation/` |
| Valuation | Earnings multiple, discounted cash flow and excess earnings for owner-run businesses. Cash runway, reserves and funding mix for non-profits. | same folder |
| Assistant | Answers questions about your spreadsheets, results and the app. Your figures are put in front of an AI model with each question. It is not retrained per user. | `src/chat/`, `supabase/functions/chat/` |
| Growth plan | A ranked list of 4 to 6 opportunities written from your own numbers, returned in a strict, checked format. | `supabase/functions/opportunities/` |

The engine is plain TypeScript with no browser, Node or Deno APIs, so the same files run in the browser and in the Supabase Edge Function and give identical numbers for a given seed. How it was built and tested, and its limits, are in [docs/guides/VALUATION.md](docs/guides/VALUATION.md). On real monthly retail series it averaged about 95% monthly accuracy with 36 months of history.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Recharts
- Supabase: Auth, Postgres with Row Level Security, and Edge Functions (Deno)
- Azure OpenAI for the assistant and the growth plan, called only from Edge Functions
- Python and PyTorch for training the Patch Forecaster (optional, not needed to run the app)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173.

**Demo mode.** With no Supabase credentials the app runs in demo mode: choose **Continue as demo user** on the login page. The forecasts, valuation and dashboards all work, running in the browser, and spreadsheets are kept in that browser only. The **assistant** and **growth plan** need the Supabase functions, so they are unavailable in demo mode.

**Full mode.** Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never commit `.env.local`, and never put a service or secret key in any `VITE_` variable. Setup steps are in [docs/guides/SUPABASE_SETUP.md](docs/guides/SUPABASE_SETUP.md).

To try it, upload one of the files in [`data/sample-data/`](data/sample-data/README.md) on the Financial model page. `cafe-36-months.csv` is a good first one.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type check and build for production |
| `npm run typecheck` | Type check only |
| `npm run lint` | Run ESLint |
| `npm test` | Run the engine and assistant tests |
| `npm run preview` | Serve the production build |

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login`, `/signup` | Public | Authentication |
| `/forgot-password`, `/reset-password` | Public | Password recovery |
| `/dashboard` | Signed in | Overview: key figures and the forecast chart |
| `/dashboard/forecasts` | Signed in | Forecasts and scenario explorer |
| `/dashboard/valuation` | Signed in | Financial model: upload, forecast, value or cash runway, and the toolkit (What if, Break-even, Cash safety, Alerts, Customers, Details) |
| `/dashboard/opportunities` | Signed in | AI growth plan, ranked levers and plain-English takeaways |
| `/dashboard/data` | Signed in | Your spreadsheets: add, switch, rename, delete |
| `/dashboard/model` | Signed in | How your forecast was made and how well the method works |

The **Ask Ascend** button, bottom right of every dashboard page, opens the assistant. Chat history is kept in the browser, per user.

## Supabase

Run the migrations in `supabase/migrations/` (`profiles`, then `valuation_datasets`; `0002` is superseded by `0003`). Then deploy the functions:

| Function | Purpose | Secrets |
| --- | --- | --- |
| `valuation` | Runs the model on the server | none |
| `chat` | Streams assistant answers | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` |
| `opportunities` | Writes the growth plan | same three |

```bash
npx supabase secrets set AZURE_OPENAI_ENDPOINT=... AZURE_OPENAI_API_KEY=... AZURE_OPENAI_DEPLOYMENT=...
npx supabase functions deploy chat
npx supabase functions deploy opportunities
npx supabase functions deploy valuation
```

All functions require a signed-in user, limit calls per user, and only accept requests from allowed origins (set `ALLOWED_ORIGINS` for your deployed site). Details, safety measures and the privacy note for the AI features are in [docs/guides/ASSISTANT.md](docs/guides/ASSISTANT.md). A daily GitHub Action keeps a free-tier Supabase project from pausing (see `.github/workflows/supabase-keepalive.yml`).

## Project layout

```
src/
  auth/        Auth service, Supabase and demo implementations, route guard
  chat/        Assistant panel, Explain this buttons, growth plan client
  components/  Shared UI (logo, buttons, form fields)
  dashboard/   App shell, pages and components
  data/        Dashboard data derived from the model output
  lib/         Env, Supabase client, formatters
  pages/       Landing and auth screens
  valuation/   Spreadsheet parsing, saved datasets, running the engine
supabase/
  functions/   Edge Functions: valuation, chat, opportunities
    _shared/   The engine (valuation/), assistant data summary and plan checker (chat/), shared AI helpers (ai/)
  migrations/  SQL schema with Row Level Security
tests/         Engine, data summary and growth-plan checker tests
scripts/       Rolling backtest of the forecaster on real data
training/      Training code for the Patch Forecaster (Python, optional)
data/          Sample spreadsheets for trying the app
docs/          Guides, deliverables, presentations, certificates (see docs/README.md)
```

## Limits to know about

- The forecast and valuation are **estimates with ranges**, not advice. Business value in particular uses rules-of-thumb multiples, and the page says when its methods disagree.
- Forecasts need at least 12 months, and are much better with 24 to 36 or more.
- The "biggest levers" ranking and business value are for local businesses. Non-profits get cash runway, reserves and funding-mix results instead.
- The assistant and growth plan are written by an AI model. They quote figures from the user's data, but those figures should be checked against the spreadsheet, and the pages say so.
- Users' monthly figures are sent to Azure OpenAI when they use the assistant or growth plan. State this in your privacy policy before real customers use it.
