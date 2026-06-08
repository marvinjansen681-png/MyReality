'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { User, Building2, Bell, Loader2, Check, Upload, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { Profile, Workspace } from '@/types'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(80),
})
type ProfileForm = z.infer<typeof profileSchema>

const workspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(80),
})
type WorkspaceForm = z.infer<typeof workspaceSchema>

interface NotifPrefs {
  task_assigned: boolean
  task_commented: boolean
  task_due: boolean
  mention: boolean
  vision_due: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  task_assigned: true,
  task_commented: true,
  task_due: true,
  mention: true,
  vision_due: true,
}

const NOTIF_ITEMS: { key: keyof NotifPrefs; label: string; description: string }[] = [
  { key: 'task_assigned',  label: 'Task assigned to me',    description: 'When someone assigns a task to you in a project' },
  { key: 'task_commented', label: 'Comments on my tasks',   description: 'When someone leaves a comment on a task you own' },
  { key: 'task_due',       label: 'Upcoming due dates',     description: 'Reminders when tasks are approaching their due date' },
  { key: 'mention',        label: 'Mentions',               description: 'When someone @-mentions you in a comment' },
  { key: 'vision_due',     label: 'Vision goal reminders',  description: 'Nudges for vision goals with approaching target dates' },
]

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, description, children, danger = false }: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card border rounded-xl p-5 lg:p-6',
        danger ? 'border-red/30' : 'border-[var(--border)]'
      )}
    >
      <div className="flex items-start gap-3 mb-5">
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
          danger ? 'bg-red/10' : 'bg-[var(--gold-muted)]'
        )}>
          <Icon size={17} className={danger ? 'text-red' : 'text-gold'} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-primary">{title}</h2>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  )
}

// ─── Image uploader ───────────────────────────────────────────────────────────

function ImageUploader({
  current,
  bucket,
  storagePath,
  onUploaded,
  label,
  shape = 'circle',
}: {
  current: string | null | undefined
  bucket: string
  storagePath: string
  onUploaded: (url: string) => void
  label: string
  shape?: 'circle' | 'square'
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }

    const ext = file.name.split('.').pop()
    const path = `${storagePath}.${ext}`

    setUploading(true)
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    onUploaded(`${publicUrl}?t=${Date.now()}`)
    setUploading(false)
    toast.success(`${label} updated`)
  }

  return (
    <div className="flex items-center gap-4 mb-5">
      <div className={cn(
        'relative w-16 h-16 bg-[var(--gold-muted)] flex items-center justify-center overflow-hidden flex-shrink-0 border border-[var(--border)]',
        shape === 'circle' ? 'rounded-full' : 'rounded-xl'
      )}>
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={label} className="w-full h-full object-cover" />
        ) : (
          <User size={24} className="text-gold" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 size={16} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-md text-sm text-secondary hover:bg-hover hover:text-primary transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : `Change ${label}`}
        </button>
        <p className="text-[11px] text-muted mt-1.5">JPG, PNG or WebP · Max 5 MB</p>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        'relative w-10 h-6 rounded-full flex-shrink-0 transition-colors duration-200 focus:outline-none',
        on ? 'bg-gold' : 'bg-[var(--border)]'
      )}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm', on ? 'left-5' : 'left-1')}
      />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [savingWorkspace, setSavingWorkspace] = useState(false)
  const [savedWorkspace, setSavedWorkspace] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: '' },
  })

  const workspaceForm = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: prof }, { data: memberRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('workspace_members')
        .select('role, workspace_id, workspaces(*)')
        .eq('user_id', user.id)
        .single(),
    ])

    if (prof) {
      const p = prof as Profile & { notif_prefs?: NotifPrefs }
      setProfile(p)
      setAvatarUrl(p.avatar_url ?? null)
      profileForm.reset({ full_name: p.full_name ?? '' })
      if (p.notif_prefs) setNotifPrefs({ ...DEFAULT_PREFS, ...p.notif_prefs })
    }

    if (memberRow) {
      const ws = memberRow.workspaces as unknown as Workspace
      setWorkspaceId(memberRow.workspace_id)
      setIsOwner(memberRow.role === 'owner')
      setLogoUrl(ws?.logo_url ?? null)
      workspaceForm.reset({ name: ws?.name ?? '' })
    }
  }

  async function saveProfile(data: ProfileForm) {
    if (!userId) return
    setSavingProfile(true)
    const supabase = createClient()
    const updates: Partial<Profile> = { full_name: data.full_name }
    if (avatarUrl) updates.avatar_url = avatarUrl
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    setSavingProfile(false)
    if (error) { toast.error('Failed to save profile'); return }
    toast.success('Profile saved')
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 2000)
  }

  async function saveWorkspace(data: WorkspaceForm) {
    if (!workspaceId) return
    setSavingWorkspace(true)
    const supabase = createClient()
    const updates: Record<string, string> = { name: data.name }
    if (logoUrl) updates.logo_url = logoUrl
    const { error } = await supabase.from('workspaces').update(updates).eq('id', workspaceId)
    setSavingWorkspace(false)
    if (error) { toast.error('Failed to save workspace'); return }
    toast.success('Workspace updated')
    setSavedWorkspace(true)
    setTimeout(() => setSavedWorkspace(false), 2000)
  }

  async function toggleNotifPref(key: keyof NotifPrefs) {
    if (!userId) return
    const next = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(next)
    const supabase = createClient()
    await supabase.from('profiles').update({ notif_prefs: next } as never).eq('id', userId)
  }

  return (
    <div className="px-4 lg:px-7 py-8 max-w-2xl mx-auto pb-24">
      <div className="mb-7">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary">Settings</h1>
        <p className="text-secondary text-sm mt-1">Manage your account, workspace, and preferences</p>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <Section icon={User} title="Profile" description="Update your name and profile picture">
          <ImageUploader
            current={avatarUrl}
            bucket="avatars"
            storagePath={`${userId}/avatar`}
            onUploaded={(url) => {
              setAvatarUrl(url)
              if (userId) createClient().from('profiles').update({ avatar_url: url }).eq('id', userId)
            }}
            label="Avatar"
            shape="circle"
          />

          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Full name</label>
              <input
                {...profileForm.register('full_name')}
                type="text"
                placeholder="Your name"
                className={cn(
                  'w-full bg-[var(--bg-surface)] border rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors',
                  profileForm.formState.errors.full_name ? 'border-red' : 'border-[var(--border)]'
                )}
              />
              {profileForm.formState.errors.full_name && (
                <p className="text-xs text-red mt-1">{profileForm.formState.errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1.5">Email address</label>
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full bg-hover border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-muted cursor-not-allowed"
              />
              <p className="text-[11px] text-muted mt-1">Email cannot be changed here</p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {savingProfile && <Loader2 size={14} className="animate-spin" />}
                {savedProfile && <Check size={14} />}
                {savedProfile ? 'Saved' : 'Save Profile'}
              </button>
            </div>
          </form>
        </Section>

        {/* Workspace */}
        <Section icon={Building2} title="Workspace" description="Update your workspace name and logo">
          {!isOwner && (
            <div className="mb-4 px-3 py-2.5 bg-hover rounded-md text-xs text-muted border border-[var(--border)]">
              Only the workspace owner can edit workspace settings.
            </div>
          )}

          <ImageUploader
            current={logoUrl}
            bucket="workspace-logos"
            storagePath={`${workspaceId}/logo`}
            onUploaded={(url) => {
              setLogoUrl(url)
              if (workspaceId) createClient().from('workspaces').update({ logo_url: url }).eq('id', workspaceId)
            }}
            label="Logo"
            shape="square"
          />

          <form onSubmit={workspaceForm.handleSubmit(saveWorkspace)} className="space-y-4">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Workspace name</label>
              <input
                {...workspaceForm.register('name')}
                type="text"
                placeholder="Your workspace"
                disabled={!isOwner}
                className={cn(
                  'w-full bg-[var(--bg-surface)] border rounded-md px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[var(--border-focus)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  workspaceForm.formState.errors.name ? 'border-red' : 'border-[var(--border)]'
                )}
              />
              {workspaceForm.formState.errors.name && (
                <p className="text-xs text-red mt-1">{workspaceForm.formState.errors.name.message}</p>
              )}
            </div>

            {isOwner && (
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingWorkspace}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {savingWorkspace && <Loader2 size={14} className="animate-spin" />}
                  {savedWorkspace && <Check size={14} />}
                  {savedWorkspace ? 'Saved' : 'Save Workspace'}
                </button>
              </div>
            )}
          </form>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Notification Preferences" description="Choose which in-app notifications you receive">
          <div className="space-y-1">
            {NOTIF_ITEMS.map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-start gap-3 py-3 px-1 rounded-lg hover:bg-hover transition-colors"
              >
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-primary">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{description}</p>
                </div>
                <Toggle on={notifPrefs[key]} onToggle={() => toggleNotifPref(key)} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-3 border-t border-[var(--border)] pt-3">
            Preferences are saved automatically. Email notifications can be configured once Resend is connected.
          </p>
        </Section>

        {/* Danger zone */}
        <Section icon={AlertTriangle} title="Danger Zone" description="Actions here are permanent and cannot be undone" danger>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Delete my account</p>
              <p className="text-xs text-muted mt-0.5">Permanently remove your account and all data</p>
            </div>
            <button
              onClick={() => toast.error('Please contact support to delete your account')}
              className="px-3 py-2 border border-red/40 text-red text-xs font-medium rounded-md hover:bg-red/10 transition-colors min-h-[44px] flex-shrink-0 ml-4"
            >
              Delete Account
            </button>
          </div>
        </Section>
      </div>
    </div>
  )
}
