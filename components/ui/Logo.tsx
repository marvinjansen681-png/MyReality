'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

// ─── Shared SVG defs ──────────────────────────────────────────────────────────
// The icon mark: diamond geometry + M monogram, gold gradient

interface MarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 40, className }: MarkProps) {
  const id = `gold-${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`bg-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1710" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <linearGradient id={`g-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8c97a" />
          <stop offset="50%" stopColor="#c9a84c" />
          <stop offset="100%" stopColor="#a07830" />
        </linearGradient>
        <filter id={`glow-${id}`}>
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="40" cy="40" r="40" fill={`url(#bg-${id})`} />

      {/* Outer ring */}
      <circle cx="40" cy="40" r="36" fill="none" stroke={`url(#g-${id})`} strokeWidth="0.5" opacity="0.3" />

      {/* Diamond */}
      <polygon
        points="40,10 66,36 40,62 14,36"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="1"
        opacity="0.45"
      />
      {/* Inner diamond */}
      <polygon
        points="40,18 58,36 40,54 22,36"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="0.5"
        opacity="0.2"
      />

      {/* M mark */}
      <path
        d="M27,48 L27,26 L40,38 L53,26 L53,48"
        fill="none"
        stroke={`url(#g-${id})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#glow-${id})`}
      />

      {/* Base line */}
      <line
        x1="22" y1="48" x2="58" y2="48"
        stroke={`url(#g-${id})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Corner dots */}
      <circle cx="40" cy="10" r="1.5" fill={`url(#g-${id})`} opacity="0.8" />
      <circle cx="66" cy="36" r="1.5" fill={`url(#g-${id})`} opacity="0.8" />
      <circle cx="40" cy="62" r="1.5" fill={`url(#g-${id})`} opacity="0.8" />
      <circle cx="14" cy="36" r="1.5" fill={`url(#g-${id})`} opacity="0.8" />
    </svg>
  )
}

// ─── Horizontal lockup: mark + wordmark ───────────────────────────────────────

interface LogoProps {
  href?: string
  markSize?: number
  className?: string
  /** 'sm' reduces wordmark size for tight spaces */
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ href = '/', markSize = 36, size = 'md', className }: LogoProps) {
  const wordmark = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={markSize} />
      <div className="flex flex-col leading-none">
        <span className={cn(
          'font-sans font-light tracking-[0.22em] text-[#a89f8c] uppercase',
          size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-[12px]' : 'text-[10px]'
        )}>
          My
        </span>
        <span className={cn(
          'font-display font-bold tracking-wide bg-gradient-to-r from-[#e8c97a] via-[#c9a84c] to-[#d4b060] bg-clip-text text-transparent',
          size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-[19px]'
        )}>
          Reality
        </span>
      </div>
    </div>
  )

  if (!href) return wordmark
  return <Link href={href}>{wordmark}</Link>
}

// ─── Stacked wordmark (auth pages, splash) ────────────────────────────────────

interface StackedLogoProps {
  markSize?: number
  showTagline?: boolean
  className?: string
}

export function LogoStacked({ markSize = 72, showTagline = false, className }: StackedLogoProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <LogoMark size={markSize} />
      <div className="text-center">
        <p className="font-sans font-light tracking-[0.35em] text-[#7a7060] uppercase text-[9px] mb-1">My</p>
        <p className="font-display font-bold tracking-[0.1em] text-[28px] bg-gradient-to-r from-[#e8c97a] via-[#c9a84c] to-[#d4b060] bg-clip-text text-transparent leading-none">
          Reality
        </p>
        {showTagline && (
          <>
            <div className="w-14 h-px bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent mx-auto mt-2.5 mb-2" />
            <p className="font-sans text-[8px] tracking-[0.3em] text-[#5a5248] uppercase">Build Your Life</p>
          </>
        )}
      </div>
    </div>
  )
}
