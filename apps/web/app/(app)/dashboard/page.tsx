import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // TODO: Replace with your dashboard content
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">Welcome to your Dashboard</h1>
        <p className="text-[#888888]">Add your tool or dashboard content here.</p>
      </div>
    </div>
  )
}
