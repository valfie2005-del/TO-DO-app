/**
 * Streak and progress calculations for 40 Days.
 * Pure functions — no side effects, no DOM, no network.
 */

import type { DateKey, DailyProgress, StreakResult, Task } from '@/types'
import {
  addCalendarDays,
  assertDateKey,
  canCompleteOnDate,
  getChallengeDayNumber,
  getChallengeEndDate,
  isTaskScheduledForDate,
} from './dates'

/**
 * Build the set of completed DateKeys for a task.
 * Deduplicates automatically.
 */
export function getCompletedSet(completedDates: DateKey[]): Set<DateKey> {
  return new Set(completedDates.map(assertDateKey))
}

/**
 * Current streak for a challenge.
 *
 * Counts consecutive completed scheduled days backward from:
 * - today, if today is completed
 * - yesterday, if today is not completed
 *
 * Returns 0 if the starting day is not completed or outside the challenge.
 * Never counts days before start or after end.
 */
export function getCurrentStreak(
  startDate: DateKey,
  durationDays: number,
  completedDates: DateKey[],
  today: DateKey
): number {
  const completed = getCompletedSet(completedDates)
  const endDate = getChallengeEndDate(startDate, durationDays)

  // Determine the day to start counting backward from
  let cursor: DateKey
  if (completed.has(today) && isTaskScheduledForDate(startDate, durationDays, today)) {
    cursor = today
  } else {
    cursor = addCalendarDays(today, -1)
  }

  // If cursor is outside the challenge range, no streak
  if (
    cursor < startDate ||
    cursor > endDate ||
    !isTaskScheduledForDate(startDate, durationDays, cursor)
  ) {
    return 0
  }

  let streak = 0
  while (
    cursor >= startDate &&
    isTaskScheduledForDate(startDate, durationDays, cursor) &&
    completed.has(cursor)
  ) {
    streak += 1
    cursor = addCalendarDays(cursor, -1)
  }

  return streak
}

/**
 * Best (longest) uninterrupted streak across the entire challenge history.
 * Missing days break the sequence. Duplicates do not inflate the result.
 */
export function getBestStreak(
  startDate: DateKey,
  durationDays: number,
  completedDates: DateKey[]
): number {
  const completed = getCompletedSet(completedDates)
  if (completed.size === 0) return 0

  let best = 0
  let current = 0

  for (let i = 0; i < durationDays; i++) {
    const day = addCalendarDays(startDate, i)
    if (completed.has(day)) {
      current += 1
      if (current > best) best = current
    } else {
      current = 0
    }
  }

  return best
}

/**
 * Combined current + best streak.
 */
export function getStreaks(
  startDate: DateKey,
  durationDays: number,
  completedDates: DateKey[],
  today: DateKey
): StreakResult {
  return {
    current: getCurrentStreak(startDate, durationDays, completedDates, today),
    best: getBestStreak(startDate, durationDays, completedDates),
  }
}

/**
 * Progress for a single challenge: completed scheduled days / duration.
 * Never exceeds 100%. Only dates inside the range count.
 */
export function getChallengeProgress(
  startDate: DateKey,
  durationDays: number,
  completedDates: DateKey[]
): DailyProgress {
  const completed = getCompletedSet(completedDates)
  let count = 0
  for (let i = 0; i < durationDays; i++) {
    const day = addCalendarDays(startDate, i)
    if (completed.has(day)) count += 1
  }
  const percentage = durationDays === 0 ? 0 : Math.min(100, (count / durationDays) * 100)
  return {
    total: durationDays,
    completed: count,
    percentage: Math.round(percentage * 10) / 10, // one decimal
  }
}

/**
 * Daily progress across all tasks scheduled for a given date.
 */
export function getDailyProgress(
  tasks: Pick<Task, 'id' | 'start_date' | 'duration_days'>[],
  completionsByTask: Map<string, DateKey[]>,
  dateKey: DateKey
): DailyProgress {
  const scheduled = tasks.filter((t) =>
    isTaskScheduledForDate(t.start_date, t.duration_days, dateKey)
  )
  if (scheduled.length === 0) {
    return { total: 0, completed: 0, percentage: 0 }
  }

  let completedCount = 0
  for (const task of scheduled) {
    const dates = completionsByTask.get(task.id) ?? []
    if (dates.includes(dateKey)) completedCount += 1
  }

  const percentage = (completedCount / scheduled.length) * 100
  return {
    total: scheduled.length,
    completed: completedCount,
    percentage: Math.round(percentage * 10) / 10,
  }
}

/**
 * Whether a challenge is finished (local today is after its last scheduled day).
 */
export function isChallengeFinished(
  startDate: DateKey,
  durationDays: number,
  today: DateKey
): boolean {
  const end = getChallengeEndDate(startDate, durationDays)
  return today > end
}

/**
 * Extend a challenge by 10 days, respecting the 365-day maximum.
 * Returns the new duration, or throws if extension is not possible.
 */
export function extendChallengeDuration(
  currentDuration: number,
  extraDays = 10
): number {
  if (extraDays < 1) throw new Error('extraDays must be positive')
  const next = currentDuration + extraDays
  if (next > 365) {
    throw new Error(
      `Cannot extend: duration would be ${next}, maximum is 365`
    )
  }
  return next
}

/**
 * Build the full list of challenge day tiles (exactly durationDays entries).
 */
export function buildChallengeDays(
  startDate: DateKey,
  durationDays: number,
  completedDates: DateKey[],
  today: DateKey
): Array<{
  dateKey: DateKey
  dayNumber: number
  isCompleted: boolean
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  isMissed: boolean
  canToggle: boolean
}> {
  const completed = getCompletedSet(completedDates)
  const days = []

  for (let i = 0; i < durationDays; i++) {
    const dateKey = addCalendarDays(startDate, i)
    const dayNumber = i + 1
    const isCompleted = completed.has(dateKey)
    const isToday = dateKey === today
    const isPast = dateKey < today
    const isFuture = dateKey > today
    const isMissed = isPast && !isCompleted
    const canToggle = canCompleteOnDate(startDate, durationDays, dateKey, today)

    days.push({
      dateKey,
      dayNumber,
      isCompleted,
      isToday,
      isPast,
      isFuture,
      isMissed,
      canToggle,
    })
  }

  return days
}

/**
 * Re-export for convenience so consumers can import from one place.
 */
export { getChallengeDayNumber, isTaskScheduledForDate, canCompleteOnDate }
