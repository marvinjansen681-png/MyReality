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

