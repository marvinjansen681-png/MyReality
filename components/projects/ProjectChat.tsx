'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Send, Loader2, Trash2, Pencil, X as XIcon, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { fetchProfilesByIds } from '@/lib/utils/profiles'
import { parseMentions } from '@/lib/utils/mentions'
import { canSendProjectChatMessage, canDeleteAnyProjectChatMessage } from '@/lib/permissions/projectPermissions'
import EmptyState from '@/components/shared/EmptyState'
import { MessageSquare } from 'lucide-react'
import type { ProjectChatMessage, Profile, ProjectRole } from '@/types'

const PAGE_SIZE = 100

interface ProjectChatProps {
  projectId: string
  userId: string
  userProfile: Profile | null
  projectRole: ProjectRole | null
  profileMap: Record<string, Profile>
  activeMemberIds: Set<string>
}

function personLabel(profileMap: Record<string, Profile>, id: string): string {
  return profileMap[id]?.full_name ?? profileMap[id]?.email ?? 'Unknown user'
}

function initialsOf(profileMap: Record<string, Profile>, id: string): string {
  const label = personLabel(profileMap, id)
  return label.charAt(0).toUpperCase()
}

export default function ProjectChat({ projectId, userId, userProfile, projectRole, profileMap, activeMemberIds }: ProjectChatProps) {
  const [messages, setMessages] = useState<ProjectChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const senderMapRef = useRef<Record<string, Profile>>({})

  const canSend = canSendProjectChatMessage(projectRole)
  const canDeleteAny = canDeleteAnyProjectChatMessage(projectRole)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('project_chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(PAGE_SIZE)
    const rows = (data ?? []) as ProjectChatMessage[]
    setMessages(rows)
    const senders = await fetchProfilesByIds(supabase, rows.map(m => m.sender_id))
    senderMapRef.current = { ...senderMapRef.current, ...senders }
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50)
  }, [projectId])

  useEffect(() => { load() }, [load])

  // Realtime: new/edited/deleted messages appear without a refresh.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project:${projectId}:chat`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_chat_messages', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const row = payload.new as ProjectChatMessage
          if (!senderMapRef.current[row.sender_id]) {
            const p = await fetchProfilesByIds(supabase, [row.sender_id])
            senderMapRef.current = { ...senderMapRef.current, ...p }
          }
          setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'project_chat_messages', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const row = payload.new as ProjectChatMessage
          setMessages(prev => prev.map(m => m.id === row.id ? row : m))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  async function handleSend() {
    const content = text.trim()
    if (!content || !canSend) return
    setSending(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_chat_messages')
      .insert({ project_id: projectId, content })
      .select('*')
      .single()
    setSending(false)
    if (error) { toast.error('Failed to send message', { description: error.message }); return }
    const inserted = data as ProjectChatMessage
    setMessages(prev => prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted])
    setText('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    // Mentions: candidates are active project members only. The RPC
    // independently re-validates membership server-side.
    const candidates = Array.from(activeMemberIds).map(id => profileMap[id]).filter((p): p is Profile => !!p)
    const mentionedIds = parseMentions(content, candidates)
    if (mentionedIds.length > 0) {
      await supabase.rpc('create_chat_mention_notifications', { message_id_input: inserted.id, mentioned_user_ids: mentionedIds })
    }
  }

  function startEdit(message: ProjectChatMessage) {
    setEditingId(message.id)
    setEditingText(message.content)
  }

  async function saveEdit() {
    if (!editingId) return
    const content = editingText.trim()
    if (!content) { toast.error('Message cannot be empty'); return }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_chat_messages')
      .update({ content })
      .eq('id', editingId)
      .select('*')
      .single()
    if (error) { toast.error('Failed to edit message', { description: error.message }); return }
    setMessages(prev => prev.map(m => m.id === editingId ? (data as ProjectChatMessage) : m))
    setEditingId(null)
    setEditingText('')
  }

  async function deleteMessage(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_chat_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) { toast.error('Failed to delete message', { description: error.message }); return }
    setMessages(prev => prev.map(m => m.id === id ? (data as ProjectChatMessage) : m))
  }

  const profiles = { ...profileMap, ...senderMapRef.current }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="text-muted animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No messages yet" description="Say hello, or ask a quick question about the project." />
        ) : (
          messages.map(m => {
            const isMine = m.sender_id === userId
            const isDeleted = !!m.deleted_at
            const canDeleteThis = isMine || canDeleteAny
            const isEditing = editingId === m.id
            return (
              <div key={m.id} className="flex gap-2.5 group px-1">
                <div className="w-7 h-7 rounded-full bg-hover flex items-center justify-center text-xs font-semibold text-secondary flex-shrink-0">
                  {initialsOf(profiles, m.sender_id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-primary">{personLabel(profiles, m.sender_id)}</span>
                    <span className="text-[10px] text-muted">{formatDistanceToNow(parseISO(m.created_at), { addSuffix: true })}</span>
                    {m.edited_at && !isDeleted && <span className="text-[10px] text-muted">(edited)</span>}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                        autoFocus
                        className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-focus)] rounded-md px-2.5 py-1.5 text-sm text-primary focus:outline-none"
                      />
                      <button onClick={saveEdit} className="text-green hover:bg-hover p-1.5 rounded-md transition-colors"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="text-muted hover:bg-hover p-1.5 rounded-md transition-colors"><XIcon size={14} /></button>
                    </div>
                  ) : (
                    <p className={cn('text-sm leading-relaxed mt-0.5', isDeleted ? 'text-muted italic' : 'text-secondary')}>
                      {isDeleted ? 'Message deleted' : m.content}
                    </p>
                  )}
                </div>
                {!isDeleted && !isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1 flex-shrink-0">
                    {isMine && (
                      <button onClick={() => startEdit(m)} className="text-muted hover:text-primary p-1.5 rounded-md hover:bg-hover transition-colors">
                        <Pencil size={12} />
                      </button>
                    )}
                    {canDeleteThis && (
                      <button onClick={() => deleteMessage(m.id)} className="text-muted hover:text-red p-1.5 rounded-md hover:bg-hover transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-[var(--border)] pt-3">
        <p className="text-[11px] text-muted mb-2">
          Use chat for quick project communication. Create or update tasks for actual work that must be tracked.
        </p>
        {canSend ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-hover flex items-center justify-center text-xs font-semibold text-secondary flex-shrink-0">
              {userProfile?.full_name?.charAt(0) ?? '?'}
            </div>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Message the project... (@name to mention)"
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full px-4 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-8 h-8 flex items-center justify-center bg-gold text-black rounded-full disabled:opacity-40 hover:bg-gold-light transition-colors flex-shrink-0"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted">You have read-only access to this project&apos;s chat.</p>
        )}
      </div>
    </div>
  )
}

// TODO (Step 21I): "Create task from message" quick action — deferred per
// the brief's own instruction to only build it if quick and safe; wiring it
// correctly (which column/goal, permission checks, avoiding duplicate
// tasks) is more than a one-line addition.
