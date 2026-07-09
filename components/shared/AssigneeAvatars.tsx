import type { Profile } from '@/types'

interface AssigneeAvatarsProps {
  ids: string[]
  profileMap: Record<string, Profile>
  max?: number
}

export default function AssigneeAvatars({ ids, profileMap, max = 3 }: AssigneeAvatarsProps) {
  if (ids.length === 0) return null
  return (
    <div className="flex items-center -space-x-1.5">
      {ids.slice(0, max).map(uid => {
        const p = profileMap[uid]
        if (!p) return null
        const initials = (p.full_name ?? p.email ?? '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        return (
          <div
            key={uid}
            title={p.full_name ?? p.email ?? uid}
            className="w-5 h-5 rounded-full bg-[var(--gold-muted)] border border-[var(--bg-surface)] flex items-center justify-center text-[8px] font-bold text-gold overflow-hidden flex-shrink-0"
          >
            {p.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatar_url} alt={p.full_name ?? ''} className="w-full h-full object-cover" />
            ) : initials}
          </div>
        )
      })}
      {ids.length > max && (
        <div className="w-5 h-5 rounded-full bg-hover border border-[var(--bg-surface)] flex items-center justify-center text-[8px] text-muted flex-shrink-0">
          +{ids.length - max}
        </div>
      )}
    </div>
  )
}
