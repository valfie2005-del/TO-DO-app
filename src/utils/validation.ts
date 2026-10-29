import { z } from 'zod'
import type { DateKey, TaskType, TimeKey } from '@/types'
import { assertDateKey, getChallengeEndDate } from './dates'
import { normalizeTimeKey, timeToMinutes, DEFAULT_GRACE_MINUTES } from './taskStatus'

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(120, 'Title must be 120 characters or fewer')

export const durationSchema = z
  .number()
  .int()
  .min(1, 'Duration must be at least 1 day')
  .max(365, 'Duration cannot exceed 365 days')

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be yyyy-MM-dd')
  .refine((v) => {
    try {
      assertDateKey(v)
      return true
    } catch {
      return false
    }
  }, 'Invalid calendar date')

export const createTaskSchema = z
  .object({
    title: taskTitleSchema,
    type: z.enum(['challenge', 'single']),
    start_date: dateKeySchema,
    duration_days: durationSchema.optional(),
    description: z.string().max(500).optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    reminder_time: z.string().optional(), // legacy alias
    grace_minutes: z.coerce.number().int().min(0).max(180).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'single') {
      if (data.duration_days !== undefined && data.duration_days !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Single-day tasks must have duration 1',
          path: ['duration_days'],
        })
      }
    } else if (data.duration_days === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duration is required for challenges',
        path: ['duration_days'],
      })
    }

    const start = normalizeTimeKey(data.start_time || data.reminder_time)
    const end = normalizeTimeKey(data.end_time)
    if (data.end_time?.trim() && !end) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid end time', path: ['end_time'] })
    }
    if (data.start_time?.trim() && !start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid start time', path: ['start_time'] })
    }
    // Same-day end must be after start (overnight allowed when end <= start)
    // Validation only warns if end provided without start
    if (end && !start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time is required when end time is set',
        path: ['start_time'],
      })
    }
  })

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export function normalizeCreateTask(input: CreateTaskInput): {
  title: string
  type: TaskType
  start_date: DateKey
  duration_days: number
  due_date: DateKey
  description: string | null
  start_time: TimeKey | null
  end_time: TimeKey | null
  reminder_time: TimeKey | null
  grace_minutes: number
} {
  const title = input.title.trim()
  const type = input.type
  const start_date = assertDateKey(input.start_date)
  const duration_days = type === 'single' ? 1 : (input.duration_days as number)
  const due_date = getChallengeEndDate(start_date, duration_days)
  const start_time = normalizeTimeKey(input.start_time || input.reminder_time)
  const end_time = normalizeTimeKey(input.end_time)
  const description = input.description?.trim() || null
  const grace_minutes = input.grace_minutes ?? DEFAULT_GRACE_MINUTES
  return {
    title,
    type,
    start_date,
    duration_days,
    due_date,
    description,
    start_time,
    end_time,
    reminder_time: start_time, // keep legacy column in sync
    grace_minutes,
  }
}

export function formatTimeDisplay(time: string | null | undefined): string | null {
  if (!time) return null
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return time
  let h = parseInt(match[1], 10)
  const m = match[2]
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

export { timeToMinutes }
