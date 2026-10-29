import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useUiStore } from '@/store/uiStore'
import { getLocalToday, getChallengeEndDate, assertDateKey } from '@/utils/dates'
import type { CreateTaskInput } from '@/utils/validation'

const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    description: z.string().max(500).optional(),
    type: z.enum(['challenge', 'single']),
    start_date: z.string().min(1).regex(/^\d{4}-\d{2}-\d{2}$/),
    duration_days: z.coerce.number().int().min(1).max(365),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'challenge' && data.duration_days < 1) {
      ctx.addIssue({ code: 'custom', message: 'Duration required', path: ['duration_days'] })
    }
    if (data.end_time?.trim() && !data.start_time?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Start time required when end time is set',
        path: ['start_time'],
      })
    }
  })

type FormValues = z.infer<typeof schema>
const DURATION_CHIPS = [21, 40, 66, 100]

interface AddTaskModalProps {
  onCreate: (input: CreateTaskInput) => Promise<unknown>
}

export function AddTaskModal({ onCreate }: AddTaskModalProps) {
  const open = useUiStore((s) => s.addTaskModalOpen)
  const defaults = useUiStore((s) => s.addTaskDefaults)
  const close = useUiStore((s) => s.closeAddTaskModal)
  const selectedDate = useUiStore((s) => s.selectedDate)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      type: 'challenge',
      start_date: getLocalToday(),
      duration_days: 40,
      start_time: '',
      end_time: '',
    },
  })

  const type = watch('type')
  const startDate = watch('start_date')
  const duration = Number(watch('duration_days')) || 40

  useEffect(() => {
    if (open) {
      setFormError(null)
      const start =
        defaults.startDate ??
        (defaults.type === 'single' ? selectedDate : getLocalToday())
      reset({
        title: '',
        description: '',
        type: defaults.type ?? 'challenge',
        start_date: start,
        duration_days: defaults.type === 'single' ? 1 : 40,
        start_time: '',
        end_time: '',
      })
    }
  }, [open, defaults, selectedDate, reset])

  let endPreview: string | null = null
  if (type === 'challenge' && startDate && duration >= 1 && duration <= 365) {
    try {
      assertDateKey(startDate)
      endPreview = getChallengeEndDate(startDate, duration)
    } catch {
      endPreview = null
    }
  }

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    try {
      await onCreate({
        title: values.title,
        description: values.description,
        type: values.type,
        start_date: values.start_date,
        duration_days: values.type === 'single' ? 1 : values.duration_days,
        start_time: values.start_time?.trim() || undefined,
        end_time: values.end_time?.trim() || undefined,
      })
      close()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add task"
      description="Set a time window and optional 30-minute grace after the deadline."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Title"
          placeholder="e.g. Project Learning"
          error={errors.title?.message}
          {...register('title')}
        />

        <Input
          label="Description (optional)"
          placeholder="Notes for this challenge"
          error={errors.description?.message}
          {...register('description')}
        />

        <div>
          <p className="text-sm font-medium text-[#E8ECF8] mb-1.5">Type</p>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <SegmentedControl
                options={[
                  { value: 'challenge', label: 'Challenge' },
                  { value: 'single', label: 'One day' },
                ]}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v)
                  setValue('duration_days', v === 'single' ? 1 : 40)
                }}
              />
            )}
          />
        </div>

        <Input
          label={type === 'challenge' ? 'Start date' : 'Date'}
          type="date"
          error={errors.start_date?.message}
          {...register('start_date')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start time"
            type="time"
            error={errors.start_time?.message}
            {...register('start_time')}
          />
          <Input
            label="End / deadline"
            type="time"
            error={errors.end_time?.message}
            hint="If end ≤ start, treated as overnight"
            {...register('end_time')}
          />
        </div>

        {type === 'challenge' && (
          <>
            <div>
              <label className="text-sm font-medium text-[#E8ECF8]" htmlFor="duration_days">
                Duration (days)
              </label>
              <Input
                id="duration_days"
                type="number"
                min={1}
                max={365}
                error={errors.duration_days?.message}
                {...register('duration_days')}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATION_CHIPS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setValue('duration_days', d, { shouldValidate: true })}
                    className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${
                      duration === d
                        ? 'border-[#4CC9FF] bg-[#4CC9FF]/15 text-[#4CC9FF]'
                        : 'border-[rgba(76,201,255,0.12)] text-[#8B95B3]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {endPreview && (
              <p className="text-xs text-[#8B95B3]">
                Challenge ends <span className="text-[#E8ECF8] font-medium">{endPreview}</span>
                {' · '}Grace: 30 min after each daily deadline
              </p>
            )}
          </>
        )}

        {formError && (
          <p className="text-sm text-red-400" role="alert">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={isSubmitting}>
            Create
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
