import { forwardRef, type InputHTMLAttributes, type Ref } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

function InputComponent(
  { className, label, error, hint, id, ...props }: InputProps,
  ref: Ref<HTMLInputElement>
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#E8ECF8]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-11 w-full rounded-xl border bg-[#0B1020] px-3.5 text-[#E8ECF8] placeholder:text-[#8B95B3]',
          'border-[rgba(76,201,255,0.12)] transition-colors',
          'focus:border-[#4CC9FF] focus:outline-none focus:ring-1 focus:ring-[#4CC9FF]',
          'disabled:opacity-50',
          error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-[#8B95B3]">
          {hint}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef(InputComponent)
Input.displayName = 'Input'