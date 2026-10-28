# 40 Days

Premium habit & task management SaaS. Small daily actions create lasting change.

## Status

**All phases complete (0–8)**

| Phase | Status |
|-------|--------|
| 0 — Environment & Foundation | ✅ |
| 1 — Database & Security | ✅ |
| 2 — Pure Business Logic + Unit Tests | ✅ |
| 3 — Authentication & Protected Routes | ✅ |
| 4 — Typed API Layer | ✅ |
| 5 — Design System | ✅ |
| 6 — Core Screens | ✅ |
| 7 — Motion, Polish & Accessibility | ✅ |
| 8 — Testing, Hardening & Documentation | ✅ |

---

## Product overview

**40 Days** helps users build lasting habits through time-bound challenges and one-day tasks.

Primary journey: Register → Create a challenge → Complete today’s task → Track streaks → Review progress → Extend or finish.

Secondary: Create a one-day task → Complete it on its scheduled date → Review in the calendar.

---

## Architecture

```
Frontend:  React 19 + TypeScript + Vite + Tailwind CSS v4
State:     Zustand (auth + UI)
Animation: Framer Motion
Forms:     React Hook Form + Zod
Dates:     date-fns + date-fns-tz
Backend:   Supabase (Auth + PostgreSQL + Row Level Security)
```

```
src/
  api/           # Typed API (tasks, completions, errors)
  components/
    auth/        # ProtectedRoute, PublicOnlyRoute
    calendar/
    challenges/
    layout/      # AppShell (desktop nav + mobile tabs)
    tasks/       # AddTaskModal
    ui/          # Design system
  hooks/         # useTasks, usePrefersReducedMotion
  lib/           # supabase client, cn()
  pages/         # Login, Register, Today, Challenges, Calendar
  store/         # authStore, uiStore
  types/         # Domain + Database types
  utils/         # Pure date, streak, progress, validation logic
supabase/
  migrations/    # SQL schema + RLS
tests/
  unit/          # dates + streaks unit tests
```

---

## Prerequisites

- Node.js 20+
- npm 10+
- A free [Supabase](https://supabase.com) project

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key

# 3. Apply database migration
# Option A — Supabase CLI:
supabase db push
# Option B — Dashboard: paste contents of
#   supabase/migrations/20241028000001_initial_schema.sql
# into the SQL Editor and run it.

# 4. Start development server
npm run dev
```

### Environment variables (`.env.local`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
# Optional:
# VITE_DEFAULT_TIMEZONE=America/New_York
```

Never commit real credentials. The anon key is safe for the browser; RLS protects data.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Watch mode |
| `npm run lint` | Lint with oxlint |

---

## Database schema & security

### Tables

**tasks**
- `id` UUID PK
- `user_id` UUID → `auth.users` (CASCADE)
- `title` TEXT (1–120 chars)
- `type` `'challenge' | 'single'`
- `start_date` DATE
- `duration_days` INTEGER (1–365)
- `due_date` DATE (auto-maintained by trigger)
- `created_at` TIMESTAMPTZ

**completions**
- `id` UUID PK
- `task_id` UUID → tasks (CASCADE)
- `completed_on` DATE
- UNIQUE `(task_id, completed_on)`

### Row Level Security
- **tasks**: authenticated users CRUD only rows where `auth.uid() = user_id`
- **completions**: access authorized through the owning task; insert also requires the date to be inside the task schedule

Ownership is never taken from a client-supplied `user_id`. The API always uses `supabase.auth.getUser()`.

Full SQL: `supabase/migrations/20241028000001_initial_schema.sql`

---

## Date & timezone contract

- Scheduled dates are ISO calendar strings: `yyyy-MM-dd`
- “Today” is determined from the user’s IANA timezone (browser default unless `VITE_DEFAULT_TIMEZONE` is set)
- Never use millisecond arithmetic for day counts or streaks
- Completions allowed on scheduled days and at most **one calendar day** into the future
- Historical challenge days can be corrected; one-day tasks follow the same schedule rules

Core pure functions live in `src/utils/dates.ts` and `src/utils/streaks.ts`.

---

## Features implemented

### Auth
- Register (email, password policy, confirm password)
- Login (show/hide password)
- Session restore on refresh
- Logout clears client state and redirects
- Protected routes + loading screen (no private content flash)
- Email confirmation flow when required by Supabase

### Today
- Greeting by time of day
- Date navigation (previous / today / next, capped at +1 day)
- Animated circular progress ring
- Current + best streak
- Challenge and one-day task lists
- Optimistic completion toggle with rollback
- Confetti only on incomplete → fully complete transition
- Floating action button

### Challenges
- Active / Finished sections
- Progress ring, streaks, date range
- Day tile grid (exactly N tiles for an N-day challenge)
- Tile states: completed, today, missed, upcoming
- Rename, extend +10 days (max 365), delete with confirmation
- Past-day correction supported

### Calendar
- Monday-first monthly grid
- Heatmap by completion percentage
- Selected-day panel with tasks and completion controls
- Add task prefilled with selected date

### Add Task modal
- Challenge vs one-day segmented control
- Duration chips (21 / 40 / 66 / 100)
- End-date preview
- Zod validation

---

## Testing

Unit tests cover all required acceptance cases from the product spec:

```bash
npm test
```

Key cases include:
1. 40-day challenge → exactly 40 tiles  
2. Start 2026-01-01 duration 40 → ends 2026-02-09  
3. Three consecutive completions → streak of 3  
4. Incomplete today → streak counts from yesterday  
5. Missed day breaks streak  
6. Duplicate completions do not inflate progress  
7. One-day task appears only on its date  
8. Cannot complete two days into the future  
9. Extension by 10 days updates end date  
10. Cannot extend beyond 365  

**Note:** Integration and E2E tests against a live Supabase project require your own credentials and are not run in this environment. RLS isolation and auth flows should be verified after connecting your project.

---

## Production build

```bash
npm run build
npm run preview
```

---

## Accessibility

- Semantic structure and heading hierarchy
- Labels on all inputs
- Accessible names on icon-only controls
- Visible focus rings
- Dialog focus trap + Escape to close
- Keyboard-operable calendar and challenge grids
- `prefers-reduced-motion` respected globally
- Skip-to-content link
- Mobile touch targets ≥ 44px (except dense grids)
- Screen-reader announcements for completion state via `aria-checked`

---

## Known limitations

1. **Timezone preference** — Stored in the browser (or optional env default). Not persisted per-user in the database. Documented in the date contract.
2. **Email verification** — Depends on your Supabase project settings. The UI handles the “check your email” state when session is null after signup.
3. **Integration / E2E tests** — Written unit tests are complete. Full auth + RLS integration tests require a disposable Supabase project and were not executed in this sandbox.
4. **Offline** — No offline queue; network errors surface via toast and optimistic rollback.
5. **Forgot password** — Not implemented (can be added via Supabase `resetPasswordForEmail`).

---

## Design tokens

| Token | Value |
|-------|-------|
| Background | `#05070D` |
| Card | `#0B1020` |
| Primary | `#2F6BFF` |
| Cyan | `#4CC9FF` |
| Text | `#E8ECF8` |
| Muted | `#8B95B3` |
| Border | `rgba(76, 201, 255, 0.12)` |
| Glow | `rgba(47, 107, 255, 0.35)` |

---

## License

Private / all rights reserved unless otherwise stated.
