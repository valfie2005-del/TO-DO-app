import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Flame, MoreHorizontal, Trophy, Plus } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useUiStore } from '@/store/uiStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { AddTaskModal } from '@/components/tasks/AddTaskModal'
import {
  getChallengeProgress,
  getCurrentStreak,
  getBestStreak,
  isChallengeFinished,
  buildChallengeDays,
} from '@/utils/streaks'
import { getLocalToday } from '@/utils/dates'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

export function ChallengesPage() {
  const { tasks, completionsByTask, loading, addTask, updateTitle, extend, remove, toggle } =
    useTasks()
  const openAddTask = useUiStore((s) => s.openAddTaskModal)
  const today = getLocalToday()

  const challenges = useMemo(
    () => tasks.filter((t) => t.type === 'challenge'),
    [tasks]
  )

  const active = challenges.filter(
    (t) => !isChallengeFinished(t.start_date, t.duration_days, today)
  )
  const finished = challenges.filter((t) =>
    isChallengeFinished(t.start_date, t.duration_days, today)
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#E8ECF8]">Challenges</h1>
        <Button size="sm" onClick={() => openAddTask({ type: 'challenge' })}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {challenges.length === 0 ? (
        <EmptyState
          title="No challenges yet"
          description="Start a 21, 40, or 66-day challenge to build a lasting habit."
          action={
            <Button onClick={() => openAddTask({ type: 'challenge' })}>
              <Plus className="h-4 w-4" />
              Create challenge
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-[#8B95B3]">Active</h2>
              {active.map((task) => (
                <ChallengeCard
                  key={task.id}
                  task={task}
                  completedDates={completionsByTask.get(task.id) ?? []}
                  today={today}
                  onToggle={(date) => void toggle(task.id, date)}
                  onRename={(title) => void updateTitle(task.id, title)}
                  onExtend={() => void extend(task.id)}
                  onDelete={() => void remove(task.id)}
                />
              ))}
            </section>
          )}

          {finished.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-[#8B95B3] flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Finished
              </h2>
              {finished.map((task) => (
                <ChallengeCard
                  key={task.id}
                  task={task}
                  completedDates={completionsByTask.get(task.id) ?? []}
                  today={today}
                  onToggle={(date) => void toggle(task.id, date)}
                  onRename={(title) => void updateTitle(task.id, title)}
                  onExtend={() => void extend(task.id)}
                  onDelete={() => void remove(task.id)}
                  finished
                />
              ))}
            </section>
          )}
        </>
      )}

      <AddTaskModal onCreate={addTask} />
    </div>
  )
}

function ChallengeCard({
  task,
  completedDates,
  today,
  onToggle,
  onRename,
  onExtend,
  onDelete,
  finished,
}: {
  task: Task
  completedDates: string[]
  today: string
  onToggle: (date: string) => void
  onRename: (title: string) => void
  onExtend: () => void
  onDelete: () => void
  finished?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newTitle, setNewTitle] = useState(task.title)

  const progress = getChallengeProgress(task.start_date, task.duration_days, completedDates)
  const current = getCurrentStreak(task.start_date, task.duration_days, completedDates, today)
  const best = getBestStreak(task.start_date, task.duration_days, completedDates)
  const days = buildChallengeDays(task.start_date, task.duration_days, completedDates, today)

  const endLabel = task.due_date
    ? format(parseISO(task.due_date), 'MMM d, yyyy')
    : ''

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate">{task.title}</CardTitle>
          <p className="text-xs text-[#8B95B3] mt-1">
            {format(parseISO(task.start_date), 'MMM d')} – {endLabel} · {task.duration_days} days
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-[#8B95B3] hover:text-[#E8ECF8] hover:bg-white/5"
            aria-label="Challenge actions"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-[rgba(76,201,255,0.12)] bg-[#0B1020] py-1 shadow-xl">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-[#E8ECF8] hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false)
                    setNewTitle(task.title)
                    setRenameOpen(true)
                  }}
                >
                  Rename
                </button>
                {!finished && task.duration_days <= 355 && (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-[#E8ECF8] hover:bg-white/5"
                    onClick={() => {
                      setMenuOpen(false)
                      onExtend()
                    }}
                  >
                    Extend +10 days
                  </button>
                )}
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false)
                    setDeleteOpen(true)
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <ProgressRing
            percentage={progress.percentage}
            size={88}
            strokeWidth={8}
            label={`${progress.completed}/${progress.total}`}
          />
          <div className="flex gap-6">
            <div>
              <div className="flex items-center gap-1.5">
                <Flame className={cn('h-4 w-4 text-orange-400', current > 0 && 'animate-pulse')} />
                <span className="text-lg font-bold tabular-nums text-[#E8ECF8]">{current}</span>
              </div>
              <p className="text-xs text-[#8B95B3]">Current</p>
            </div>
            <div>
              <span className="text-lg font-bold tabular-nums text-[#E8ECF8]">{best}</span>
              <p className="text-xs text-[#8B95B3]">Best</p>
            </div>
          </div>
        </div>

        {/* Day grid — responsive, no horizontal overflow */}
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(28px, 1fr))`,
          }}
        >
          {days.map((day) => (
            <button
              key={day.dateKey}
              type="button"
              disabled={!day.canToggle}
              onClick={() => day.canToggle && onToggle(day.dateKey)}
              title={`Day ${day.dayNumber}: ${day.dateKey}${day.isCompleted ? ' ✓' : ''}`}
              aria-label={`Day ${day.dayNumber}, ${day.dateKey}${day.isCompleted ? ', completed' : ''}`}
              className={cn(
                'aspect-square rounded-md text-[10px] font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CC9FF]',
                day.isCompleted &&
                  'bg-gradient-to-br from-[#2F6BFF] to-[#4CC9FF] text-white shadow-[0_0_8px_rgba(47,107,255,0.4)]',
                !day.isCompleted && day.isToday &&
                  'ring-2 ring-[#4CC9FF] ring-offset-1 ring-offset-[#0B1020] text-[#4CC9FF]',
                !day.isCompleted && day.isMissed && 'bg-white/5 text-[#8B95B3]/60',
                !day.isCompleted && day.isFuture && 'bg-white/[0.03] text-[#8B95B3]/40',
                !day.isCompleted && day.isPast && !day.isMissed && 'bg-white/5 text-[#8B95B3]',
                day.canToggle && 'cursor-pointer hover:opacity-90',
                !day.canToggle && 'cursor-default'
              )}
            >
              {day.dayNumber}
            </button>
          ))}
        </div>
      </CardContent>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename challenge">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newTitle.trim()) {
              onRename(newTitle.trim())
              setRenameOpen(false)
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={120}
          />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete challenge?">
        <p className="text-sm text-[#8B95B3] mb-4">
          This permanently deletes &ldquo;{task.title}&rdquo; and all its completion history.
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            className="flex-1"
            onClick={() => {
              onDelete()
              setDeleteOpen(false)
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
