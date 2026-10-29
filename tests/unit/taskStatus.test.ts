import { describe, it, expect } from 'vitest'
import {
  resolveTaskStatus,
  sortTasksChronologically,
  timeToMinutes,
  getEffectiveTimes,
  buildWindowTimestamps,
  DEFAULT_GRACE_MINUTES,
} from '../../src/utils/taskStatus'
import type { Task, Completion } from '../../src/types'

function baseTask(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    user_id: 'u1',
    title: 'Test',
    type: 'single',
    start_date: '2026-10-28',
    duration_days: 1,
    due_date: '2026-10-28',
    reminder_time: null,
    description: null,
    start_time: '15:00',
    end_time: '16:00',
    grace_minutes: 30,
    created_at: '2026-10-28T00:00:00Z',
    ...over,
  }
}

describe('timeToMinutes / sort', () => {
  it('sorts AM before PM chronologically', () => {
    const tasks = [
      baseTask({ id: 'b', title: 'B', start_time: '15:00' }),
      baseTask({ id: 'a', title: 'A', start_time: '09:30' }),
      baseTask({ id: 'c', title: 'C', start_time: '09:15' }),
    ]
    const sorted = sortTasksChronologically(tasks)
    expect(sorted.map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })

  it('puts null times last', () => {
    const tasks = [
      baseTask({ id: 'n', start_time: null, reminder_time: null }),
      baseTask({ id: 'm', start_time: '08:00' }),
    ]
    const sorted = sortTasksChronologically(tasks)
    expect(sorted[0].id).toBe('m')
    expect(sorted[1].id).toBe('n')
  })
})

describe('resolveTaskStatus', () => {
  const dateKey = '2026-10-28'
  // Local times without TZ: parseISO local
  // Use explicit timestamps for now

  it('upcoming before start', () => {
    const task = baseTask()
    const now = new Date('2026-10-28T14:00:00')
    const s = resolveTaskStatus(task, dateKey, null, now)
    expect(s.status).toBe('upcoming')
  })

  it('in_progress between start and end', () => {
    const task = baseTask()
    const now = new Date('2026-10-28T15:30:00')
    const s = resolveTaskStatus(task, dateKey, null, now)
    expect(s.status).toBe('in_progress')
  })

  it('grace_period at exact end time (not missed)', () => {
    const task = baseTask()
    const now = new Date('2026-10-28T16:00:00')
    const s = resolveTaskStatus(task, dateKey, null, now)
    expect(s.status).toBe('grace_period')
  })

  it('grace_period during the 30 minutes after deadline', () => {
    const task = baseTask()
    const now = new Date('2026-10-28T16:29:00')
    const s = resolveTaskStatus(task, dateKey, null, now)
    expect(s.status).toBe('grace_period')
  })

  it('missed after grace ends', () => {
    const task = baseTask()
    const now = new Date('2026-10-28T16:30:00')
    const s = resolveTaskStatus(task, dateKey, null, now)
    expect(s.status).toBe('missed')
  })

  it('completed on time', () => {
    const task = baseTask()
    const completion: Completion = {
      id: 'c1',
      task_id: 't1',
      completed_on: dateKey,
      created_at: '2026-10-28T15:45:00Z',
      completed_at: '2026-10-28T15:45:00',
      completion_kind: 'on_time',
    }
    const s = resolveTaskStatus(task, dateKey, completion, new Date('2026-10-28T17:00:00'))
    expect(s.status).toBe('completed_on_time')
  })

  it('completed late during grace', () => {
    const task = baseTask()
    const completion: Completion = {
      id: 'c1',
      task_id: 't1',
      completed_on: dateKey,
      created_at: '2026-10-28T16:10:00Z',
      completed_at: '2026-10-28T16:10:00',
      completion_kind: 'late',
    }
    const s = resolveTaskStatus(task, dateKey, completion, new Date('2026-10-28T17:00:00'))
    expect(s.status).toBe('completed_late')
  })

  it('untimed legacy task without times', () => {
    const task = baseTask({ start_time: null, end_time: null, reminder_time: null })
    const s = resolveTaskStatus(task, dateKey, null, new Date('2026-10-28T20:00:00'))
    expect(s.status).toBe('untimed')
  })
})

describe('getEffectiveTimes', () => {
  it('defaults end to start+60m', () => {
    const t = getEffectiveTimes({
      start_time: '10:00',
      end_time: null,
      reminder_time: null,
      grace_minutes: 30,
    })
    expect(t.end).toBe('11:00')
    expect(t.overnight).toBe(false)
  })

  it('detects overnight when end <= start', () => {
    const t = getEffectiveTimes({
      start_time: '22:00',
      end_time: '06:00',
      reminder_time: null,
      grace_minutes: 30,
    })
    expect(t.overnight).toBe(true)
  })
})

describe('grace boundary precision', () => {
  it('DEFAULT_GRACE_MINUTES is 30', () => {
    expect(DEFAULT_GRACE_MINUTES).toBe(30)
  })

  it('graceEndsAt is end + 30 minutes', () => {
    const { endAt, graceEndsAt } = buildWindowTimestamps(
      '2026-10-28',
      '15:00',
      '16:00',
      false,
      30
    )
    expect(endAt).not.toBeNull()
    expect(graceEndsAt).not.toBeNull()
    expect(graceEndsAt!.getTime() - endAt!.getTime()).toBe(30 * 60 * 1000)
  })
})
