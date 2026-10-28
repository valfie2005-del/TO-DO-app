-- ============================================================
-- 40 Days — Initial Schema
-- Tasks + Completions with Row Level Security
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('challenge', 'single')),
  start_date      DATE NOT NULL,
  duration_days   INTEGER NOT NULL,
  due_date        DATE,                     -- for single tasks = start_date; for challenges = end date
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT tasks_title_length CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  CONSTRAINT tasks_duration_range CHECK (duration_days BETWEEN 1 AND 365),
  CONSTRAINT tasks_single_duration CHECK (
    (type = 'single' AND duration_days = 1) OR type = 'challenge'
  ),
  CONSTRAINT tasks_single_due_date CHECK (
    (type = 'single' AND due_date = start_date) OR type = 'challenge'
  )
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_user_start ON public.tasks(user_id, start_date);
CREATE INDEX idx_tasks_type ON public.tasks(type);

COMMENT ON TABLE public.tasks IS 'User tasks: multi-day challenges or single-day tasks';
COMMENT ON COLUMN public.tasks.type IS 'challenge = multi-day habit, single = one-day task';
COMMENT ON COLUMN public.tasks.start_date IS 'First scheduled calendar date (ISO date)';
COMMENT ON COLUMN public.tasks.duration_days IS 'Number of consecutive scheduled days (1-365)';
COMMENT ON COLUMN public.tasks.due_date IS 'For challenges: last scheduled date. For single: equals start_date';

-- ============================================================
-- COMPLETIONS
-- ============================================================
CREATE TABLE public.completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_on    DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT completions_unique_day UNIQUE (task_id, completed_on)
);

CREATE INDEX idx_completions_task_id ON public.completions(task_id);
CREATE INDEX idx_completions_completed_on ON public.completions(completed_on);
CREATE INDEX idx_completions_task_date ON public.completions(task_id, completed_on);

COMMENT ON TABLE public.completions IS 'One record per task per completed calendar date';

-- ============================================================
-- HELPER: Check if a date is within a task schedule
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_date_in_task_schedule(
  p_task_id UUID,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = p_task_id
      AND p_date >= t.start_date
      AND p_date < (t.start_date + t.duration_days)
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;

-- Tasks policies: users can only access their own rows
CREATE POLICY "tasks_select_own"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Completions policies: access only through owning task
CREATE POLICY "completions_select_own"
  ON public.completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "completions_insert_own"
  ON public.completions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
    AND public.is_date_in_task_schedule(task_id, completed_on)
  );

CREATE POLICY "completions_delete_own"
  ON public.completions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
  );

-- No direct UPDATE policy on completions — toggle by delete + insert

-- ============================================================
-- TRIGGER: Keep due_date in sync for challenges
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_challenge_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'challenge' THEN
    NEW.due_date := NEW.start_date + (NEW.duration_days - 1);
  ELSIF NEW.type = 'single' THEN
    NEW.due_date := NEW.start_date;
    NEW.duration_days := 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_challenge_due_date
  BEFORE INSERT OR UPDATE OF start_date, duration_days, type
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_challenge_due_date();
