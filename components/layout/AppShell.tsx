'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const CommandPalette = dynamic(() => import('./CommandPalette'), { ssr: false })

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)

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
