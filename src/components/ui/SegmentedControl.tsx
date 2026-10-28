import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'relative flex rounded-xl bg-[#05070D] p-1 border border-[rgba(76,201,255,0.12)]',
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
              selected ? 'text-white' : 'text-[#8B95B3] hover:text-[#E8ECF8]'
            )}
          >
            {selected && (
              <span
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#2F6BFF] to-[#4CC9FF] -z-10"
                aria-hidden
              />
            )}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
