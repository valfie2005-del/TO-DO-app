import { supabase } from '@/lib/supabase'
import type { Completion, CompletionKind, DateKey, Task } from '@/types'
import { canCompleteOnDate, getLocalToday } from '@/utils/dates'
import { resolveTaskStatus } from '@/utils/taskStatus'
import { toApiError, isUniqueViolation } from './errors'
import { fetchTask } from './tasks'

export type CompletionRow = Completion

function normalizeCompletion(row: Record<string, unknown>): CompletionRow {
  return {
    id: row.id as string,
    task_id: row.task_id as string,
    completed_on: row.completed_on as string,
    created_at: row.created_at as string,
    completed_at: (row.completed_at as string) ?? (row.created_at as string) ?? null,
    completion_kind: (row.completion_kind as CompletionKind) ?? null,
  }
}

export async function fetchCompletionsForTasks(taskIds: string[]): Promise<CompletionRow[]> {
  if (taskIds.length === 0) return []
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .in('task_id', taskIds)
    .order('completed_on', { ascending: true })
  if (error) throw toApiError(error, 'Failed to load completions')
  return (data ?? []).map((r) => normalizeCompletion(r as Record<string, unknown>))
}

export async function completeTask(
  taskId: string,
  completedOn: DateKey,
  timeZone?: string
): Promise<CompletionRow> {
  const task = await fetchTask(taskId)
  if (!task) throw toApiError(new Error('Task not found'))

  const today = getLocalToday(timeZone)
  if (!canCompleteOnDate(task.start_date, task.duration_days, completedOn, today)) {
    throw toApiError(new Error('This date is outside the allowed completion window'))
  }

  const now = new Date()
  const status = resolveTaskStatus(task, completedOn, null, now, timeZone)
  if (status.status === 'missed') {
    throw toApiError(new Error('Grace period has ended — this task is missed'))
  }

  let kind: CompletionKind = 'on_time'
  if (status.status === 'grace_period') kind = 'late'
  else if (status.endAt && now.getTime() > status.endAt.getTime()) kind = 'late'

  const { data, error } = await supabase
    .from('completions')
    .insert({
      task_id: taskId,
      completed_on: completedOn,
      completed_at: now.toISOString(),
      completion_kind: kind,
    })
    .select()
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw toApiError(new Error('Already completed on this date'), '23505')
    }
    throw toApiError(error, 'Failed to complete task')
  }
  return normalizeCompletion(data as Record<string, unknown>)
}

export async function uncompleteTask(taskId: string, completedOn: DateKey): Promise<void> {
  const { error } = await supabase
    .from('completions')
    .delete()
    .eq('task_id', taskId)
    .eq('completed_on', completedOn)
  if (error) throw toApiError(error, 'Failed to remove completion')
}

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

/** Helper for callers that need task context */
export type { Task }
