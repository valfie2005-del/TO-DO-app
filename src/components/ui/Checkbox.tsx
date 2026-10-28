import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  loading?: boolean
  label?: string
  className?: string
}

export function Checkbox({
  checked,
  onChange,
  disabled,
  loading,
  label,
  className,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || loading}
      onClick={onChange}
      className={cn(
        'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CC9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070D]',
        checked
          ? 'border-transparent bg-gradient-to-br from-[#2F6BFF] to-[#4CC9FF] shadow-[0_0_12px_rgba(47,107,255,0.4)]'
          : 'border-[rgba(76,201,255,0.25)] bg-transparent hover:border-[rgba(76,201,255,0.5)]',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {checked && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </motion.span>
      )}
    </button>
  )
}
