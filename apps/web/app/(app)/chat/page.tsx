import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getLatestScan } from '@/lib/firebase/scans'
import { ChatClient } from './chat-client'

export default async function ChatPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const latestScan = await getLatestScan(user.id)

  return <ChatClient hasScan={latestScan !== null} />
}
