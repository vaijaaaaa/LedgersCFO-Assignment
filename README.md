# LedgersCFO Compliance Task Tracker

A minimal full-stack web app to manage compliance tasks for multiple clients.

## Features

- Client list with selection
- Add new clients dynamically
- Task list for selected client
- Add new task
- Update task status
- Filter by status and category
- Overdue pending task highlighting
- Persistent storage using a local JSON database
- Clean UI built with reusable shadcn-style components

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn-style UI component layer (`components/ui/*`)

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Run development server

```bash
npm run dev
```

3. Open app

```text
http://localhost:3000
```

## Build & Run (Production)

```bash
npm run build
npm run start
```

## API Endpoints

- `GET /api/clients`
	- Returns all clients
- `POST /api/clients`
	- Creates a client with basic validation
- `GET /api/clients/:clientId/tasks`
	- Returns all tasks for one client
- `POST /api/clients/:clientId/tasks`
	- Creates a task with basic validation
- `PATCH /api/tasks/:taskId/status`
	- Updates task status with validation

## Data Storage

- Production persistence: Supabase Postgres (`@supabase/supabase-js`)
- Local development fallback: `data/db.json`
- SQL schema file: `supabase-schema.sql`

### Supabase Setup (Required for deployed writes)

1. Create a Supabase project
2. In Supabase SQL Editor, run `supabase-schema.sql`
3. In Vercel project environment variables, set:
	- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
	- one key from: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
4. Redeploy

Without Supabase env vars, app falls back to local JSON storage (works locally, not for persistent writes on serverless deploys).

For this MVP, `supabase-schema.sql` includes grants and permissive RLS policies so anon/public keys can perform CRUD.

## Deployment (Vercel)

1. Push this repo to GitHub
2. Import the GitHub repo into Vercel
3. Deploy with default settings

Alternative CLI deployment:

```bash
npm i -g vercel
vercel
```

## Tradeoffs

- Used JSON file storage instead of a DB to keep implementation under a day
- No auth/multi-user access since requirement focused on core task flow
- Basic server-side validation and error handling, not enterprise-grade rules engine

## Assumptions

- Single internal team user context
- Compliance dates are managed in local date format (`YYYY-MM-DD`)
- Status workflow is limited to `Pending`, `In Progress`, and `Completed`

## Submission Checklist

- [ ] Deployed app link
- [ ] GitHub repo link with commit history
- [x] Setup instructions
- [x] Tradeoffs and assumptions
