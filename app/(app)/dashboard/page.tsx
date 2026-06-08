import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, addDays, format } from 'date-fns'
import TodayTasks from '@/components/dashboard/TodayTasks'
import ProgressRing from '@/components/dashboard/ProgressRing'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines'
import VisionHighlight from '@/components/dashboard/VisionHighlight'
import type { Task, TaskActivity, Vision } from '@/types'

export const metadata = { title: 'Dashboard — MyReality' }

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-[var(--border)] rounded-lg p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date()
  const todayStart = startOfDay(today).toISOString()
  const todayEnd = endOfDay(today).toISOString()
  const sevenDaysOut = addDays(today, 7).toISOString()

  const [profileRes, todayTasksRes, upcomingRes, activityRes, visionRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single(),

    supabase
      .from('tasks')
      .select('*')
      .eq('created_by', user.id)
      .gte('due_date', todayStart)
      .lte('due_date', todayEnd)
      .order('priority', { ascending: false }),

    supabase
      .from('tasks')
      .select('*')
      .eq('created_by', user.id)
      .neq('status', 'done')
      .gt('due_date', todayEnd)
      .lte('due_date', sevenDaysOut)
      .order('due_date', { ascending: true })
      .limit(5),

    supabase
      .from('task_activity')
      .select(`
        *,
        profile:profiles!task_activity_user_id_fkey(full_name),
        task:tasks!task_activity_task_id_fkey(title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),

    supabase
      .from('visions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  const firstName = profileRes.data?.full_name?.split(' ')[0] ?? 'there'
  const todayTasks = (todayTasksRes.data ?? []) as Task[]
  const upcomingTasks = (upcomingRes.data ?? []) as Task[]
  const completedToday = todayTasks.filter(t => t.status === 'done').length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activity = (activityRes.data ?? []).map((item: any) => ({
    ...item,
    profile: item.profile,
    task_title: item.task?.title ?? undefined,
  })) as (TaskActivity & { task_title?: string })[]

  const visions = (visionRes.data ?? []) as Vision[]
  const vision = visions.length > 0
    ? visions[Math.floor(Math.random() * visions.length)]
    : null

  const isFirstTime = todayTasks.length === 0 && visions.length === 0 && activity.length === 0

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="px-4 lg:px-7 py-6 pb-10 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary">
          {greeting}, {firstName}
        </h1>
        <p className="text-secondary text-sm mt-1">
          {format(today, 'EEEE, MMMM d')}
        </p>
      </div>

      {/* First-time onboarding banner */}
      {isFirstTime && (
        <div className="bg-[var(--gold-muted)] border border-[var(--gold)]/30 rounded-xl p-5">
          <p className="text-sm font-semibold text-primary mb-1">Welcome to MyReality 🎉</p>
          <p className="text-xs text-secondary mb-4">
            Your workspace is ready. Here&apos;s how to get started:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: '/vision', label: 'Build your Vision Board', desc: 'Set goals across all areas of life' },
              { href: '/tasks',  label: 'Add your first task',     desc: 'Capture what you need to do today' },
              { href: '/projects', label: 'Start a project',       desc: 'Organise work with your team' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block bg-card border border-[var(--border)] rounded-lg px-4 py-3 hover:border-gold transition-colors group"
              >
                <p className="text-sm font-medium text-primary group-hover:text-gold transition-colors">{item.label} →</p>
                <p className="text-xs text-muted mt-0.5">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: single column */}
      <div className="flex flex-col gap-4 lg:hidden">
        <Widget title="Today's Progress">
          <ProgressRing completed={completedToday} total={todayTasks.length} />
        </Widget>
        <Widget title="Today's Tasks">
          <TodayTasks initialTasks={todayTasks} />
        </Widget>
        <Widget title="Upcoming Deadlines">
          <UpcomingDeadlines tasks={upcomingTasks} />
        </Widget>
        <Widget title="Vision Spotlight">
          <VisionHighlight vision={vision} />
        </Widget>
        <Widget title="Recent Activity">
          <ActivityFeed activity={activity} />
        </Widget>
      </div>

      {/* Desktop: 3-column grid */}
      <div className="hidden lg:grid grid-cols-3 gap-4">
        {/* Left 2/3 */}
        <div className="col-span-2 flex flex-col gap-4">
          <Widget title="Today's Tasks">
            <TodayTasks initialTasks={todayTasks} />
          </Widget>
          <Widget title="Recent Activity">
            <ActivityFeed activity={activity} />
          </Widget>
        </div>
        {/* Right 1/3 */}
        <div className="flex flex-col gap-4">
          <Widget title="Today's Progress">
            <ProgressRing completed={completedToday} total={todayTasks.length} />
          </Widget>
          <Widget title="Upcoming Deadlines">
            <UpcomingDeadlines tasks={upcomingTasks} />
          </Widget>
          <Widget title="Vision Spotlight">
            <VisionHighlight vision={vision} />
          </Widget>
        </div>
      </div>
    </main>
  )
}
