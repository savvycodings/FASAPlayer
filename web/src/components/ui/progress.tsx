import { cn } from '@/lib/utils'

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.min(100, Math.max(0, value))
  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={v}
    >
      <div className="h-full bg-primary transition-all" style={{ width: `${v}%` }} />
    </div>
  )
}
