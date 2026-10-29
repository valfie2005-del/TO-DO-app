/**
 * Time-window status, grace period, and chronological sorting.
 * Pure functions — controllable clock via `now` argument.
 */

import { addMinutes, isValid, parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import type {
  Completion,
  CompletionKind,
  DateKey,
  Task,
  TaskLifecycleStatus,
  TaskOccurrenceStatus,
  TimeKey,
} from '@/types'
import { assertDateKey, formatDateKey, getLocalToday } from './dates'

export const DEFAULT_GRACE_MINUTES = 30
/** When only start_time exists, default duration before deadline */
export const DEFAULT_DURATION_MINUTES = 60

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)/

export function parseTimeKey(value: string | null | undefined): { h: number; m: number } | null {
  if (!value) return null
  const match = value.trim().match(TIME_RE)
  if (!match) return null
  return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) }
}

export function normalizeTimeKey(value?: string | null): TimeKey | null {
  const p = parseTimeKey(value ?? null)
  if (!p) return null
  return `${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}`
}

/** Minutes since midnight for sorting (null times sort last as 24*60+1) */
export function timeToMinutes(time: string | null | undefined): number {
  const p = parseTimeKey(time)
  if (!p) return 24 * 60 + 1
  return p.h * 60 + p.m
}

/**
 * Effective start/end times for a task.
 * - start: start_time ?? reminder_time
 * - end: end_time ?? (start + 60m) if start exists, else null
 * Overnight: end minutes < start minutes → end is next calendar day
 */
export function getEffectiveTimes(task: Pick<Task, 'start_time' | 'end_time' | 'reminder_time' | 'grace_minutes'>): {
  start: TimeKey | null
  end: TimeKey | null
  overnight: boolean
  graceMinutes: number
} {
  const start = normalizeTimeKey(task.start_time ?? task.reminder_time)
  let end = normalizeTimeKey(task.end_time)
  let overnight = false
  if (start && !end) {
    const p = parseTimeKey(start)!
    const total = p.h * 60 + p.m + DEFAULT_DURATION_MINUTES
    const eh = Math.floor(total / 60) % 24
    const em = total % 60
    end = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
    overnight = total >= 24 * 60
  } else if (start && end) {
    overnight = timeToMinutes(end) <= timeToMinutes(start)
  }
  return {
    start,
    end,
    overnight,
    graceMinutes: task.grace_minutes ?? DEFAULT_GRACE_MINUTES,
  }
}

/**
 * Build Date objects for start/end/grace end on a given calendar date in timezone.
 * Uses local wall-clock interpretation via date-fns-tz.
 */
export function buildWindowTimestamps(
  dateKey: DateKey,
  start: TimeKey | null,
  end: TimeKey | null,
  overnight: boolean,
  graceMinutes: number,
  timeZone?: string
): { startAt: Date | null; endAt: Date | null; graceEndsAt: Date | null } {
  assertDateKey(dateKey)
  if (!start || !end) {
    return { startAt: null, endAt: null, graceEndsAt: null }
  }
  const sp = parseTimeKey(start)!
  const ep = parseTimeKey(end)!

  const makeLocalDate = (dk: DateKey, h: number, m: number): Date => {
    const iso = `${dk}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    if (timeZone) {
      return fromZonedTime(iso, timeZone)
    }
    return parseISO(iso)
  }

  const startAt = makeLocalDate(dateKey, sp.h, sp.m)
  let endDateKey = dateKey
  if (overnight) {
    // end is next calendar day
    const d = parseISO(dateKey)
    d.setDate(d.getDate() + 1)
    endDateKey = formatDateKey(d)
  }
  const endAt = makeLocalDate(endDateKey, ep.h, ep.m)
  const graceEndsAt = addMinutes(endAt, graceMinutes)
  return { startAt, endAt, graceEndsAt }
}

export function formatTimeRange(start: TimeKey | null, end: TimeKey | null, overnight?: boolean): string | null {
  if (!start && !end) return null
  const a = start ? formatTime12(start) : '?'
  const b = end ? formatTime12(end) : '?'
  const suffix = overnight ? ' (+1 day)' : ''
  return `${a} – ${b}${suffix}`
}

export function formatTime12(time: TimeKey): string {
  const p = parseTimeKey(time)
  if (!p) return time
  let h = p.h
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(p.m).padStart(2, '0')} ${ampm}`
}

/**
 * Resolve lifecycle status for one task on one calendar date.
 */
export function resolveTaskStatus(
  task: Task,
  dateKey: DateKey,
  completion: Completion | null | undefined,
  now: Date = new Date(),
  timeZone?: string
): TaskOccurrenceStatus {
  const { start, end, overnight, graceMinutes } = getEffectiveTimes(task)
  const { startAt, endAt, graceEndsAt } = buildWindowTimestamps(
    dateKey,
    start,
    end,
    overnight,
    graceMinutes,
    timeZone
  )

  if (completion) {
    const completedAt = completion.completed_at
      ? parseISO(completion.completed_at)
      : parseISO(completion.created_at)
    let kind: CompletionKind =
      completion.completion_kind ??
      (endAt && isValid(completedAt) && completedAt.getTime() > endAt.getTime()
        ? 'late'
        : 'on_time')
    // Untimed: treat as on_time
    if (!endAt) kind = completion.completion_kind ?? 'on_time'
    return {
      status: kind === 'late' ? 'completed_late' : 'completed_on_time',
      startAt,
      endAt,
      graceEndsAt,
      completedAt: isValid(completedAt) ? completedAt : null,
      completionKind: kind,
      msRemaining: null,
      label: kind === 'late' ? 'Completed late' : 'Completed on time',
    }
  }

  // No time window → legacy untimed
  if (!startAt || !endAt || !graceEndsAt) {
    return {
      status: 'untimed',
      startAt: null,
      endAt: null,
      graceEndsAt: null,
      completedAt: null,
      completionKind: null,
      msRemaining: null,
      label: 'No time set',
    }
  }

  const t = now.getTime()
  if (t < startAt.getTime()) {
    return {
      status: 'upcoming',
      startAt,
      endAt,
      graceEndsAt,
      completedAt: null,
      completionKind: null,
      msRemaining: startAt.getTime() - t,
      label: 'Upcoming',
    }
  }
  if (t < endAt.getTime()) {
    return {
      status: 'in_progress',
      startAt,
      endAt,
      graceEndsAt,
      completedAt: null,
      completionKind: null,
      msRemaining: endAt.getTime() - t,
      label: 'In progress',
    }
  }
  // At or after endAt
  if (t < graceEndsAt.getTime()) {
    return {
      status: 'grace_period',
      startAt,
      endAt,
      graceEndsAt,
      completedAt: null,
      completionKind: null,
      msRemaining: graceEndsAt.getTime() - t,
      label: 'Grace period',
    }
  }
  // Grace expired, still incomplete
  return {
    status: 'missed',
    startAt,
    endAt,
    graceEndsAt,
    completedAt: null,
    completionKind: null,
    msRemaining: null,
    label: 'Missed',
  }
}

/** Sort tasks chronologically by effective start time (nulls last) */
export function sortTasksChronologically<T extends Pick<Task, 'start_time' | 'end_time' | 'reminder_time' | 'title'>>(
  tasks: T[]
): T[] {
  return [...tasks].sort((a, b) => {
    const ma = timeToMinutes(a.start_time ?? a.reminder_time)
    const mb = timeToMinutes(b.start_time ?? b.reminder_time)
    if (ma !== mb) return ma - mb
    return a.title.localeCompare(b.title)
  })
}

/** Group by lifecycle section while keeping chrono order within groups */
const SECTION_ORDER: TaskLifecycleStatus[] = [
  'grace_period',
  'in_progress',
  'upcoming',
  'completed_late',
  'completed_on_time',
  'missed',
  'untimed',
]

export function groupTasksByStatus<T extends { status: TaskOccurrenceStatus }>(
  items: T[]
): { status: TaskLifecycleStatus; items: T[] }[] {
  const map = new Map<TaskLifecycleStatus, T[]>()
  for (const s of SECTION_ORDER) map.set(s, [])
  for (const item of items) {
    const list = map.get(item.status.status) ?? []
    list.push(item)
    map.set(item.status.status, list)
  }
  return SECTION_ORDER.filter((s) => (map.get(s)?.length ?? 0) > 0).map((s) => ({
    status: s,
    items: map.get(s)!,
  }))
}

export function formatCountdown(ms: number | null): string | null {
  if (ms === null || ms < 0) return null
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Can the user still complete this occurrence?
 * Allowed while upcoming, in_progress, grace_period, or untimed.
 * Not after missed (unless admin correction — not enabled by default).
 */
export function canCompleteStatus(status: TaskLifecycleStatus): boolean {
  return (
    status === 'upcoming' ||
    status === 'in_progress' ||
    status === 'grace_period' ||
    status === 'untimed' ||
    status === 'completed_on_time' ||
    status === 'completed_late'
  )
}

export function isSuccessfulStatus(status: TaskLifecycleStatus): boolean {
  return status === 'completed_on_time' || status === 'completed_late'
}

/** Daily progress with on-time / late / missed breakdown */
export function getTimedDailyProgress(
  statuses: TaskOccurrenceStatus[]
): {
  total: number
  completed: number
  percentage: number
  onTime: number
  late: number
  missed: number
  remaining: number
} {
  const total = statuses.length
  if (total === 0) {
    return { total: 0, completed: 0, percentage: 0, onTime: 0, late: 0, missed: 0, remaining: 0 }
  }
  let onTime = 0
  let late = 0
  let missed = 0
  for (const s of statuses) {
    if (s.status === 'completed_on_time') onTime++
    else if (s.status === 'completed_late') late++
    else if (s.status === 'missed') missed++
  }
  const completed = onTime + late
  return {
    total,
    completed,
    percentage: Math.round((completed / total) * 1000) / 10,
    onTime,
    late,
    missed,
    remaining: total - completed - missed,
  }
}

export { getLocalToday }
