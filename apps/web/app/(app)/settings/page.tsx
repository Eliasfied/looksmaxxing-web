import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCredits } from '@/lib/supabase/credits'
import { Zap, CreditCard, RotateCcw, Gift, RefreshCw, Sparkles } from 'lucide-react'
import { CancelSubscriptionButton } from '@/components/cancel-subscription-button'
import { appConfig } from '@/lib/config'

const TRANSACTION_ICONS: Record<string, React.ReactNode> = {
  generation_used: <Sparkles className="h-4 w-4 text-purple-400" />,
  subscription_grant: <Zap className="h-4 w-4 text-yellow-400" />,
  subscription_reset: <RefreshCw className="h-4 w-4 text-blue-400" />,
  topup_purchase: <CreditCard className="h-4 w-4 text-green-400" />,
  bonus: <Gift className="h-4 w-4 text-pink-400" />,
  refund: <RotateCcw className="h-4 w-4 text-orange-400" />,
}

const TRANSACTION_LABELS: Record<string, string> = {
  subscription_grant: 'Subscription grant',
  subscription_reset: 'Subscription reset',
  topup_purchase: 'Credit pack purchased',
  generation_used: 'Generation used',
  bonus: 'Welcome bonus',
  refund: 'Refund',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRenewal(iso: string | null) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [balance, { data: transactions }, { data: subscription }] = await Promise.all([
    getCredits(user.id),
    supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('subscriptions')
      .select('*, plans(name, monthly_credits)')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const displayName = user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'there'
  const plan = (subscription as any)?.plans
  const renewalDate = (subscription as any)?.current_period_end ?? null

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-[#888888]">{user.email}</p>
      </div>

      {/* Credit stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#222222] bg-black p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-wider text-[#666666]">Total Credits</p>
          <p className="text-3xl font-bold text-white">{balance.total_credits.toLocaleString()}</p>
          <Link
            href="/pricing?tab=credits"
            className="btn-gradient mt-auto flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            <Zap className="h-3 w-3" />
            Buy Credits
          </Link>
        </div>
        <div className="rounded-xl border border-[#222222] bg-black p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-[#666666]">Subscription</p>
          <p className="text-3xl font-bold text-white">{balance.subscription_credits.toLocaleString()}</p>
          <p className="mt-2 text-xs text-[#666666]">Resets each billing period</p>
        </div>
        <div className="rounded-xl border border-[#222222] bg-black p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-[#666666]">Top-up</p>
          <p className="text-3xl font-bold text-white">{balance.topup_credits.toLocaleString()}</p>
          <p className="mt-2 text-xs text-[#666666]">Never expire</p>
        </div>
      </div>

      {/* Subscription info */}
      <div className="rounded-xl border border-[#222222] bg-black p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#666666] mb-1">Current Plan</p>
            <p className="text-xl font-bold text-white">
              {plan ? plan.name : 'Free'}
            </p>
            {plan && (
              <p className="mt-1 text-sm text-[#888888]">
                {plan.monthly_credits?.toLocaleString()} credits / month
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-wider text-[#666666] mb-1">Credits renew</p>
            <p className="text-sm font-medium text-white">{formatRenewal(renewalDate)}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/pricing"
          className="btn-gradient flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Zap className="h-4 w-4" />
          Upgrade Plan
        </Link>
        <CancelSubscriptionButton />
        <a
          href={`mailto:${appConfig.brand.supportEmail}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#333333] bg-black py-3 text-sm font-medium text-[#888888] transition-colors hover:border-[#555555] hover:text-white"
        >
          <CreditCard className="h-4 w-4" />
          Contact Support
        </a>
      </div>

      {/* Recent transactions */}
      <div className="overflow-hidden rounded-xl border border-[#222222] bg-black">
        <div className="border-b border-[#222222] px-5 py-4">
          <h2 className="font-semibold text-white">Recent Transactions</h2>
        </div>
        {!transactions?.length ? (
          <div className="px-5 py-8 text-center text-sm text-[#666666]">
            No transactions yet.
          </div>
        ) : (
          <div className="divide-y divide-[#222222]">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  {TRANSACTION_ICONS[tx.type] ?? <Zap className="h-4 w-4 text-[#888888]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {tx.description ?? TRANSACTION_LABELS[tx.type] ?? tx.type}
                  </p>
                  <p className="text-xs text-[#666666]">{formatDate(tx.created_at)}</p>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-[#666666]'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account */}
      <div className="rounded-xl border border-[#222222] bg-black p-6">
        <h2 className="mb-4 font-semibold text-white">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#666666]">Name</span>
            <span className="text-sm text-white">{displayName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#666666]">Email</span>
            <span className="text-sm text-white">{user.email}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-xs uppercase tracking-wider text-[#666666]">User ID</span>
            <span className="break-all font-mono text-xs text-[#666666]">{user.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
