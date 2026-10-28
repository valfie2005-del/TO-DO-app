import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)}>
      {icon && <div className="mb-4 text-[#4CC9FF]/opacity-60">{icon}</div>}
      <h3 className="text-base font-semibold text-[#E8ECF8]">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-[#8B95B3] max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
