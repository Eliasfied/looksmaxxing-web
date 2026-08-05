import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { QuizClient } from './quiz-client'

export default async function OnboardingQuizPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return <QuizClient />
}
