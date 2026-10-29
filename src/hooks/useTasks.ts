import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task, Completion, DateKey } from '@/types'
import {
  fetchTasks,
  createTask,
  renameTask,
  extendChallenge,
  deleteTask,
  type CreateTaskInput,
} from '@/api/tasks'
import {
  fetchCompletionsForTasks,
  toggleCompletion,
} from '@/api/completions'
import { toast } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'

export function useTasks() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedForUser = useRef<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setTasks([])
      setCompletions([])
      setLoading(false)
      loadedForUser.current = null
      return
    }
    setLoading(true)
    setError(null)
    try {
      const t = await fetchTasks()
      setTasks(t)
      const c = await fetchCompletionsForTasks(t.map((x) => x.id))
      setCompletions(c)
      loadedForUser.current = userId
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data'
      setError(msg)
      toast('error', msg)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // Avoid refetch loop: only load when user changes or not yet loaded
    if (userId !== loadedForUser.current || userId === null) {
      void load()
    }
  }, [userId, load])

  const completionsByTask = (() => {
    const map = new Map<string, DateKey[]>()
    for (const c of completions) {
      const list = map.get(c.task_id) ?? []
      list.push(c.completed_on)
      map.set(c.task_id, list)
    }
    return map
  })()

  const addTask = async (input: CreateTaskInput) => {
    try {
      const task = await createTask(input)
      setTasks((prev) => [task, ...prev])
      toast('success', 'Task created')
      return task
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create task'
      toast('error', msg)
      throw err
    }
  }

  const updateTitle = async (id: string, title: string) => {
    const updated = await renameTask(id, title)
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    toast('success', 'Renamed')
    return updated
  }

  const extend = async (id: string) => {
    const updated = await extendChallenge(id)
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    toast('success', 'Extended by 10 days')
    return updated
  }

  const remove = async (id: string) => {
    await deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setCompletions((prev) => prev.filter((c) => c.task_id !== id))
    toast('success', 'Deleted')
  }

  const toggle = async (taskId: string, dateKey: DateKey, timeZone?: string) => {
    const currentlyCompleted = completions.some(
      (c) => c.task_id === taskId && c.completed_on === dateKey
    )

    if (currentlyCompleted) {
      setCompletions((prev) =>
        prev.filter((c) => !(c.task_id === taskId && c.completed_on === dateKey))
      )
    } else {
      const optimistic: Completion = {
        id: `optimistic-${taskId}-${dateKey}`,
        task_id: taskId,
        completed_on: dateKey,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completion_kind: null,
      }
      setCompletions((prev) => [...prev, optimistic])
    }

    try {
      const result = await toggleCompletion(taskId, dateKey, currentlyCompleted, timeZone)
      if (result) {
        setCompletions((prev) =>
          prev.map((c) =>
            c.id.startsWith('optimistic-') &&
            c.task_id === taskId &&
            c.completed_on === dateKey
              ? result
              : c
          )
        )
      }
    } catch (err) {
      if (currentlyCompleted) {
        const restored: Completion = {
          id: `restored-${taskId}-${dateKey}`,
          task_id: taskId,
          completed_on: dateKey,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          completion_kind: null,
        }
        setCompletions((prev) => [...prev, restored])
      } else {
        setCompletions((prev) =>
          prev.filter(
            (c) =>
              !(
                c.task_id === taskId &&
                c.completed_on === dateKey &&
                c.id.startsWith('optimistic-')
              )
          )
        )
      }
      const msg = err instanceof Error ? err.message : 'Failed to update completion'
      toast('error', msg)
      throw err
    }
  }

  return {
    tasks,
    completions,
    completionsByTask,
    loading,
    error,
    reload: load,
    addTask,
    updateTitle,
    extend,
    remove,
    toggle,
  }
}
