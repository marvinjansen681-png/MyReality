import { parseISO, isPast, isToday } from 'date-fns'
import type { TaskStatus } from '@/types'

export type DueDateStatus = 'overdue' | 'today' | 'normal'

export function getDueDateStatus(dueDate: string | null, status: TaskStatus): DueDateStatus {
  if (!dueDate || status === 'done') return 'normal'
  const date = parseISO(dueDate)
  if (isPast(date) && !isToday(date)) return 'overdue'
  if (isToday(date)) return 'today'
  return 'normal'
}
