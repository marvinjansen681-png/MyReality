import { createClient } from '@/lib/supabase/client'

type SupabaseClient = ReturnType<typeof createClient>

// Mirrors fetchTaskTitlesByIds — audit_events rows for goal-related entities
// only carry a goal id, not the goal's title.
export async function fetchGoalTitlesByIds(
  supabase: SupabaseClient,
  ids: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)))
  if (uniqueIds.length === 0) return {}

  const { data } = await supabase.from('project_goals').select('id, title').in('id', uniqueIds)
  const map: Record<string, string> = {}
  for (const row of (data ?? []) as { id: string; title: string }[]) {
    map[row.id] = row.title
  }
  return map
}
