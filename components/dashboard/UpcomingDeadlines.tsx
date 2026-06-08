import { format, differenceInDays, parseISO } from 'date-fns'
import { Calendar, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Task } from '@/types'

interface UpcomingDeadlinesProps {
  tasks: Task[]
}

export default function UpcomingDeadlines({ tasks }: UpcomingDeadlinesProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Calendar size={28} className="text-muted mb-2" />
        <p className="text-sm text-secondary">No upcoming deadlines</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {tasks.map(task => {
        const daysLeft = differenceInDays(parseISO(task.due_date!), new Date())
        const isOverdue = daysLeft < 0
        const isUrgent = daysLeft >= 0 && daysLeft <= 2

        return (
          <li key={task.id} className="flex items-center gap-3 py-1.5">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              isOverdue ? 'bg-red' : isUrgent ? 'bg-gold' : 'bg-secondary'
            )} />
            <span className="flex-1 text-sm text-primary truncate">{task.title}</span>
            <div className={cn(
              'flex items-center gap-1 text-xs flex-shrink-0',
              isOverdue ? 'text-red' : isUrgent ? 'text-gold' : 'text-muted'
            )}>
              {isOverdue && <AlertTriangle size={11} />}
              {isOverdue
                ? `${Math.abs(daysLeft)}d overdue`
                : daysLeft === 0
                ? 'Today'
                : daysLeft === 1
                ? 'Tomorrow'
                : format(parseISO(task.due_date!), 'MMM d')}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
