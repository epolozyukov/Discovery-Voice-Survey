# Discovery Voice Survey

Lightweight internal app that collects structured answers from Subject Matter Experts (SMEs) before Discovery
workshops. An admin defines a fixed list of questions; each SME gets a **personal link** and answers one question at a
time. No LLM is involved. Answers can be typed or recorded; recordings are transcribed to editable text.

**Status:** Phases 1–4 (core survey, voice input, results, integration + E2E tests). Remaining: Vercel deployment.

## Stack
Next.js 16 (App Router, Server Actions, `proxy.ts`), React, TypeScript (strict), Tailwind, Zod, Supabase (Postgres + Auth),
Vitest, Playwright. Hosted on Vercel.

## Design decisions
- **One link per SME** (`/survey/<43-char random token>`). Each link maps to one participant and one response.
- **All data access is server-side** using the Supabase service-role key. RLS is enabled with *no* policies, so the
  browser (anon key) cannot read or write tables directly.
- **Admins** sign in with Supabase Auth (email + password) and must also be listed in `ADMIN_EMAILS`. Disable public
  signups in Supabase (Auth → Providers → Email → disable "Allow new users to sign up") and create admin users manually.
- Answers are **autosaved to the server** on Next/Back and mirrored in `localStorage` to survive refreshes/network errors.
- Questions become **locked once any participant has answered** (delete the participant's data first to change them).

## Prerequisites
Node.js 20+ (developed on 25), npm, a Supabase project, a Vercel account for deployment.

## Local setup
```bash
git clone https://github.com/epolozyukov/Discovery-Voice-Survey
cd Discovery-Voice-Survey
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

### Environment variables
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (used only for admin sign-in) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret**, server only. Never expose to the browser |
| `ADMIN_EMAILS` | Comma-separated emails allowed into `/admin` |
| `NEXT_PUBLIC_MAX_ANSWER_LENGTH` | Optional, default 10000 |
| `NEXT_PUBLIC_MAX_RECORDING_SECONDS` | Optional, default 300 |
| `TRANSCRIPTION_BASE_URL` / `TRANSCRIPTION_API_KEY` / `TRANSCRIPTION_MODEL` | Any OpenAI-compatible `/audio/transcriptions` endpoint. **Secret**, server only |
| `NEXT_PUBLIC_TRANSCRIPTION_PROVIDER` | Set to `mock` for tests |

### Voice / privacy
The browser records with `MediaRecorder` (~32 kbps), uploads the temporary audio to `/api/transcription`, which forwards it
to the configured speech-to-text provider and returns text. **Audio is never stored** by this app. Whatever provider you
configure receives the audio, so choose one your organisation approves (or self-host faster-whisper). If unconfigured, the
route returns 503 and participants are told to type instead.

### Database setup
Apply `supabase/migrations/20260924000000_init.sql` (Supabase SQL editor, or `supabase db push` with the CLI).

## Testing
```bash
npm run lint
npm run typecheck
npm run test          # unit tests (Vitest)
npm run test:coverage
npm run test:e2e      # Playwright (starts its own server on :3100)
```
Business logic in `lib/domain/` was written test-first.

- **Integration tests** (`tests/integration`) and the **E2E happy path** (`tests/e2e/happy-path.spec.ts`) run against the
  Supabase project in `.env.local` and **skip automatically when it is not configured**. Use a dedicated test project, not production.
- E2E creates a temporary admin user (`e2e-admin@example.test`) and `E2E …` surveys, and deletes them afterwards.
- E2E uses the mock transcription provider and Chromium's fake microphone, so no real speech API is called.

## Deployment
Connect the GitHub repo to Vercel. Pull requests get Preview deployments; merges to `main` deploy to Production.
Set the environment variables above in Vercel for both environments. CI (`.github/workflows/ci.yml`) runs lint,
typecheck, unit tests, build and E2E on every PR.

## Known gaps / next steps
- Integration tests against a Supabase test project; full E2E happy path (needs test DB + admin user).
- Rate limiting (needs an external store such as Upstash on Vercel).
- Stricter nonce-based CSP.
- Voice E2E with the mock provider (needs the test DB); the transcription route's rate limit is per-instance only.
