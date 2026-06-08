import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-base flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <h1 className="font-display text-4xl lg:text-6xl font-bold text-gold mb-4">
          MyReality
        </h1>
        <p className="text-secondary text-lg mb-8">
          Build your life. Lead your team.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-gold text-[#0a0a0a] font-semibold rounded-md hover:bg-gold-light transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 border border-[var(--border)] text-primary rounded-md hover:bg-hover transition-colors"
          >
            Sign In
          </Link>
        </div>
        <p className="mt-8 text-muted text-sm">
          Landing page — full version coming in Step 16
        </p>
      </div>
    </main>
  )
}
