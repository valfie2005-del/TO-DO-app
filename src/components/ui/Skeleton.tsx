import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[rgba(76,201,255,0.08)]',
        className
      )}
      aria-hidden
    />
  )
}
