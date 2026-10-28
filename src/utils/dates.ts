/**
 * Date utilities for 40 Days.
 *
 * Contract:
 * - All scheduled dates are ISO calendar-date strings: yyyy-MM-dd
 * - Never use millisecond arithmetic for day counts
 * - Use date-fns calendar-aware functions
 * - Timezone is an IANA string (e.g. "Asia/Kolkata")
 */

import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

import type { DateKey } from '@/types'

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Validate and return a DateKey, or throw */
export function assertDateKey(value: string): DateKey {
  if (!DATE_KEY_REGEX.test(value)) {
    throw new Error(`Invalid DateKey: "${value}". Expected yyyy-MM-dd`)
  }
  const d = parseISO(value)
  if (!isValid(d)) {
    throw new Error(`Invalid calendar date: "${value}"`)
  }
  // Ensure canonical form (rejects 2024-02-30 etc. that parseISO may coerce)
  if (format(d, 'yyyy-MM-dd') !== value) {
    throw new Error(`Invalid calendar date: "${value}"`)
  }
  return value
}

/** Format a Date (or parseable string) as yyyy-MM-dd */
export function formatDateKey(date: Date | string): DateKey {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) throw new Error('Cannot format invalid date')
  return format(d, 'yyyy-MM-dd')
}

/**
 * Get the user's local "today" as a DateKey in the given IANA timezone.
 * Falls back to system timezone if none provided.
 */
export function getLocalToday(timeZone?: string): DateKey {
  const now = new Date()
  if (timeZone) {
    const zoned = toZonedTime(now, timeZone)
    return format(zoned, 'yyyy-MM-dd')
  }
  return format(now, 'yyyy-MM-dd')
}

/** Add (or subtract) calendar days from a DateKey */
export function addCalendarDays(dateKey: DateKey, amount: number): DateKey {
  const d = parseISO(assertDateKey(dateKey))
  return format(addDays(d, amount), 'yyyy-MM-dd')
}

/**
 * Last scheduled day of a challenge.
 * start_date + duration_days - 1
 */
export function getChallengeEndDate(
  startDate: DateKey,
  durationDays: number
): DateKey {
  if (durationDays < 1 || durationDays > 365) {
    throw new Error(`durationDays must be 1–365, got ${durationDays}`)
  }
  return addCalendarDays(assertDateKey(startDate), durationDays - 1)
}

/**
 * Day number within a challenge (1-based).
 * Returns null if the date is outside the scheduled range.
 */
export function getChallengeDayNumber(
  startDate: DateKey,
  durationDays: number,
  dateKey: DateKey
): number | null {
  const start = assertDateKey(startDate)
  const target = assertDateKey(dateKey)
  const diff = differenceInCalendarDays(parseISO(target), parseISO(start))
  if (diff < 0 || diff >= durationDays) return null
  return diff + 1
}

/**
 * Is the given date within the task's scheduled range?
 * Range is [start_date, start_date + duration_days - 1] inclusive.
 */
export function isTaskScheduledForDate(
  startDate: DateKey,
  durationDays: number,
  dateKey: DateKey
): boolean {
  return getChallengeDayNumber(startDate, durationDays, dateKey) !== null
}

/**
 * Can the user mark a completion on this date?
 * Rules:
 * - Date must be within the scheduled range
 * - Date must not be more than 1 calendar day after local today
 */
export function canCompleteOnDate(
  startDate: DateKey,
  durationDays: number,
  dateKey: DateKey,
  today: DateKey
): boolean {
  if (!isTaskScheduledForDate(startDate, durationDays, dateKey)) return false
  const maxAllowed = addCalendarDays(assertDateKey(today), 1)
  return dateKey <= maxAllowed
}

/**
 * Difference in calendar days between two DateKeys (b - a).
 */
export function calendarDaysBetween(a: DateKey, b: DateKey): number {
  return differenceInCalendarDays(
    parseISO(assertDateKey(b)),
    parseISO(assertDateKey(a))
  )
}

/**
 * Parse a DateKey into a Date at local midnight (for display only).
 * Prefer keeping DateKeys as strings for logic.
 */
export function parseDateKey(dateKey: DateKey): Date {
  return startOfDay(parseISO(assertDateKey(dateKey)))
}

/**
 * Convert a DateKey + timezone into a UTC Date (useful for API boundaries).
 */
export function dateKeyToUtc(dateKey: DateKey, timeZone: string): Date {
  return fromZonedTime(parseISO(assertDateKey(dateKey)), timeZone)
}
