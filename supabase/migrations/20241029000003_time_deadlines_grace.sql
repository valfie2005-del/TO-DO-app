-- ============================================================
-- Time-based deadlines, grace periods, completion timestamps
-- Backward-compatible: existing rows remain valid
-- ============================================================

-- Task time window (local wall-clock times as TIME)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS description TEXT NULL,
  ADD COLUMN IF NOT EXISTS start_time TIME NULL,
  ADD COLUMN IF NOT EXISTS end_time TIME NULL,
  ADD COLUMN IF NOT EXISTS grace_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (grace_minutes >= 0 AND grace_minutes <= 180);

-- Migrate reminder_time → start_time when start_time is null
UPDATE public.tasks
SET start_time = reminder_time
WHERE start_time IS NULL AND reminder_time IS NOT NULL;

-- Completions: when completed + on-time vs late
ALTER TABLE public.completions
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS completion_kind TEXT NULL
    CHECK (completion_kind IS NULL OR completion_kind IN ('on_time', 'late'));

-- Backfill completed_at from created_at where missing
UPDATE public.completions
SET completed_at = created_at
WHERE completed_at IS NULL;

COMMENT ON COLUMN public.tasks.start_time IS 'Local start time HH:MM; null = untimed / all-day legacy task';
COMMENT ON COLUMN public.tasks.end_time IS 'Local end/deadline time HH:MM; null = default start+60m when start exists';
COMMENT ON COLUMN public.tasks.grace_minutes IS 'Minutes after end_time before task is Missed (default 30)';
COMMENT ON COLUMN public.completions.completed_at IS 'UTC timestamp when user marked complete';
COMMENT ON COLUMN public.completions.completion_kind IS 'on_time = before end_time; late = during grace period';
