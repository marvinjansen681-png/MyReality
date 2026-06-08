import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export const metadata = {
  title: 'Privacy Policy — MyReality',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-base text-primary">
      <header className="border-b border-[var(--border)] px-4 h-14 flex items-center justify-between max-w-3xl mx-auto">
        <Logo href="/" markSize={32} size="sm" />
        <Link href="/login" className="text-sm text-secondary hover:text-primary transition-colors">Sign In</Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 pb-20 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary mb-2">Privacy Policy</h1>
          <p className="text-muted text-sm">Last updated: June 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">1. What data we collect</h2>
          <p className="text-secondary text-sm leading-relaxed">When you use MyReality, we collect:</p>
          <ul className="list-disc list-inside text-secondary text-sm space-y-1.5 ml-2">
            <li>Your name and email address (provided at signup)</li>
            <li>Task data, vision board content, planner entries, and project information you create</li>
            <li>Your workspace name and team members you invite</li>
            <li>Profile avatar and workspace logo images you upload</li>
            <li>Usage activity logs (which tasks were updated, moved, or completed)</li>
          </ul>
          <p className="text-secondary text-sm leading-relaxed">
            We do not collect payment information, device identifiers, or any sensitive personal data beyond what you explicitly enter.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">2. How your data is stored</h2>
          <p className="text-secondary text-sm leading-relaxed">
            All data is stored securely on Supabase (PostgreSQL) with Row Level Security — you can only access your own data. Images are stored in Supabase Storage. All communication is encrypted via HTTPS/TLS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">3. How we use your data</h2>
          <p className="text-secondary text-sm leading-relaxed">
            We use your data solely to provide the MyReality service. We do not sell your data, use it for advertising, or share it with third parties except Supabase (database) and Resend (email).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">4. Your rights</h2>
          <ul className="list-disc list-inside text-secondary text-sm space-y-1.5 ml-2">
            <li><strong className="text-primary">Access:</strong> View all your data within the app at any time.</li>
            <li><strong className="text-primary">Correction:</strong> Update your profile in Settings.</li>
            <li><strong className="text-primary">Deletion:</strong> Contact us to permanently delete your account and all data within 30 days.</li>
            <li><strong className="text-primary">Export:</strong> Contact us to request a data export in a portable format.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">5. Data retention</h2>
          <p className="text-secondary text-sm leading-relaxed">
            We retain your data while your account is active. Deleting your account permanently removes all personal data, tasks, visions, and uploaded files.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">6. Cookies and local storage</h2>
          <p className="text-secondary text-sm leading-relaxed">
            MyReality uses cookies to manage your authentication session via Supabase Auth, and localStorage for UI preferences (sidebar state, recent navigation). No third-party tracking cookies are used.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">7. Contact</h2>
          <p className="text-secondary text-sm leading-relaxed">
            For privacy questions or data requests, contact:
          </p>
          <a href="mailto:marvinjansen681@gmail.com" className="text-gold hover:text-gold-light transition-colors text-sm">
            marvinjansen681@gmail.com
          </a>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-6 px-4 text-center">
        <p className="text-xs text-muted">© 2026 MyReality · <Link href="/" className="hover:text-secondary transition-colors">Home</Link></p>
      </footer>
    </div>
  )
}
