import { supabase } from '@/lib/supabase'
import type { Completion, DateKey } from '@/types'
import { canCompleteOnDate, getLocalToday } from '@/utils/dates'
import { toApiError, isUniqueViolation } from './errors'
import { fetchTask } from './tasks'

export type CompletionRow = Completion

/** Fetch completions for a set of task IDs */
export async function fetchCompletionsForTasks(
  taskIds: string[]
): Promise<CompletionRow[]> {
  if (taskIds.length === 0) return []

  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .in('task_id', taskIds)
    .order('completed_on', { ascending: true })

  if (error) throw toApiError(error, 'Failed to load completions')
  return (data ?? []) as CompletionRow[]
}

/** Fetch completions for a single task */
export async function fetchCompletionsForTask(taskId: string): Promise<CompletionRow[]> {
  return fetchCompletionsForTasks([taskId])
}

/**
 * Mark a task complete on a given date.
 * Enforces schedule + max +1 day rule client-side before calling the API.
 * RLS also enforces schedule membership and ownership.
 */
export async function completeTask(
  taskId: string,
  completedOn: DateKey,
  timeZone?: string
): Promise<CompletionRow> {
  const task = await fetchTask(taskId)
  if (!task) throw toApiError(new Error('Task not found'))

  const today = getLocalToday(timeZone)
  if (!canCompleteOnDate(task.start_date, task.duration_days, completedOn, today)) {
    throw toApiError(
      new Error('This date is outside the allowed completion window')
    )
  }

  const { data, error } = await supabase
    .from('completions')
    .insert({
      task_id: taskId,
      completed_on: completedOn,
    })
    .select()
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw toApiError(new Error('Already completed on this date'), '23505')
    }
    throw toApiError(error, 'Failed to complete task')
  }
  return data as CompletionRow
}

/** Remove a completion (uncomplete) */
export async function uncompleteTask(
  taskId: string,
  completedOn: DateKey
): Promise<void> {
  const { error } = await supabase
    .from('completions')
    .delete()
    .eq('task_id', taskId)
    .eq('completed_on', completedOn)

  if (error) throw toApiError(error, 'Failed to remove completion')
}

/**
 * Toggle completion for a task on a date.
 * Returns the new completion row if completed, or null if uncompleted.
 */
export async function toggleCompletion(
  taskId: string,
  completedOn: DateKey,
  currentlyCompleted: boolean,
  timeZone?: string
): Promise<CompletionRow | null> {
  if (currentlyCompleted) {
    await uncompleteTask(taskId, completedOn)
    return null
  }
  return completeTask(taskId, completedOn, timeZone)
}
