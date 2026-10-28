import { describe, it, expect } from 'vitest'
import {
  assertDateKey,
  formatDateKey,
  getLocalToday,
  addCalendarDays,
  getChallengeEndDate,
  getChallengeDayNumber,
  isTaskScheduledForDate,
  canCompleteOnDate,
  calendarDaysBetween,
} from '../../src/utils/dates'

describe('assertDateKey', () => {
  it('accepts valid dates', () => {
    expect(assertDateKey('2026-01-01')).toBe('2026-01-01')
    expect(assertDateKey('2024-02-29')).toBe('2024-02-29') // leap year
  })

  it('rejects invalid formats', () => {
    expect(() => assertDateKey('2026/01/01')).toThrow()
    expect(() => assertDateKey('01-01-2026')).toThrow()
    expect(() => assertDateKey('2026-1-1')).toThrow()
  })

  it('rejects non-existent calendar dates', () => {
    expect(() => assertDateKey('2025-02-29')).toThrow() // not a leap year
    expect(() => assertDateKey('2026-04-31')).toThrow()
  })
})

describe('getChallengeEndDate', () => {
  it('40-day challenge starting 2026-01-01 ends on 2026-02-09', () => {
    expect(getChallengeEndDate('2026-01-01', 40)).toBe('2026-02-09')
  })

  it('1-day challenge ends on the same day', () => {
    expect(getChallengeEndDate('2026-03-15', 1)).toBe('2026-03-15')
  })

  it('handles month and year boundaries', () => {
    expect(getChallengeEndDate('2025-12-20', 20)).toBe('2026-01-08')
  })

  it('rejects invalid duration', () => {
    expect(() => getChallengeEndDate('2026-01-01', 0)).toThrow()
    expect(() => getChallengeEndDate('2026-01-01', 366)).toThrow()
  })
})

describe('getChallengeDayNumber', () => {
  it('returns 1 for start date', () => {
    expect(getChallengeDayNumber('2026-01-01', 40, '2026-01-01')).toBe(1)
  })

  it('returns 40 for last day of 40-day challenge', () => {
    expect(getChallengeDayNumber('2026-01-01', 40, '2026-02-09')).toBe(40)
  })

  it('returns null outside range', () => {
    expect(getChallengeDayNumber('2026-01-01', 40, '2025-12-31')).toBeNull()
    expect(getChallengeDayNumber('2026-01-01', 40, '2026-02-10')).toBeNull()
  })
})

describe('isTaskScheduledForDate', () => {
  it('true for all days in range', () => {
    expect(isTaskScheduledForDate('2026-01-01', 3, '2026-01-01')).toBe(true)
    expect(isTaskScheduledForDate('2026-01-01', 3, '2026-01-02')).toBe(true)
    expect(isTaskScheduledForDate('2026-01-01', 3, '2026-01-03')).toBe(true)
  })

  it('false outside range', () => {
    expect(isTaskScheduledForDate('2026-01-01', 3, '2025-12-31')).toBe(false)
    expect(isTaskScheduledForDate('2026-01-01', 3, '2026-01-04')).toBe(false)
  })
})

describe('canCompleteOnDate', () => {
  const start = '2026-01-01'
  const duration = 40
  const today = '2026-01-15'

  it('allows completion on scheduled past and today', () => {
    expect(canCompleteOnDate(start, duration, '2026-01-10', today)).toBe(true)
    expect(canCompleteOnDate(start, duration, today, today)).toBe(true)
  })

  it('allows one day into the future', () => {
    expect(canCompleteOnDate(start, duration, '2026-01-16', today)).toBe(true)
  })

  it('rejects two days into the future', () => {
    expect(canCompleteOnDate(start, duration, '2026-01-17', today)).toBe(false)
  })

  it('rejects dates outside schedule', () => {
    expect(canCompleteOnDate(start, duration, '2025-12-31', today)).toBe(false)
  })
})

describe('addCalendarDays', () => {
  it('adds and subtracts correctly across months', () => {
    expect(addCalendarDays('2026-01-30', 5)).toBe('2026-02-04')
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('handles leap day', () => {
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addCalendarDays('2024-02-29', 1)).toBe('2024-03-01')
  })
})

describe('calendarDaysBetween', () => {
  it('computes correct difference', () => {
    expect(calendarDaysBetween('2026-01-01', '2026-01-01')).toBe(0)
    expect(calendarDaysBetween('2026-01-01', '2026-01-40')).toBe(39)
  })
})
