/**
 * Shared validation helpers for tasks and completions.
 * Used by both client forms and API layer.
 */

import { z } from 'zod'
import type { DateKey, TaskType, TimeKey } from '@/types'
import { assertDateKey, getChallengeEndDate } from './dates'

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

/** Optional HH:mm (24h). Empty string → null */
export const timeKeySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm')
  .optional()
  .or(z.literal(''))

export const createTaskSchema = z
  .object({
    title: taskTitleSchema,
    type: z.enum(['challenge', 'single']),
    start_date: dateKeySchema,
    duration_days: durationSchema.optional(),
    reminder_time: z.string().optional(),
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
    } else {
      if (data.duration_days === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duration is required for challenges',
          path: ['duration_days'],
        })
      }
    }
    const t = data.reminder_time?.trim()
    if (t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Time must be HH:mm (24-hour)',
        path: ['reminder_time'],
      })
    }
  })

export type CreateTaskInput = z.infer<typeof createTaskSchema>

function normalizeTime(value?: string): TimeKey | null {
  const t = value?.trim()
  if (!t) return null
  // Accept HH:mm or HH:mm:ss from <input type="time">
  const match = t.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (!match) return null
  return `${match[1]}:${match[2]}`
}

/** Normalize create payload for insert */
export function normalizeCreateTask(input: CreateTaskInput): {
  title: string
  type: TaskType
  start_date: DateKey
  duration_days: number
  due_date: DateKey
  reminder_time: TimeKey | null
} {
  const title = input.title.trim()
  const type = input.type
  const start_date = assertDateKey(input.start_date)
  const duration_days = type === 'single' ? 1 : (input.duration_days as number)
  const due_date = getChallengeEndDate(start_date, duration_days)
  const reminder_time = normalizeTime(input.reminder_time)
  return { title, type, start_date, duration_days, due_date, reminder_time }
}

/** Format HH:mm for display (e.g. 09:30 → 9:30 AM) */
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
