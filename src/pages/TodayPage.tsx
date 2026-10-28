import { useMemo, useRef, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUiStore } from '@/store/uiStore'
import { useTasks } from '@/hooks/useTasks'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Checkbox } from '@/components/ui/Checkbox'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddTaskModal } from '@/components/tasks/AddTaskModal'
import {
  addCalendarDays,
  getLocalToday,
  isTaskScheduledForDate,
  getChallengeDayNumber,
} from '@/utils/dates'
import {
  getDailyProgress,
  getCurrentStreak,
  getBestStreak,
} from '@/utils/streaks'
import { cn } from '@/lib/utils'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function TodayPage() {
  const selectedDate = useUiStore((s) => s.selectedDate)
  const setSelectedDate = useUiStore((s) => s.setSelectedDate)
  const goToToday = useUiStore((s) => s.goToToday)
  const openAddTask = useUiStore((s) => s.openAddTaskModal)

  const { tasks, completions, completionsByTask, loading, addTask, toggle } = useTasks()
  const today = getLocalToday()
  const isToday = selectedDate === today

  // Confetti guard: only fire when transitioning from incomplete → complete
  const prevCompleteRef = useRef<boolean | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const scheduledTasks = useMemo(
    () =>
      tasks.filter((t) =>
        isTaskScheduledForDate(t.start_date, t.duration_days, selectedDate)
      ),
    [tasks, selectedDate]
  )

  const progress = useMemo(
    () => getDailyProgress(tasks, completionsByTask, selectedDate),
    [tasks, completionsByTask, selectedDate]
  )

  const challenges = scheduledTasks.filter((t) => t.type === 'challenge')
  const singles = scheduledTasks.filter((t) => t.type === 'single')

  // Aggregate streak across active challenges (best of current streaks for display)
  const streakSummary = useMemo(() => {
    let current = 0
    let best = 0
    for (const t of tasks.filter((x) => x.type === 'challenge')) {
      const dates = completionsByTask.get(t.id) ?? []
      current = Math.max(current, getCurrentStreak(t.start_date, t.duration_days, dates, today))
      best = Math.max(best, getBestStreak(t.start_date, t.duration_days, dates))
    }
    return { current, best }
  }, [tasks, completionsByTask, today])

  // Confetti on successful full completion
  useEffect(() => {
    if (loading || progress.total === 0) {
      prevCompleteRef.current = null
      return
    }
    const isComplete = progress.completed === progress.total
    if (
      prevCompleteRef.current === false &&
      isComplete
    ) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 2500)
      return () => clearTimeout(t)
    }
    prevCompleteRef.current = isComplete
  }, [progress.completed, progress.total, loading])

  const canGoNext = selectedDate < addCalendarDays(today, 1)

  const formatted = format(parseISO(selectedDate), 'EEEE, MMM d')

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#8B95B3]">{greeting()}</p>
          <h1 className="text-xl font-semibold text-[#E8ECF8] mt-0.5">{formatted}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedDate(addCalendarDays(selectedDate, -1))}
            className="rounded-lg p-2 text-[#8B95B3] hover:text-[#E8ECF8] hover:bg-white/5"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => goToToday()}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#4CC9FF] hover:bg-[#4CC9FF]/10"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => canGoNext && setSelectedDate(addCalendarDays(selectedDate, 1))}
            disabled={!canGoNext}
            className="rounded-lg p-2 text-[#8B95B3] hover:text-[#E8ECF8] hover:bg-white/5 disabled:opacity-30"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-40 mx-auto rounded-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {/* Progress + Streaks */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing
              percentage={progress.percentage}
              label={
                progress.total === 0
                  ? 'No tasks'
                  : `${progress.completed} of ${progress.total}`
              }
            />
            <div className="flex gap-4 w-full sm:w-auto">
              <Card className="flex-1 sm:flex-none sm:min-w-[120px]">
                <CardContent className="pt-4 flex items-center gap-3">
                  <Flame
                    className={cn(
                      'h-6 w-6 text-orange-400',
                      streakSummary.current > 0 && 'animate-pulse'
                    )}
                  />
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-[#E8ECF8]">
                      {streakSummary.current}
                    </p>
                    <p className="text-xs text-[#8B95B3]">Current streak</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="flex-1 sm:flex-none sm:min-w-[120px]">
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold tabular-nums text-[#E8ECF8]">
                    {streakSummary.best}
                  </p>
                  <p className="text-xs text-[#8B95B3]">Best streak</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Task lists */}
          {scheduledTasks.length === 0 ? (
            <EmptyState
              title="Nothing scheduled"
              description="Add a challenge or a one-day task to get started."
              action={
                <Button onClick={() => openAddTask()}>
                  <Plus className="h-4 w-4" />
                  Add task
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              {challenges.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-[#8B95B3] mb-2">Challenges</h2>
                  <ul className="space-y-2">
                    {challenges.map((task) => {
                      const dayNum = getChallengeDayNumber(
                        task.start_date,
                        task.duration_days,
                        selectedDate
                      )
                      const done = (completionsByTask.get(task.id) ?? []).includes(selectedDate)
                      return (
                        <TaskRow
                          key={task.id}
                          title={task.title}
                          subtitle={dayNum ? `Day ${dayNum} of ${task.duration_days}` : undefined}
                          checked={done}
                          onToggle={() => void toggle(task.id, selectedDate)}
                        />
                      )
                    })}
                  </ul>
                </section>
              )}
              {singles.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-[#8B95B3] mb-2">One-day tasks</h2>
                  <ul className="space-y-2">
                    {singles.map((task) => {
                      const done = (completionsByTask.get(task.id) ?? []).includes(selectedDate)
                      return (
                        <TaskRow
                          key={task.id}
                          title={task.title}
                          checked={done}
                          onToggle={() => void toggle(task.id, selectedDate)}
                        />
                      )
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => openAddTask()}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#2F6BFF] to-[#4CC9FF] text-white shadow-[0_0_24px_rgba(47,107,255,0.45)] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CC9FF]"
        aria-label="Add task"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddTaskModal onCreate={addTask} />

      {/* Simple confetti */}
      <AnimatePresence>
        {showConfetti && <ConfettiBurst />}
      </AnimatePresence>
    </div>
  )
}

function TaskRow({
  title,
  subtitle,
  checked,
  onToggle,
}: {
  title: string
  subtitle?: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <Card className="hover:border-[rgba(76,201,255,0.22)] transition-colors">
        <CardContent className="py-3.5 flex items-center gap-3">
          <Checkbox checked={checked} onChange={onToggle} label={`Mark ${title} complete`} />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm font-medium truncate',
                checked ? 'text-[#8B95B3] line-through' : 'text-[#E8ECF8]'
              )}
            >
              {title}
            </p>
            {subtitle && <p className="text-xs text-[#8B95B3] mt-0.5">{subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    </li>
  )
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 24 }, (_, i) => i)
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((i) => {
        const left = 10 + (i * 37) % 80
        const delay = (i % 8) * 0.04
        const color = i % 2 === 0 ? '#2F6BFF' : '#4CC9FF'
        return (
          <motion.span
            key={i}
            className="absolute top-1/3 h-2 w-2 rounded-sm"
            style={{ left: `${left}%`, background: color }}
            initial={{ y: 0, opacity: 1, rotate: 0 }}
            animate={{ y: 280, opacity: 0, rotate: 200 }}
            transition={{ duration: 1.4, delay, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}
