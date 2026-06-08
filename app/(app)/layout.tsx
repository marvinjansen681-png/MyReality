import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import AppShell from '@/components/layout/AppShell'
import CreateWorkspaceModal from '@/components/auth/CreateWorkspaceModal'
import type { Workspace, Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: workspaceMember }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle(),
  ])

  const workspace = (workspaceMember?.workspaces as unknown as Workspace) ?? null

  return (
    <AppShell>
      <div className="flex h-screen bg-base overflow-hidden">
        <Sidebar workspace={workspace} />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header profile={profile as Profile | null} />

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>

        <CreateWorkspaceModal />
      </div>
    </AppShell>
  )
}
