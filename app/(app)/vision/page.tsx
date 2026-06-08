import { createClient } from '@/lib/supabase/server'
import VisionBoard from '@/components/vision/VisionBoard'
import type { Vision } from '@/types'

export const metadata = { title: 'Vision Board — MyReality' }

export default async function VisionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get workspace for context
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  const { data } = await supabase
    .from('visions')
    .select('*')
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  const visions = (data ?? []) as Vision[]

  return (
    <main className="px-4 lg:px-7 py-6 pb-16">
      <VisionBoard
        initialVisions={visions}
        userId={user.id}
        workspaceId={member?.workspace_id ?? null}
      />
    </main>
  )
}
