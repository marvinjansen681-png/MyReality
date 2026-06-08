'use client'

import { useState, useCallback, useRef } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent, DragOverlay,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { addWeeks, subWeeks, format, isSameWeek, addDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { getMondayOfWeek, getWeekDays, formatWeekStart, isToday } from '@/lib/utils/dates'
import DayColumn from './DayColumn'
import type { WeeklyPlan, PlanItem } from '@/types'

// day index 0=Mon…6=Sun matching the weekly_plans table
type DayPlans = Map<number, PlanItem[]>

function makePlanId(week: string, dayIndex: number) {
  return `${week}-${dayIndex}`
}

interface WeekGridProps {
  userId: string
  workspaceId: string | null
  initialPlans: WeeklyPlan[]
  initialWeekStart: Date
}

export default function WeekGrid({ userId, workspaceId, initialPlans, initialWeekStart }: WeekGridProps) {
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [plans, setPlans] = useState<Map<string, WeeklyPlan>>(
    () => {
      const m = new Map<string, WeeklyPlan>()
      initialPlans.forEach(p => m.set(makePlanId(p.week_start, p.day_index), p))
      return m
    }
  )
  const [intention, setIntention] = useState<string>(() => {
    // pick any plan from the same week for the intention (we store it on day 0)
    const key = makePlanId(formatWeekStart(initialWeekStart), 0)
    return plans.get(key)?.items[0]?.text ?? ''
  })
  const [savingIntention, setSavingIntention] = useState(false)
  // mobile: which day index is selected (0=Mon)
  const [mobileDay, setMobileDay] = useState<number>(() => {
    const today = new Date()
    if (isSameWeek(today, initialWeekStart, { weekStartsOn: 1 })) {
      const diff = today.getDay() === 0 ? 6 : today.getDay() - 1
      return diff
    }
    return 0
  })

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const days = getWeekDays(weekStart)
  const weekKey = formatWeekStart(weekStart)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  // ---------- helpers ----------

  function getPlanItems(dayIndex: number): PlanItem[] {
    const key = makePlanId(weekKey, dayIndex)
    return plans.get(key)?.items ?? []
  }

  async function persistDay(dayIndex: number, items: PlanItem[]) {
    const key = makePlanId(weekKey, dayIndex)
    // Debounce saves
    const existing = saveTimers.current.get(key)
    if (existing) clearTimeout(existing)
    saveTimers.current.set(key, setTimeout(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('weekly_plans')
        .upsert({
          user_id: userId,
          workspace_id: workspaceId,
          week_start: weekKey,
          day_index: dayIndex,
          items,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,week_start,day_index' })
      if (error) toast.error('Failed to save plan')
    }, 600))
  }

  function updateItems(dayIndex: number, items: PlanItem[]) {
    const key = makePlanId(weekKey, dayIndex)
    setPlans(prev => {
      const next = new Map(prev)
      const existing = next.get(key)
      next.set(key, {
        ...(existing ?? {
          id: crypto.randomUUID(),
          user_id: userId,
          workspace_id: workspaceId,
          week_start: weekKey,
          day_index: dayIndex,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        day_index: dayIndex,
        week_start: weekKey,
        items,
        updated_at: new Date().toISOString(),
      } as WeeklyPlan)
      return next
    })
    persistDay(dayIndex, items)
  }

  // ---------- CRUD ----------

  const handleAddItem = useCallback((dayIndex: number, text: string, time?: string) => {
    const items = getPlanItems(dayIndex)
    const newItem: PlanItem = {
      id: crypto.randomUUID(),
      text,
      done: false,
      time: time ?? null,
      color: null,
    }
    updateItems(dayIndex, [...items, newItem])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, plans])

  const handleToggleItem = useCallback((dayIndex: number, id: string) => {
    const items = getPlanItems(dayIndex)
    updateItems(dayIndex, items.map(i => i.id === id ? { ...i, done: !i.done } : i))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, plans])

  const handleDeleteItem = useCallback((dayIndex: number, id: string) => {
    const items = getPlanItems(dayIndex)
    updateItems(dayIndex, items.filter(i => i.id !== id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, plans])

  const handleTextChange = useCallback((dayIndex: number, id: string, text: string) => {
    const items = getPlanItems(dayIndex)
    updateItems(dayIndex, items.map(i => i.id === id ? { ...i, text } : i))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, plans])

  // ---------- Drag between days ----------

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    // Find which day the active item belongs to
    let sourceDayIndex = -1
    let sourceItem: PlanItem | undefined
    for (let d = 0; d < 7; d++) {
      const items = getPlanItems(d)
      const found = items.find(i => i.id === active.id)
      if (found) { sourceDayIndex = d; sourceItem = found; break }
    }
    if (sourceDayIndex === -1 || !sourceItem) return

    // Dropping onto a day container
    const overIdStr = String(over.id)
    if (overIdStr.startsWith('day-')) {
      const targetDayIndex = parseInt(overIdStr.replace('day-', ''))
      if (targetDayIndex === sourceDayIndex) return
      const sourceItems = getPlanItems(sourceDayIndex).filter(i => i.id !== active.id)
      const targetItems = [...getPlanItems(targetDayIndex), sourceItem]
      updateItems(sourceDayIndex, sourceItems)
      updateItems(targetDayIndex, targetItems)
      return
    }

    // Reordering within same day
    const targetDayIndex = sourceDayIndex
    const items = getPlanItems(targetDayIndex)
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      updateItems(targetDayIndex, arrayMove(items, oldIdx, newIdx))
    }
  }

  // ---------- Week navigation ----------

  async function loadWeek(newWeekStart: Date) {
    setWeekStart(newWeekStart)
    const newKey = formatWeekStart(newWeekStart)
    const supabase = createClient()
    const { data } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', newKey)

    if (data) {
      setPlans(prev => {
        const next = new Map(prev)
        data.forEach((p: WeeklyPlan) => next.set(makePlanId(p.week_start, p.day_index), p))
        return next
      })
    }
    // Reset mobile day
    const today = new Date()
    if (isSameWeek(today, newWeekStart, { weekStartsOn: 1 })) {
      const diff = today.getDay() === 0 ? 6 : today.getDay() - 1
      setMobileDay(diff)
    } else {
      setMobileDay(0)
    }
  }

  // Compute carried-over IDs: items from previous day that are not done
  function getCarriedOverIds(dayIndex: number): Set<string> {
    if (dayIndex === 0) return new Set()
    const prevItems = getPlanItems(dayIndex - 1)
    const currentItems = getPlanItems(dayIndex)
    const currentTexts = new Set(currentItems.map(i => i.text))
    // An item is "carried over" if same text exists in prev day's undone items
    const carried = new Set<string>()
    currentItems.forEach(item => {
      if (!item.done && prevItems.some(p => !p.done && p.text === item.text)) {
        carried.add(item.id)
      }
    })
    return carried
  }

  async function saveIntention() {
    if (savingIntention) return
    setSavingIntention(true)
    // Store weekly intention as a special meta field - we use a separate approach:
    // save to day_index=0 items with a special "intention" marker in color field
    const supabase = createClient()
    await supabase.from('weekly_plans').upsert({
      user_id: userId,
      workspace_id: workspaceId,
      week_start: weekKey,
      day_index: 7, // virtual slot for intention
      items: [{ id: 'intention', text: intention, done: false, time: null, color: 'intention' }],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start,day_index' })
    setSavingIntention(false)
  }

  const isCurrentWeek = isSameWeek(new Date(), weekStart, { weekStartsOn: 1 })

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary">Weekly Planner</h1>
            <p className="text-secondary text-sm mt-0.5">
              {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadWeek(subWeeks(weekStart, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-secondary hover:text-primary hover:bg-hover transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => loadWeek(getMondayOfWeek(new Date()))}
                className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-[var(--border)] text-xs text-secondary hover:text-primary hover:bg-hover transition-colors"
              >
                <CalendarDays size={13} /> Today
              </button>
            )}
            <button
              onClick={() => loadWeek(addWeeks(weekStart, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-secondary hover:text-primary hover:bg-hover transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekly intention */}
        <div className="relative">
          <input
            value={intention}
            onChange={e => setIntention(e.target.value)}
            onBlur={saveIntention}
            onKeyDown={e => e.key === 'Enter' && saveIntention()}
            placeholder="This week's intention..."
            className="w-full bg-card border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">
            Weekly intention
          </span>
        </div>

        {/* Mobile day picker */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:hidden scrollbar-none">
          {days.map((day, i) => (
            <button
              key={i}
              onClick={() => setMobileDay(i)}
              className={cn(
                'flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg min-w-[52px] transition-colors',
                mobileDay === i
                  ? 'bg-gold text-black'
                  : isToday(day)
                  ? 'border border-[var(--gold)] text-gold'
                  : 'bg-hover text-secondary'
              )}
            >
              <span className="text-[10px] font-medium uppercase">{format(day, 'EEE')}</span>
              <span className="text-lg font-bold leading-tight">{format(day, 'd')}</span>
              {getPlanItems(i).length > 0 && (
                <span className="w-1 h-1 rounded-full bg-current mt-0.5 opacity-60" />
              )}
            </button>
          ))}
        </div>

        {/* Mobile: single day */}
        <div className="lg:hidden">
          <DayColumn
            date={days[mobileDay]}
            dayIndex={mobileDay}
            items={getPlanItems(mobileDay)}
            carriedOverIds={getCarriedOverIds(mobileDay)}
            onAddItem={handleAddItem}
            onToggleItem={handleToggleItem}
            onDeleteItem={handleDeleteItem}
            onTextChange={handleTextChange}
            compact
          />
        </div>

        {/* Desktop: 7 columns */}
        <div className="hidden lg:grid grid-cols-7 gap-3">
          {days.map((day, i) => (
            <DayColumn
              key={i}
              date={day}
              dayIndex={i}
              items={getPlanItems(i)}
              carriedOverIds={getCarriedOverIds(i)}
              onAddItem={handleAddItem}
              onToggleItem={handleToggleItem}
              onDeleteItem={handleDeleteItem}
              onTextChange={handleTextChange}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {/* lightweight overlay while dragging */}
        <div className="bg-card border border-gold rounded-md px-3 py-2 text-sm text-primary shadow-xl opacity-90" />
      </DragOverlay>
    </DndContext>
  )
}
