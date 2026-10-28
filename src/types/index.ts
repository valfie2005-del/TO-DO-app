/** ISO calendar date string: yyyy-MM-dd */
export type DateKey = string

/** Local time string: HH:mm (24h) */
export type TimeKey = string

export type TaskType = 'challenge' | 'single'

export interface Task {
  id: string
  user_id: string
  title: string
  type: TaskType
  start_date: DateKey
  duration_days: number
  due_date: DateKey | null
  /** Optional local time HH:mm */
  reminder_time: TimeKey | null
  created_at: string
}

export interface Completion {
  id: string
  task_id: string
  completed_on: DateKey
  created_at: string
}

/** Task with its completion records (for client-side calculations) */
export interface TaskWithCompletions extends Task {
  completions: Completion[]
}

export interface DailyProgress {
  total: number
  completed: number
  percentage: number
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
