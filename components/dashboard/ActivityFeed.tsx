import { formatDistanceToNow, parseISO } from 'date-fns'
import { Activity } from 'lucide-react'
import type { TaskActivity } from '@/types'

const ACTION_LABELS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  commented: 'commented on',
  assigned: 'was assigned',
  moved: 'moved',
  completed: 'completed',
  reopened: 'reopened',
}

interface ActivityFeedProps {
  activity: (TaskActivity & { task_title?: string })[]
}

export default function ActivityFeed({ activity }: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Activity size={28} className="text-muted mb-2" />
        <p className="text-sm text-secondary">No recent activity</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {activity.map(item => (
        <li key={item.id} className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)] mt-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-secondary leading-snug">
              <span className="text-primary font-medium">
                {item.profile?.full_name ?? 'Someone'}
              </span>
              {' '}{ACTION_LABELS[item.action] ?? item.action}{' '}
              {item.task_title && (
                <span className="text-primary">&ldquo;{item.task_title}&rdquo;</span>
              )}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
