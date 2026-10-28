import { forwardRef, type ButtonHTMLAttributes, type Ref } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-[#2F6BFF] to-[#4CC9FF] text-white shadow-[0_0_20px_rgba(47,107,255,0.35)] hover:opacity-95 disabled:opacity-50',
  secondary:
    'bg-[#0B1020] border border-[rgba(76,201,255,0.12)] text-[#E8ECF8] hover:border-[rgba(76,201,255,0.3)]',
  ghost: 'bg-transparent text-[#8B95B3] hover:text-[#E8ECF8] hover:bg-white/5',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
}

function ButtonComponent(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...props }: ButtonProps,
  ref: Ref<HTMLButtonElement>
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CC9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070D] disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

export const Button = forwardRef(ButtonComponent)
Button.displayName = 'Button'
