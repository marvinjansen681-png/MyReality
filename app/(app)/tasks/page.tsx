import { createClient } from '@/lib/supabase/server'
import TaskList from '@/components/tasks/TaskList'
import type { Task } from '@/types'

export const metadata = { title: 'My Tasks — MyReality' }

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('created_by', user.id)
    .eq('is_personal', true)
    .is('parent_task_id', null)
    .order('created_at', { ascending: false })
    .limit(200)

  const tasks = (data ?? []) as Task[]

  return (
    <main className="px-4 lg:px-7 py-6 pb-24">
      <TaskList initialTasks={tasks} userId={user.id} />
    </main>
  )
}
