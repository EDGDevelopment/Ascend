# Ascend Assistant (chatbot)

A floating **Ask Ascend** button on every dashboard page opens a chat that answers questions about the user's own spreadsheets, the forecast and value the app worked out, and how to read anything on screen.

## How it works

It is not retrained on each user's data. Every question is answered by an AI model with that user's numbers placed in front of it:

```
src/chat/ChatWidget.tsx                       the chat panel (suggested questions, streaming, stop, new chat)
supabase/functions/_shared/chat/digest.ts     turns datasets + results into text the model reads
src/chat/chatService.ts                       streams the answer from the Edge Function
supabase/functions/chat/index.ts              Edge Function (JWT required) that calls Azure OpenAI
```

The **digest** holds, for each spreadsheet: every month of revenue and expenses, exact totals worked out in code (per year, last 12 months against the 12 before, best and worst months, average by calendar month), the full forecast with its ranges and self-test score, the business value or cash-runway results, alerts and break-even. Totals are computed in code because language models are unreliable at arithmetic over raw rows. A short guide to each page and a glossary (SDE, DCF, ranges, runway) is added so it can explain anything the app shows.

The open spreadsheet is flagged, so "my best month" means the one on screen. Other uploaded spreadsheets are included too (up to about 120,000 characters).

## Explain this buttons

A small **Explain this** button sits beside the main numbers: business value, cash runway, the forecast, break-even, cash safety, alerts, the takeaways and the ranked levers. It opens the chat with a question already asked and sent. In code it is one line: `<Stage explain="...">` or `<Card explain="...">` (see `ExplainButton.tsx`). Any component can also call `askAscend(question)` from `src/chat/chatBus.ts`. If an answer is still arriving, the question is put in the input box instead of interrupting it.

## AI growth plan

The **Opportunities** page has a **Your AI growth plan** card. One click writes 4 to 6 ranked, specific opportunities for the open spreadsheet. Each has a category, effort ("quick win" to "bigger project"), why it matters, the user's own figures that support it, what it could be worth, and a first step for this week, plus an **Ask about this** link into the chat.

```
src/dashboard/components/AiOpportunities.tsx        the card
src/chat/opportunitiesService.ts                     calls the function; saves the plan in the browser
supabase/functions/opportunities/index.ts            Edge Function (JWT required, 6 plans a minute per user)
supabase/functions/_shared/chat/opportunities.ts     the instructions, and a strict checker for the reply
```

It uses the same digest as the chat, which includes the "Biggest levers" table (the effect of a 10% move in price, volume and costs), so impact figures come from the user's own numbers. The model must reply in a fixed JSON shape; anything that does not fit is rejected, text is length-limited and unexpected fields are dropped before the page sees it. Plans are saved per user and spreadsheet in the browser, and the card says when the numbers have changed since the plan was written.

## Safety

- The Azure OpenAI key is a Supabase secret and never reaches the browser. Only signed-in users can call the function.
- The model has no tools: it can only write text, so a spreadsheet cannot make it do anything.
- Spreadsheet content is fenced as data and the model is told to ignore instructions inside it.
- Per-user limit of 20 questions a minute, 30 messages and 4,000 characters per message.
- Answers are labelled as AI-generated and the model is told not to give investment, tax or legal advice.

## Setup

The function uses an Azure OpenAI chat deployment (currently `gpt-4.1-mini`). Set three secrets, then deploy:

```bash
npx supabase secrets set AZURE_OPENAI_ENDPOINT=https://<resource>.services.ai.azure.com/ AZURE_OPENAI_API_KEY=<key> AZURE_OPENAI_DEPLOYMENT=<deployment-name>
npx supabase functions deploy chat
npx supabase functions deploy opportunities
```

Optional: `AZURE_OPENAI_API_VERSION` (default `2025-01-01-preview`) and `ALLOWED_ORIGINS` (shared with the valuation function). The chat is not available in demo mode because it needs the Supabase function.

## What gets sent to the AI provider

The user's monthly figures and results are sent to Azure OpenAI with each question. Say so in the privacy policy before real customers use it.
