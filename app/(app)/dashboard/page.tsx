import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard — MyReality' }

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <main className="px-4 lg:px-7 py-8">
      <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary mb-2">
        Hey, {firstName}
      </h1>
      <p className="text-secondary text-sm">
        Dashboard — full version coming in Step 6
      </p>
    </main>
  )
}
