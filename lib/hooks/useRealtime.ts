'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Task } from '@/types'

type RealtimeTaskPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Task
  old: { id: string }
}

interface UseRealtimeOptions {
  projectId: string | null
  currentUserId: string
  onInsert?: (task: Task) => void
  onUpdate?: (task: Task) => void
  onDelete?: (id: string) => void
}

export function useRealtime({
  projectId,
  currentUserId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!projectId) return

    const supabase = createClient()
    const channel = supabase.channel(`project:${projectId}:tasks`)

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const task = payload.new as Task
          // Only show toast for other users' actions
          if (task.created_by !== currentUserId) {
            toast(`New task added: "${task.title}"`, { duration: 3000 })
          }
          onInsert?.(task)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const task = payload.new as Task
          const old = payload.old as Partial<Task>
          if (task.created_by !== currentUserId) {
            // Describe what changed
            if (old.column_id !== task.column_id) {
              toast(`Task moved: "${task.title}"`, { duration: 3000 })
            } else if (old.status !== task.status && task.status === 'done') {
              toast(`"${task.title}" marked done`, { duration: 3000 })
            }
          }
          onUpdate?.(task)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          // No project_id filter: DELETE payloads only include the primary key
          // (no REPLICA IDENTITY FULL), so a project_id filter would drop every event.
          // RLS already scopes which deletes this client receives.
        },
        (payload) => {
          const id = (payload.old as { id: string }).id
          onDelete?.(id)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps
}
