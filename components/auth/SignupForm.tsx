'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type SignupValues = z.infer<typeof signupSchema>

export default function SignupForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) })

  async function onSubmit(values: SignupValues) {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
      },
    })
    if (error) {
      toast.error('Sign up failed', { description: error.message })
      return
    }
    toast.success('Account created!', { description: 'Setting up your workspace...' })
    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleOAuth() {
    setOauthLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error('Google sign-in failed', { description: error.message })
      setOauthLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-gold mb-2">MyReality</h1>
        <p className="text-secondary text-sm">Create your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm text-secondary mb-1.5">Full Name</label>
          <input
            {...register('full_name')}
            type="text"
            autoComplete="name"
            placeholder="Marvin Jansen"
            className={cn(
              'w-full min-h-[44px] px-4 py-2.5 rounded-md bg-card border text-primary placeholder:text-muted text-sm outline-none transition-colors',
              'focus:border-[var(--border-focus)]',
              errors.full_name ? 'border-red' : 'border-[var(--border)]'
            )}
          />
          {errors.full_name && <p className="text-red text-xs mt-1">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm text-secondary mb-1.5">Email</label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={cn(
              'w-full min-h-[44px] px-4 py-2.5 rounded-md bg-card border text-primary placeholder:text-muted text-sm outline-none transition-colors',
              'focus:border-[var(--border-focus)]',
              errors.email ? 'border-red' : 'border-[var(--border)]'
            )}
          />
          {errors.email && <p className="text-red text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm text-secondary mb-1.5">Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className={cn(
                'w-full min-h-[44px] px-4 py-2.5 pr-11 rounded-md bg-card border text-primary placeholder:text-muted text-sm outline-none transition-colors',
                'focus:border-[var(--border-focus)]',
                errors.password ? 'border-red' : 'border-[var(--border)]'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[44px] px-4 py-2.5 bg-gold text-[#0a0a0a] font-semibold rounded-md hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Create Account
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-muted text-xs">or</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleOAuth}
        disabled={oauthLoading}
        className="w-full min-h-[44px] px-4 py-2.5 border border-[var(--border)] rounded-md text-primary text-sm font-medium hover:bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {oauthLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
        )}
        Continue with Google
      </button>

      <p className="text-center text-sm text-secondary mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-gold hover:text-gold-light transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
