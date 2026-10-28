/**
 * Shared validation helpers for tasks and completions.
 * Used by both client forms and API layer.
 */

import { z } from 'zod'
import type { DateKey, TaskType } from '@/types'
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

export const createTaskSchema = z
  .object({
    title: taskTitleSchema,
    type: z.enum(['challenge', 'single']),
    start_date: dateKeySchema,
    duration_days: durationSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'single') {
      // force duration 1
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
  })

export type CreateTaskInput = z.infer<typeof createTaskSchema>

/** Normalize create payload for insert */
export function normalizeCreateTask(input: CreateTaskInput): {
  title: string
  type: TaskType
  start_date: DateKey
  duration_days: number
  due_date: DateKey
} {
  const title = input.title.trim()
  const type = input.type
  const start_date = assertDateKey(input.start_date)
  const duration_days = type === 'single' ? 1 : (input.duration_days as number)
  const due_date = getChallengeEndDate(start_date, duration_days)
  return { title, type, start_date, duration_days, due_date }
}
