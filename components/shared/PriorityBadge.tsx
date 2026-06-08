import { cn } from '@/lib/utils/cn'
import type { TaskPriority } from '@/types'

const STYLES: Record<TaskPriority, string> = {
  urgent: 'bg-[var(--red-muted)] text-red',
  high:   'bg-[var(--gold-muted)] text-gold',
  medium: 'bg-[var(--blue-muted)] text-blue',
  low:    'bg-hover text-secondary',
  none:   'bg-hover text-muted',
}

const LABELS: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  high:   'High',
  medium: 'Medium',
  low:    'Low',
  none:   'None',
}

interface PriorityBadgeProps {
  priority: TaskPriority
  className?: string
}

export default function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  if (priority === 'none') return null
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STYLES[priority], className)}>
      {LABELS[priority]}
    </span>
  )
}
