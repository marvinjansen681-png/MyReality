import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

type SupabaseClient = ReturnType<typeof createClient>

// The `profiles!<table>_<column>_fkey` embed syntax used to be tried
// elsewhere in this app, but it can never work here: those tables' user_id
// columns have a foreign key to auth.users, not to profiles, so PostgREST
// has no relationship to traverse under any hint name. This fetches
// profiles as a separate, plain query instead.
export async function fetchProfilesByIds(
  supabase: SupabaseClient,
  ids: (string | null | undefined)[]
): Promise<Record<string, Profile>> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)))
  if (uniqueIds.length === 0) return {}

  const { data } = await supabase.from('profiles').select('*').in('id', uniqueIds)
  const map: Record<string, Profile> = {}
  for (const profile of (data ?? []) as Profile[]) {
    map[profile.id] = profile
  }
  return map
}
