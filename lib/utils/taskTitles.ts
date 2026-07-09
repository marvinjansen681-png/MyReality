import { createClient } from '@/lib/supabase/client'

type SupabaseClient = ReturnType<typeof createClient>

// Mirrors fetchProfilesByIds — a plain, separate query rather than a
// PostgREST embed, since audit_events rows for task_assignees only carry
// task_id, not the task's title.
export async function fetchTaskTitlesByIds(
  supabase: SupabaseClient,
  ids: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)))
  if (uniqueIds.length === 0) return {}

  const { data } = await supabase.from('tasks').select('id, title').in('id', uniqueIds)
  const map: Record<string, string> = {}
  for (const row of (data ?? []) as { id: string; title: string }[]) {
    map[row.id] = row.title
  }
  return map
}
