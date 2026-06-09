<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Recovery Dashboard — Agent Rules

## Project Overview

Personal Recovery Operating System. Single user. Desktop-first. Dark mode only.
Built with Next.js 16 (App Router) + Prisma + SQLite + Tailwind CSS v4 + Chart.js.

## Tech Stack Constraints

- **Next.js 16** with App Router (`src/app/`)
- **Tailwind CSS v4** — use utility classes, no vanilla CSS unless absolutely necessary
- **Prisma 7** with SQLite — schema at `prisma/schema.prisma`
- **Chart.js** via `react-chartjs-2` for all charts
- **TypeScript** — strict mode, no `any` types
- **No external UI libraries** — no shadcn, no MUI, no Radix. Build components from scratch with Tailwind.

## Coding Conventions

### Components
- Server Components by default. Only add `'use client'` when needed (interactivity, hooks, browser APIs).
- Components go in `src/components/`. Subdirectories: `ui/`, `charts/`.
- One component per file. Named exports preferred.
- All interactive elements must have unique, descriptive `id` attributes.

### API Routes
- Route handlers in `src/app/recovery/api/[resource]/route.ts`
- Use `NextRequest` / `NextResponse`
- Always validate input. Return proper HTTP status codes.
- JSON responses only.

### Database
- Never modify `prisma/schema.prisma` without running `npx prisma migrate dev`
- Use the Prisma client singleton from `src/lib/prisma.ts`
- All dates stored as ISO 8601 strings or DateTime

### Styling
- Tailwind CSS v4 utility classes — use `@theme` in `globals.css` for design tokens
- Dark mode only (no light mode toggle needed)
- Design aesthetic: Notion × Linear × Obsidian — clean, calm, lots of whitespace
- Font: Inter (sans) + JetBrains Mono (monospace for data)
- No bright/flashy fitness-app colors. Use muted, sophisticated palette.

### File Structure
- All recovery pages under `src/app/recovery/`
- Shared utilities in `src/lib/`
- Reusable components in `src/components/`

## Verification Loops

After making code changes, always verify:

1. **Build check**: `npm run build` — must pass with zero errors
2. **Lint check**: `npm run lint` — must pass
3. **Dev server**: `npm run dev` — app loads without console errors
4. **Prisma**: After schema changes, run `npx prisma migrate dev` then `npx prisma generate`

## Key Design Decisions

- **5 metrics only**: Pain, Walking, Compliance, Strength, Reflux
- **No symptom encyclopedia**, no PRI tracking, no 50-metric dashboards
- **Protocol Lock**: Prevents protocol changes before a set date
- **Recovery Score**: Weighted composite score from Day 1
- **< 30 seconds** for daily check-in — zero friction
- **Data export**: JSON + CSV always available

## Don't

- Don't install additional UI component libraries
- Don't add light mode
- Don't add multi-user/auth/signup
- Don't add social features
- Don't track PRI, posture, or symptom details
- Don't use `pages/` directory — App Router only
