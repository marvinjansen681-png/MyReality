import { createClient } from '@/lib/supabase/client'
import type { ActivityAction } from '@/types'

export async function logActivity(
  taskId: string,
  userId: string,
  action: ActivityAction,
  metadata: Record<string, unknown> = {}
) {
  const supabase = createClient()
  await supabase.from('task_activity').insert({
    task_id: taskId,
    user_id: userId,
    action,
    metadata,
  })
}

export async function insertNotification(params: {
  userId: string
  type: 'task_assigned' | 'task_commented' | 'task_due' | 'mention' | 'vision_due'
  title: string
  body: string
  link?: string
}) {
  const supabase = createClient()
  await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link ?? null,
    read: false,
  })
}
