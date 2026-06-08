import Link from 'next/link'
import { MailCheck } from 'lucide-react'

export const metadata = { title: 'Check your email — MyReality' }

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--gold-muted)] flex items-center justify-center">
            <MailCheck size={32} className="text-gold" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-primary mb-2">Check your email</h1>
        <p className="text-secondary text-sm leading-relaxed mb-8">
          We&apos;ve sent a confirmation link to your inbox. Click it to activate your account and get started.
        </p>
        <p className="text-muted text-xs mb-6">
          Didn&apos;t receive it? Check your spam folder or{' '}
          <Link href="/signup" className="text-gold hover:text-gold-light transition-colors">
            try again
          </Link>
          .
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 border border-[var(--border)] text-primary rounded-md text-sm hover:bg-hover transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
