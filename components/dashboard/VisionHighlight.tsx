import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Vision } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  Faith: 'text-purple bg-[var(--purple-muted)]',
  Business: 'text-gold bg-[var(--gold-muted)]',
  Finance: 'text-green bg-[var(--green-muted)]',
  Family: 'text-red bg-[var(--red-muted)]',
  Health: 'text-blue bg-[var(--blue-muted)]',
  Personal: 'text-secondary bg-hover',
}

interface VisionHighlightProps {
  vision: Vision | null
}

export default function VisionHighlight({ vision }: VisionHighlightProps) {
  if (!vision) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Sparkles size={28} className="text-muted mb-2" />
        <p className="text-sm text-secondary">No visions yet</p>
        <Link href="/vision" className="text-xs text-gold hover:text-gold-light transition-colors mt-1">
          Add your first vision →
        </Link>
      </div>
    )
  }

  return (
    <Link href="/vision" className="block group">
      <div className="relative rounded-md overflow-hidden bg-hover border border-[var(--border)] hover:border-gold transition-colors">
        {vision.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vision.image_url}
            alt={vision.title}
            className="w-full h-28 object-cover opacity-60 group-hover:opacity-80 transition-opacity"
          />
        )}
        <div className={cn('p-3', vision.image_url && 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent')}>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', CATEGORY_COLORS[vision.category])}>
              {vision.category}
            </span>
          </div>
          <p className={cn(
            'text-sm font-medium leading-snug',
            vision.image_url ? 'text-white' : 'text-primary'
          )}>
            {vision.title}
          </p>
          {vision.description && (
            <p className={cn(
              'text-xs mt-0.5 line-clamp-2',
              vision.image_url ? 'text-white/70' : 'text-secondary'
            )}>
              {vision.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
