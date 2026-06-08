'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'

const CommandPalette = dynamic(() => import('./CommandPalette'), { ssr: false })

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Offline / online detection
  useEffect(() => {
    function onOffline() {
      toast.warning("You're offline — changes will sync when reconnected", { id: 'offline', duration: Infinity })
    }
    function onOnline() {
      toast.dismiss('offline')
      toast.success('Back online', { duration: 2500 })
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Expose opener so Header search button can use it
  useEffect(() => {
    (window as Window & { __openCommandPalette?: () => void }).__openCommandPalette = () => setPaletteOpen(true)
    return () => { delete (window as Window & { __openCommandPalette?: () => void }).__openCommandPalette }
  }, [])

  return (
    <>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
