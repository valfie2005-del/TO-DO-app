import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'
import { normalizeCreateTask, type CreateTaskInput } from '@/utils/validation'
import { toApiError } from './errors'
import { extendChallengeDuration } from '@/utils/streaks'

export type { CreateTaskInput }
export type TaskRow = Task

/** Fetch all tasks for the authenticated user */
export async function fetchTasks(): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw toApiError(error, 'Failed to load tasks')
  return (data ?? []) as TaskRow[]
}

/** Fetch a single task by id (RLS ensures ownership) */
export async function fetchTask(id: string): Promise<TaskRow | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw toApiError(error, 'Failed to load task')
  return data as TaskRow | null
}

/** Create a task. user_id is taken from the session — never from the client payload. */
export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw toApiError(userError ?? new Error('Not authenticated'))

  const normalized = normalizeCreateTask(input)

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: normalized.title,
      type: normalized.type,
      start_date: normalized.start_date,
      duration_days: normalized.duration_days,
      due_date: normalized.due_date,
      reminder_time: normalized.reminder_time,
    })
    .select()
    .single()

  if (error) throw toApiError(error, 'Failed to create task')
  return data as TaskRow
}

/** Rename a task */
export async function renameTask(id: string, title: string): Promise<TaskRow> {
  const trimmed = title.trim()
  if (!trimmed || trimmed.length > 120) {
    throw toApiError(new Error('Title must be 1–120 characters'))
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ title: trimmed })
    .eq('id', id)
    .select()
    .single()

  if (error) throw toApiError(error, 'Failed to rename task')
  return data as TaskRow
}

/** Extend a challenge by 10 days (max 365). Returns updated task. */
export async function extendChallenge(id: string, extraDays = 10): Promise<TaskRow> {
  const existing = await fetchTask(id)
  if (!existing) throw toApiError(new Error('Task not found'))
  if (existing.type !== 'challenge') {
    throw toApiError(new Error('Only challenges can be extended'))
  }

  let nextDuration: number
  try {
    nextDuration = extendChallengeDuration(existing.duration_days, extraDays)
  } catch (err) {
    throw toApiError(err)
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ duration_days: nextDuration })
    .eq('id', id)
    .select()
    .single()

  if (error) throw toApiError(error, 'Failed to extend challenge')
  return data as TaskRow
}

/** Delete a task (completions cascade via FK) */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw toApiError(error, 'Failed to delete task')
}
