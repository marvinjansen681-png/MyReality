import { createClient } from '@/lib/supabase/server'
import { getMondayOfWeek, formatWeekStart } from '@/lib/utils/dates'
import WeekGrid from '@/components/planner/WeekGrid'
import type { WeeklyPlan } from '@/types'

export const metadata = { title: 'Planner — MyReality' }

export default async function PlannerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const weekStart = getMondayOfWeek(new Date())
  const weekKey = formatWeekStart(weekStart)

  const [memberRes, plansRes] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single(),

    supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekKey),
  ])

  const plans = (plansRes.data ?? []) as WeeklyPlan[]

  return (
    <main className="px-4 lg:px-7 py-6 pb-16">
      <WeekGrid
        userId={user.id}
        workspaceId={memberRes.data?.workspace_id ?? null}
        initialPlans={plans}
        initialWeekStart={weekStart}
      />
    </main>
  )
}
