import { useMemo, useState } from 'react'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useUiStore } from '@/store/uiStore'
import { Card, CardContent } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { AddTaskModal } from '@/components/tasks/AddTaskModal'
import { formatDateKey, getLocalToday, isTaskScheduledForDate, getChallengeDayNumber } from '@/utils/dates'
import { getDailyProgress } from '@/utils/streaks'
import { cn } from '@/lib/utils'
import { formatTimeDisplay } from '@/utils/validation'

/** Monday-first weekday index: Mon=0 … Sun=6 */
function mondayIndex(date: Date): number {
  const d = getDay(date) // Sun=0
  return d === 0 ? 6 : d - 1
}

export function CalendarPage() {
  const selectedDate = useUiStore((s) => s.selectedDate)
  const setSelectedDate = useUiStore((s) => s.setSelectedDate)
  const openAddTask = useUiStore((s) => s.openAddTaskModal)
  const { tasks, completionsByTask, loading, addTask, toggle } = useTasks()
  const today = getLocalToday()

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseISO(selectedDate)))

  const days = useMemo(() => {
    const start = startOfMonth(viewMonth)
    const end = endOfMonth(viewMonth)
    const all = eachDayOfInterval({ start, end })
    const pad = mondayIndex(start)
    return { pad, all }
  }, [viewMonth])

  const heat = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; pct: number }>()
    for (const d of days.all) {
      const key = formatDateKey(d)
      const p = getDailyProgress(tasks, completionsByTask, key)
      map.set(key, { total: p.total, completed: p.completed, pct: p.percentage })
    }
    return map
  }, [days.all, tasks, completionsByTask])

  const selectedProgress = useMemo(
    () => getDailyProgress(tasks, completionsByTask, selectedDate),
    [tasks, completionsByTask, selectedDate]
  )

  const selectedTasks = useMemo(
    () =>
      tasks.filter((t) =>
        isTaskScheduledForDate(t.start_date, t.duration_days, selectedDate)
      ),
    [tasks, selectedDate]
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#E8ECF8]">Calendar</h1>
        <Button size="sm" onClick={() => openAddTask({ startDate: selectedDate })}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="rounded-lg p-2 text-[#8B95B3] hover:text-[#E8ECF8] hover:bg-white/5"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-[#E8ECF8]">
                {format(viewMonth, 'MMMM yyyy')}
              </span>
              {!isSameMonth(viewMonth, parseISO(today)) && (
                <button
                  type="button"
                  onClick={() => setViewMonth(startOfMonth(parseISO(today)))}
                  className="text-xs text-[#4CC9FF] hover:underline"
                >
                  This month
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="rounded-lg p-2 text-[#8B95B3] hover:text-[#E8ECF8] hover:bg-white/5"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday headers — Monday first */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-[#8B95B3] py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: days.pad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.all.map((d) => {
              const key = formatDateKey(d)
              const h = heat.get(key)
              const isSelected = key === selectedDate
              const isToday = key === today
              const hasTasks = (h?.total ?? 0) > 0
              const pct = h?.pct ?? 0

              let bg = 'bg-transparent'
              if (hasTasks) {
                if (pct === 100) bg = 'bg-gradient-to-br from-[#2F6BFF]/40 to-[#4CC9FF]/40'
                else if (pct > 0) bg = 'bg-[#2F6BFF]/20'
                else bg = 'bg-white/5'
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    'aspect-square rounded-lg text-sm font-medium transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CC9FF]',
                    bg,
                    isSelected && 'ring-2 ring-[#4CC9FF] ring-offset-1 ring-offset-[#0B1020]',
                    isToday && !isSelected && 'text-[#4CC9FF]',
                    !isToday && 'text-[#E8ECF8]',
                    pct === 100 && hasTasks && 'shadow-[0_0_8px_rgba(47,107,255,0.3)]'
                  )}
                  aria-label={`${format(d, 'MMMM d')}${hasTasks ? `, ${h?.completed} of ${h?.total} complete` : ''}`}
                  aria-current={isSelected ? 'date' : undefined}
                >
                  {format(d, 'd')}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day panel */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#E8ECF8]">
                {format(parseISO(selectedDate), 'EEEE, MMM d')}
              </h2>
              <p className="text-xs text-[#8B95B3] mt-0.5">
                {selectedProgress.total === 0
                  ? 'No tasks scheduled'
                  : `${selectedProgress.completed} of ${selectedProgress.total} completed`}
              </p>
            </div>
            {selectedProgress.total > 0 && (
              <ProgressRing
                percentage={selectedProgress.percentage}
                size={56}
                strokeWidth={6}
                showLabel
              />
            )}
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-sm text-[#8B95B3] py-2">
              Nothing scheduled.{' '}
              <button
                type="button"
                className="text-[#4CC9FF] hover:underline"
                onClick={() => openAddTask({ startDate: selectedDate, type: 'single' })}
              >
                Add a task
              </button>
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedTasks.map((task) => {
                const done = (completionsByTask.get(task.id) ?? []).includes(selectedDate)
                const dayNum =
                  task.type === 'challenge'
                    ? getChallengeDayNumber(task.start_date, task.duration_days, selectedDate)
                    : null
                return (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border border-[rgba(76,201,255,0.08)] bg-[#05070D]/50 px-3 py-2.5"
                  >
                    <Checkbox
                      checked={done}
                      onChange={() => void toggle(task.id, selectedDate)}
                      label={`Mark ${task.title} complete`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          done ? 'text-[#8B95B3] line-through' : 'text-[#E8ECF8]'
                        )}
                      >
                        {task.title}
                      </p>
                      {(dayNum || task.reminder_time) && (
                        <p className="text-xs text-[#8B95B3]">
                          {[
                            dayNum ? `Day ${dayNum} of ${task.duration_days}` : null,
                            formatTimeDisplay(task.reminder_time),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddTaskModal onCreate={addTask} />
    </div>
  )
}
