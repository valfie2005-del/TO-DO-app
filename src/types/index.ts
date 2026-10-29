/** ISO calendar date string: yyyy-MM-dd */
export type DateKey = string

/** Local time string: HH:mm (24h) */
export type TimeKey = string

export type TaskType = 'challenge' | 'single'

export type CompletionKind = 'on_time' | 'late'

/**
 * Derived lifecycle status for a scheduled occurrence on a given day.
 * Computed from timestamps — not stored as the sole source of truth.
 */
export type TaskLifecycleStatus =
  | 'upcoming'
  | 'in_progress'
  | 'grace_period'
  | 'completed_on_time'
  | 'completed_late'
  | 'missed'
  | 'untimed' // legacy tasks without a time window

export interface Task {
  id: string
  user_id: string
  title: string
  type: TaskType
  start_date: DateKey
  duration_days: number
  due_date: DateKey | null
  /** @deprecated prefer start_time; kept for compatibility */
  reminder_time: TimeKey | null
  description: string | null
  start_time: TimeKey | null
  end_time: TimeKey | null
  grace_minutes: number
  created_at: string
}

export interface Completion {
  id: string
  task_id: string
  completed_on: DateKey
  created_at: string
  completed_at: string | null
  completion_kind: CompletionKind | null
}

export interface TaskWithCompletions extends Task {
  completions: Completion[]
}

export interface DailyProgress {
  total: number
  completed: number
  percentage: number
  onTime: number
  late: number
  missed: number
  remaining: number
}

export interface StreakResult {
  current: number
  best: number
}

export interface ChallengeDayInfo {
  dateKey: DateKey
  dayNumber: number
  isCompleted: boolean
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  isMissed: boolean
  canToggle: boolean
}

export interface TaskOccurrenceStatus {
  status: TaskLifecycleStatus
  startAt: Date | null
  endAt: Date | null
  graceEndsAt: Date | null
  completedAt: Date | null
  completionKind: CompletionKind | null
  /** ms remaining until next boundary (deadline or grace end); null if N/A */
  msRemaining: number | null
  label: string
}

export interface AppNotification {
  id: string
  type: 'grace' | 'missed' | 'deadline' | 'info'
  title: string
  body: string
  taskId?: string
  createdAt: string
  read: boolean
}
