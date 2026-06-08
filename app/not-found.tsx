import Link from 'next/link'

export const metadata = { title: '404 — MyReality' }

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-8xl font-bold text-gold/30 select-none">404</h1>
      <h2 className="font-display text-2xl font-bold text-primary mt-4">Page not found</h2>
      <p className="text-secondary text-sm mt-2 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3 mt-8">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-gold text-[#0a0a0a] font-semibold rounded-md text-sm hover:bg-gold-light transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="px-5 py-2.5 border border-[var(--border)] text-primary rounded-md text-sm hover:bg-hover transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  )
}
