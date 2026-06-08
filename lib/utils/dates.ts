import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns'

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function getMondayOfWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function formatWeekStart(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function parseWeekStart(iso: string): Date {
  return parseISO(iso)
}
