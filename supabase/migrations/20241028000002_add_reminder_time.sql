-- Optional preferred time of day for a task (local time, HH:MM)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reminder_time TIME NULL;

COMMENT ON COLUMN public.tasks.reminder_time IS 'Optional local time of day (HH:MM). Does not affect scheduling rules; for display/reminders only.';
