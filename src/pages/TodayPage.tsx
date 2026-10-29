import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, HeartCrack, Plus, Clock } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUiStore } from '@/store/uiStore'
import { useTasks } from '@/hooks/useTasks'
import { useNotificationStore } from '@/store/notificationStore'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Checkbox } from '@/components/ui/Checkbox'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddTaskModal } from '@/components/tasks/AddTaskModal'
import { addCalendarDays, getLocalToday, isTaskScheduledForDate, getChallengeDayNumber } from '@/utils/dates'
import { getCurrentStreak, getBestStreak } from '@/utils/streaks'
import {
  resolveTaskStatus,
  sortTasksChronologically,
  groupTasksByStatus,
  formatTimeRange,
  formatCountdown,
  getTimedDailyProgress,
  getEffectiveTimes,
  canCompleteStatus,
} from '@/utils/taskStatus'
import type { Task, Completion, TaskLifecycleStatus } from '@/types'
import { cn } from '@/lib/utils'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const SECTION_LABELS: Record<TaskLifecycleStatus, string> = {
  grace_period: 'Grace period',
  in_progress: 'In progress',
  upcoming: 'Upcoming',
  completed_late: 'Completed late',
  completed_on_time: 'Completed on time',
  missed: 'Missed',
  untimed: 'All day',
}

export function TodayPage() {
  const selectedDate = useUiStore((s) => s.selectedDate)
  const setSelectedDate = useUiStore((s) => s.setSelectedDate)
  const goToToday = useUiStore((s) => s.goToToday)
  const openAddTask = useUiStore((s) => s.openAddTaskModal)
  const { tasks, completions, completionsByTask, loading, addTask, toggle } = useTasks()
  const pushNotif = useNotificationStore((s) => s.push)
  const hasAcknowledgedMiss = useNotificationStore((s) => s.hasAcknowledgedMiss)
  const acknowledgeMiss = useNotificationStore((s) => s.acknowledgeMiss)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const today = getLocalToday()
  const isToday = selectedDate === today

  const scheduled = useMemo(() => {
    const list = tasks.filter((t) =>
      isTaskScheduledForDate(t.start_date, t.duration_days, selectedDate)
    )
    return sortTasksChronologically(list)
  }, [tasks, selectedDate])

  const withStatus = useMemo(() => {
    return scheduled.map((task) => {
      const dates = completionsByTask.get(task.id) ?? []
      const completionRow =
        completions.find((c) => c.task_id === task.id && c.completed_on === selectedDate) ?? null
      const status = resolveTaskStatus(task, selectedDate, completionRow, now)
      return { task, status, completionRow }
    })
  }, [scheduled, completions, completionsByTask, selectedDate, now])

  const sections = useMemo(() => groupTasksByStatus(withStatus), [withStatus])
  const progress = useMemo(
    () => getTimedDailyProgress(withStatus.map((w) => w.status)),
    [withStatus]
  )

  // Missed notifications (once per task+date)
  useEffect(() => {
    for (const { task, status } of withStatus) {
      if (status.status !== 'missed') continue
      const key = `${task.id}:${selectedDate}`
      if (hasAcknowledgedMiss(key)) continue
      const { end } = getEffectiveTimes(task)
      const deadlineLabel = end ?? 'deadline'
      pushNotif({
        type: 'missed',
        title: 'Challenge missed!',
        body: `You didn't complete "${task.title}" before the grace period ended (${deadlineLabel} + 30m). Your daily streak may be affected.`,
        taskId: task.id,
      })
      acknowledgeMiss(key)
    }
  }, [withStatus, selectedDate, hasAcknowledgedMiss, acknowledgeMiss, pushNotif])

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

  const dayBroken = progress.missed > 0 && isToday
  const canGoNext = selectedDate < addCalendarDays(today, 1)
  const formatted = format(parseISO(selectedDate), 'EEEE, MMM d')

  const prevCompleteRef = useRef<boolean | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  useEffect(() => {
    if (loading || progress.total === 0) {
      prevCompleteRef.current = null
      return
    }
    const isComplete = progress.completed === progress.total && progress.missed === 0
    if (prevCompleteRef.current === false && isComplete) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 2500)
      return () => clearTimeout(t)
    }
    prevCompleteRef.current = isComplete
  }, [progress.completed, progress.total, progress.missed, loading])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
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
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing
              percentage={progress.percentage}
              label={
                progress.total === 0
                  ? 'No tasks'
                  : `${progress.completed} of ${progress.total}`
              }
            />
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto flex-1">
              <StatCard
                icon={
                  dayBroken ? (
                    <HeartCrack className="h-5 w-5 text-red-400" aria-hidden />
                  ) : (
                    <Flame
                      className={cn('h-5 w-5 text-orange-400', streakSummary.current > 0 && 'animate-pulse')}
                    />
                  )
                }
                value={streakSummary.current}
                label={dayBroken ? 'Streak at risk' : 'Current streak'}
              />
              <StatCard value={streakSummary.best} label="Best streak" />
              <StatCard value={progress.onTime} label="On time" />
              <StatCard value={progress.late} label="Late" />
              <StatCard value={progress.missed} label="Missed" danger={progress.missed > 0} />
              <StatCard value={progress.remaining} label="Remaining" />
            </div>
          </div>

          {dayBroken && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="py-3 flex items-start gap-3">
                <HeartCrack className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">Daily streak broken</p>
                  <p className="text-xs text-[#8B95B3] mt-0.5">
                    A required task was missed after its grace period. Tomorrow is a fresh start —
                    complete every challenge within its window to rebuild.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {scheduled.length === 0 ? (
            <EmptyState
              title="Nothing scheduled"
              description="Add a challenge with a start and end time to track deadlines and grace periods."
              action={
                <Button onClick={() => openAddTask()}>
                  <Plus className="h-4 w-4" />
                  Add task
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <section key={section.status}>
                  <h2 className="text-sm font-medium text-[#8B95B3] mb-2">
                    {SECTION_LABELS[section.status]}
                  </h2>
                  <ul className="space-y-2">
                    {section.items.map(({ task, status }) => {
                      const dayNum =
                        task.type === 'challenge'
                          ? getChallengeDayNumber(task.start_date, task.duration_days, selectedDate)
                          : null
                      const times = getEffectiveTimes(task)
                      const range = formatTimeRange(times.start, times.end, times.overnight)
                      const done = status.status === 'completed_on_time' || status.status === 'completed_late'
                      const canToggle =
                        canCompleteStatus(status.status) &&
                        (status.status !== 'missed' || done)

                      return (
                        <TimedTaskCard
                          key={task.id}
                          title={task.title}
                          subtitle={[
                            dayNum ? `Day ${dayNum} of ${task.duration_days}` : null,
                            range,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          status={status.status}
                          statusLabel={status.label}
                          countdown={formatCountdown(status.msRemaining)}
                          checked={done}
                          disabled={!canToggle && !done}
                          onToggle={() => {
                            if (status.status === 'missed' && !done) return
                            void toggle(task.id, selectedDate)
                          }}
                        />
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => openAddTask()}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#2F6BFF] to-[#4CC9FF] text-white shadow-[0_0_24px_rgba(47,107,255,0.45)]"
        aria-label="Add task"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddTaskModal onCreate={addTask} />

      <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>
    </div>
  )
}

function StatCard({
  value,
  label,
  icon,
  danger,
}: {
  value: number
  label: string
  icon?: React.ReactNode
  danger?: boolean
}) {
  return (
    <Card className={cn(danger && 'border-red-500/25')}>
      <CardContent className="py-3 px-3">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className={cn('text-lg font-bold tabular-nums', danger ? 'text-red-300' : 'text-[#E8ECF8]')}>
            {value}
          </span>
        </div>
        <p className="text-[11px] text-[#8B95B3] mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}

function TimedTaskCard({
  title,
  subtitle,
  status,
  statusLabel,
  countdown,
  checked,
  disabled,
  onToggle,
}: {
  title: string
  subtitle?: string
  status: TaskLifecycleStatus
  statusLabel: string
  countdown: string | null
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  const styles: Record<TaskLifecycleStatus, string> = {
    upcoming: 'border-[rgba(76,201,255,0.12)]',
    in_progress: 'border-[#2F6BFF]/40 bg-[#2F6BFF]/5',
    grace_period: 'border-amber-500/40 bg-amber-500/5',
    completed_on_time: 'border-emerald-500/25 bg-emerald-500/5',
    completed_late: 'border-emerald-500/15 bg-emerald-500/[0.03]',
    missed: 'border-red-500/40 bg-red-500/5',
    untimed: 'border-[rgba(76,201,255,0.12)]',
  }
  const badge: Record<TaskLifecycleStatus, string> = {
    upcoming: 'text-[#8B95B3]',
    in_progress: 'text-[#4CC9FF]',
    grace_period: 'text-amber-300',
    completed_on_time: 'text-emerald-300',
    completed_late: 'text-emerald-400/80',
    missed: 'text-red-300',
    untimed: 'text-[#8B95B3]',
  }

  return (
    <li>
      <Card className={cn('transition-colors', styles[status])}>
        <CardContent className="py-3.5 flex items-center gap-3">
          <Checkbox
            checked={checked}
            onChange={onToggle}
            disabled={disabled}
            label={`Mark ${title} complete`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className={cn(
                  'text-sm font-medium truncate',
                  checked ? 'text-[#8B95B3] line-through' : 'text-[#E8ECF8]'
                )}
              >
                {title}
              </p>
              {status === 'missed' && (
                <HeartCrack className="h-4 w-4 text-red-400 shrink-0" aria-label="Missed" />
              )}
            </div>
            {subtitle && <p className="text-xs text-[#8B95B3] mt-0.5">{subtitle}</p>}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn('text-[11px] font-medium', badge[status])}>{statusLabel}</span>
              {countdown && (status === 'in_progress' || status === 'grace_period' || status === 'upcoming') && (
                <span className="text-[11px] text-[#8B95B3] inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  {countdown}
                </span>
              )}
              {status === 'completed_late' && (
                <span className="text-[11px] text-amber-300/90">Late</span>
              )}
            </div>
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
            transition={{ duration: 1.4, delay }}
          />
        )
      })}
    </div>
  )
}
