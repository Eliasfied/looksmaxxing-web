import { appConfig } from '@/lib/config'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-4 overflow-hidden">
      {/* Background logo */}
      <div
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.06]"
        style={{ backgroundImage: "url('/logo.png')", backgroundSize: '60%' }}
      />
      {/* Gradient overlay to fade edges */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />

      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
        <footer className="mt-8 flex gap-5 text-xs text-white/40">
          <a href={`${appConfig.brand.marketingUrl}/privacy`} className="hover:text-white">Privacy</a>
          <a href={`${appConfig.brand.marketingUrl}/terms`} className="hover:text-white">Terms</a>
          <a href={`${appConfig.brand.marketingUrl}/impressum`} className="hover:text-white">Impressum</a>
        </footer>
      </div>
    </div>
  )
}
