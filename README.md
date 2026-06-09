# Recovery Dashboard

Personal Recovery Operating System. Single user. Desktop-first. Dark mode only.

Built with:
- Next.js 16 (App Router)
- Prisma 7 + SQLite
- Tailwind CSS v4
- Chart.js (via react-chartjs-2)

## Key Constraints & Philosophy
- **5 metrics only**: Pain, Walking, Compliance, Strength, Reflux
- **No symptom encyclopedia**, no PRI tracking, no 50-metric dashboards
- **Protocol Lock**: Prevents protocol changes before a set date
- **Recovery Score**: Weighted composite score from Day 1
- **< 30 seconds** for daily check-in — zero friction
- **Data export**: JSON + CSV always available

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, generate the Prisma client and push the schema to your local dev DB:

```bash
npx prisma generate
npx prisma migrate dev
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture & Code Conventions

- **Server Components by default.** Only add `'use client'` when needed.
- **Routing:** Route handlers in `src/app/recovery/api/[resource]/route.ts`
- **Styling:** Tailwind CSS v4 utility classes. Dark mode only.
- **Events:** The system abstracts raw data interpretation into events via `RecoveryEventProvider`.
