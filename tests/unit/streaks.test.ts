import { describe, it, expect } from 'vitest'
import {
  getCurrentStreak,
  getBestStreak,
  getStreaks,
  getChallengeProgress,
  getDailyProgress,
  isChallengeFinished,
  extendChallengeDuration,
  buildChallengeDays,
} from '../../src/utils/streaks'
import { canCompleteOnDate, getChallengeEndDate } from '../../src/utils/dates'

describe('getCurrentStreak', () => {
  const start = '2026-01-01'
  const duration = 40

  it('returns 3 for three consecutive completed days ending today', () => {
    const completed = ['2026-01-13', '2026-01-14', '2026-01-15']
    expect(getCurrentStreak(start, duration, completed, '2026-01-15')).toBe(3)
  })

  it('counts backward from yesterday when today is not completed', () => {
    const completed = ['2026-01-13', '2026-01-14']
    // today = 15 not completed → starts from 14
    expect(getCurrentStreak(start, duration, completed, '2026-01-15')).toBe(2)
  })

  it('returns 0 when the applicable starting day is not completed', () => {
    const completed = ['2026-01-10', '2026-01-11']
    // gap on 14, today 15 not done → starts from 14 which is missing
    expect(getCurrentStreak(start, duration, completed, '2026-01-15')).toBe(0)
  })

  it('a missed day breaks the streak', () => {
    const completed = ['2026-01-10', '2026-01-11', '2026-01-13', '2026-01-14', '2026-01-15']
    // 12 is missing → streak from 15 back stops at 13
    expect(getCurrentStreak(start, duration, completed, '2026-01-15')).toBe(3)
  })

  it('does not count days before challenge start', () => {
    const completed = ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']
    expect(getCurrentStreak(start, duration, completed, '2026-01-02')).toBe(2)
  })

  it('returns 0 for empty completions', () => {
    expect(getCurrentStreak(start, duration, [], '2026-01-15')).toBe(0)
  })
})

describe('getBestStreak', () => {
  const start = '2026-01-01'
  const duration = 10

  it('finds the longest uninterrupted sequence', () => {
    // days 1-3, gap, 5-8
    const completed = [
      '2026-01-01', '2026-01-02', '2026-01-03',
      '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08',
    ]
    expect(getBestStreak(start, duration, completed)).toBe(4)
  })

  it('duplicate completions do not inflate', () => {
    const completed = [
      '2026-01-01', '2026-01-01', '2026-01-02', '2026-01-02', '2026-01-03',
    ]
    expect(getBestStreak(start, duration, completed)).toBe(3)
  })

  it('returns 0 for no completions', () => {
    expect(getBestStreak(start, duration, [])).toBe(0)
  })
})

describe('getChallengeProgress', () => {
  it('calculates correct percentage', () => {
    const start = '2026-01-01'
    const duration = 40
    const completed = Array.from({ length: 10 }, (_, i) =>
      `2026-01-${String(i + 1).padStart(2, '0')}`
    )
    const progress = getChallengeProgress(start, duration, completed)
    expect(progress.total).toBe(40)
    expect(progress.completed).toBe(10)
    expect(progress.percentage).toBe(25)
  })

  it('ignores completions outside the range', () => {
    const progress = getChallengeProgress('2026-01-01', 5, [
      '2025-12-31',
      '2026-01-01',
      '2026-01-06',
    ])
    expect(progress.completed).toBe(1)
  })

  it('never exceeds 100%', () => {
    const completed = Array.from({ length: 10 }, (_, i) =>
      `2026-01-${String(i + 1).padStart(2, '0')}`
    )
    // even if somehow more dates, capped by duration loop
    const progress = getChallengeProgress('2026-01-01', 5, completed)
    expect(progress.percentage).toBeLessThanOrEqual(100)
    expect(progress.completed).toBe(5)
  })
})

describe('getDailyProgress', () => {
  it('returns zeros when no tasks scheduled', () => {
    const result = getDailyProgress([], new Map(), '2026-01-15')
    expect(result).toEqual({ total: 0, completed: 0, percentage: 0 })
  })

  it('counts only tasks scheduled for that date', () => {
    const tasks = [
      { id: 'a', start_date: '2026-01-01', duration_days: 40 }, // scheduled
      { id: 'b', start_date: '2026-01-20', duration_days: 1 },  // not scheduled on 15
    ]
    const completions = new Map<string, string[]>([
      ['a', ['2026-01-15']],
    ])
    const result = getDailyProgress(tasks, completions, '2026-01-15')
    expect(result.total).toBe(1)
    expect(result.completed).toBe(1)
    expect(result.percentage).toBe(100)
  })
})

describe('isChallengeFinished', () => {
  it('false while still in range', () => {
    expect(isChallengeFinished('2026-01-01', 40, '2026-02-09')).toBe(false)
  })

  it('true the day after the last scheduled day', () => {
    expect(isChallengeFinished('2026-01-01', 40, '2026-02-10')).toBe(true)
  })
})

describe('extendChallengeDuration', () => {
  it('adds exactly 10 days', () => {
    expect(extendChallengeDuration(40)).toBe(50)
  })

  it('throws when exceeding 365', () => {
    expect(() => extendChallengeDuration(360)).toThrow(/365/)
  })

  it('allows extension up to exactly 365', () => {
    expect(extendChallengeDuration(355)).toBe(365)
  })
})

describe('buildChallengeDays', () => {
  it('produces exactly 40 tiles for a 40-day challenge', () => {
    const days = buildChallengeDays('2026-01-01', 40, [], '2026-01-15')
    expect(days).toHaveLength(40)
    expect(days[0].dayNumber).toBe(1)
    expect(days[0].dateKey).toBe('2026-01-01')
    expect(days[39].dayNumber).toBe(40)
    expect(days[39].dateKey).toBe(getChallengeEndDate('2026-01-01', 40))
  })

  it('marks completed, today, missed, and canToggle correctly', () => {
    const completed = ['2026-01-01', '2026-01-02']
    const today = '2026-01-05'
    const days = buildChallengeDays('2026-01-01', 10, completed, today)

    expect(days[0].isCompleted).toBe(true)
    expect(days[1].isCompleted).toBe(true)
    expect(days[2].isMissed).toBe(true) // Jan 3 past & not completed
    expect(days[4].isToday).toBe(true)
    expect(days[4].canToggle).toBe(true)
    expect(days[6].isFuture).toBe(true)
    // future day more than +1 cannot toggle
    expect(days[6].canToggle).toBe(false)
  })
})

describe('required acceptance examples', () => {
  it('1. 40-day challenge produces exactly 40 scheduled day tiles', () => {
    const days = buildChallengeDays('2026-01-01', 40, [], '2026-01-01')
    expect(days).toHaveLength(40)
  })

  it('2. challenge beginning 2026-01-01 duration 40 ends 2026-02-09', () => {
    expect(getChallengeEndDate('2026-01-01', 40)).toBe('2026-02-09')
  })

  it('3. three consecutive eligible days yield streak of three', () => {
    const completed = ['2026-01-13', '2026-01-14', '2026-01-15']
    expect(getCurrentStreak('2026-01-01', 40, completed, '2026-01-15')).toBe(3)
  })

  it('4. incomplete current day counts streak from yesterday', () => {
    const completed = ['2026-01-13', '2026-01-14']
    expect(getCurrentStreak('2026-01-01', 40, completed, '2026-01-15')).toBe(2)
  })

  it('5. missed day breaks the streak', () => {
    const completed = ['2026-01-13', '2026-01-15'] // 14 missing
    expect(getCurrentStreak('2026-01-01', 40, completed, '2026-01-15')).toBe(1)
  })

  it('6. duplicate completion data does not inflate progress', () => {
    const completed = ['2026-01-01', '2026-01-01', '2026-01-02']
    const p = getChallengeProgress('2026-01-01', 5, completed)
    expect(p.completed).toBe(2)
  })

  it('8. cannot complete two calendar days into the future', () => {
    expect(canCompleteOnDate('2026-01-01', 40, '2026-01-17', '2026-01-15')).toBe(false)
  })

  it('9. extension by ten days updates duration and preserves prior logic', () => {
    const next = extendChallengeDuration(40, 10)
    expect(next).toBe(50)
    expect(getChallengeEndDate('2026-01-01', next)).toBe('2026-02-19')
  })

  it('10. 365-day challenge cannot be extended beyond maximum', () => {
    expect(() => extendChallengeDuration(365)).toThrow()
    expect(() => extendChallengeDuration(360)).toThrow()
  })
})
