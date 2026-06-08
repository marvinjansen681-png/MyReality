import Link from 'next/link'
import { CheckCircle2, LayoutGrid, Sparkles, Calendar, Users, Bell, ArrowRight, Star } from 'lucide-react'

export const metadata = {
  title: 'MyReality — Build your life. Lead your team.',
  description: 'Personal productivity and team management platform. Vision boards, weekly planning, project boards, and team collaboration — all in one place.',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Vision Board',
    description: 'Set and visualise goals across every area of life — Faith, Business, Finance, Family, Health, and Personal.',
  },
  {
    icon: Calendar,
    title: 'Weekly Planner',
    description: 'Plan your week day-by-day with drag-and-drop items, time slots, and a weekly intention field.',
  },
  {
    icon: CheckCircle2,
    title: 'Task Tracker',
    description: 'Capture personal tasks with priorities, due dates, subtasks, and a rich text editor.',
  },
  {
    icon: LayoutGrid,
    title: 'Project Boards',
    description: 'Kanban boards for team projects with drag-and-drop columns, task cards, and real-time collaboration.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Invite team members, assign roles, and manage who has access to what — all from one place.',
  },
  {
    icon: Bell,
    title: 'Real-time Notifications',
    description: 'Stay in the loop with live updates when teammates assign tasks, leave comments, or move cards.',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Create your workspace',
    description: 'Sign up and set up your personal workspace in under 60 seconds. No credit card required.',
  },
  {
    number: '02',
    title: 'Build your vision',
    description: 'Add your goals and visions. Upload images, set target dates, and organise by life category.',
  },
  {
    number: '03',
    title: 'Plan and execute',
    description: 'Use the weekly planner and task tracker to turn visions into daily action. Invite your team when ready.',
  },
]

const TESTIMONIALS = [
  {
    body: 'MyReality is the only app I\'ve found that combines personal goal-setting with real team project management. It\'s exactly what I needed.',
    author: 'Sarah K.',
    role: 'Founder, Creative Agency',
  },
  {
    body: 'The vision board feature changed how I think about my goals. Being able to see everything — Faith, Business, Family — in one place is powerful.',
    author: 'Marcus T.',
    role: 'Entrepreneur',
  },
  {
    body: 'We replaced three separate tools with MyReality. Our team collaboration has never been smoother.',
    author: 'Priya M.',
    role: 'Head of Operations',
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <header className="sticky top-0 z-40 bg-base/80 backdrop-blur border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-display font-bold text-gold text-xl">MyReality</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-secondary hover:text-primary transition-colors px-3 py-2 min-h-[44px] flex items-center"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-gold text-black px-4 py-2 rounded-md hover:bg-gold-light transition-colors min-h-[44px] flex items-center"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-24 px-4 text-center">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[var(--gold-muted)] border border-[var(--gold)]/30 text-gold text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Star size={11} fill="currentColor" />
          Personal productivity meets team management
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary leading-tight mb-6">
          Build your life.
          <br />
          <span className="text-gold">Lead your team.</span>
        </h1>

        <p className="text-secondary text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
          MyReality is the all-in-one platform for ambitious people who want to grow personally and lead teams effectively — in one beautiful workspace.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 min-h-[52px] px-8 py-3 bg-gold text-black text-base font-bold rounded-lg hover:bg-gold-light transition-colors"
          >
            Start for free
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[52px] px-8 py-3 border border-[var(--border)] text-primary text-base rounded-lg hover:bg-hover transition-colors"
          >
            Sign In
          </Link>
        </div>

        <p className="text-muted text-xs mt-4">No credit card required · Free to get started</p>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-primary mb-3">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-secondary text-lg max-w-xl mx-auto">
            Six powerful modules that work together to help you grow and lead.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-card border border-[var(--border)] rounded-xl p-5 hover:border-gold/40 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-[var(--gold-muted)] flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
                <Icon size={18} className="text-gold" />
              </div>
              <h3 className="font-semibold text-primary mb-2">{title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-primary mb-3">
            Up and running in minutes
          </h2>
          <p className="text-secondary text-lg">
            Three steps to transforming how you work and live.
          </p>
        </div>

        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
          {STEPS.map(({ number, title, description }, i) => (
            <div key={number} className="relative flex items-start lg:flex-col gap-5 lg:gap-4">
              {/* Connector line (desktop) */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-5 left-[calc(50%+2rem)] right-[-calc(50%-2rem)] h-px bg-[var(--border)]" />
              )}

              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--gold-muted)] border border-[var(--gold)]/30 flex items-center justify-center">
                <span className="font-display font-bold text-gold text-sm">{number}</span>
              </div>

              <div>
                <h3 className="font-semibold text-primary mb-1.5">{title}</h3>
                <p className="text-sm text-secondary leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-primary mb-3">
            Built for people who mean business
          </h2>
          <p className="text-secondary text-lg">
            From solopreneurs to growing teams — MyReality adapts to you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map(({ body, author, role }) => (
            <div key={author} className="bg-card border border-[var(--border)] rounded-xl p-5">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} className="text-gold fill-gold" />
                ))}
              </div>
              <p className="text-sm text-secondary leading-relaxed mb-4">&ldquo;{body}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold text-primary">{author}</p>
                <p className="text-xs text-muted">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-24 px-4 text-center">
      <div className="max-w-2xl mx-auto">
        {/* Gold glow */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-4">
              Ready to build your reality?
            </h2>
            <p className="text-secondary text-lg mb-10">
              Join thousands of ambitious people using MyReality to close the gap between who they are and who they want to be.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 min-h-[52px] px-8 py-3 bg-gold text-black text-base font-bold rounded-lg hover:bg-gold-light transition-colors"
              >
                Create your workspace
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center min-h-[52px] px-8 py-3 border border-[var(--border)] text-primary text-base rounded-lg hover:bg-hover transition-colors"
              >
                Already have an account?
              </Link>
            </div>
            <p className="text-muted text-xs mt-4">Free to start · No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-display font-bold text-gold text-lg">MyReality</span>
        <p className="text-xs text-muted text-center">
          Build your life. Lead your team.
        </p>
        <div className="flex items-center gap-4 text-xs text-muted">
          <Link href="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link>
          <Link href="/login" className="hover:text-secondary transition-colors">Sign In</Link>
          <Link href="/signup" className="hover:text-secondary transition-colors">Sign Up</Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-base text-primary">
      <NavBar />
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}
