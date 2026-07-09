import type { Profile } from '@/types'

// Deliberately simple: match "@token" (word chars, dot, plus, hyphen — enough
// for email local-parts and single-word names) against the local-part of a
// candidate's email or the first word of their full name. No rich-text
// editor, no fuzzy matching. Server-side (create_mention_notifications RPC)
// re-validates every match against active project membership regardless.
export function parseMentions(text: string, candidates: Profile[]): string[] {
  const tokens = Array.from(text.matchAll(/@([\w.+-]+)/g)).map(m => m[1].toLowerCase())
  if (tokens.length === 0) return []

  const matched = new Set<string>()
  for (const token of tokens) {
    for (const candidate of candidates) {
      const emailLocal = candidate.email?.split('@')[0]?.toLowerCase()
      const firstName = candidate.full_name?.trim().split(/\s+/)[0]?.toLowerCase()
      if (emailLocal === token || firstName === token) {
        matched.add(candidate.id)
        break
      }
    }
  }
  return Array.from(matched)
}
