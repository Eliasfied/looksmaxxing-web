import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'

export default async function RootPage() {
  const user = await getSessionUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
