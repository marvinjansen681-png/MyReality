'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ProgressRingProps {
  completed: number
  total: number
}

export default function ProgressRing({ completed, total }: ProgressRingProps) {
  const [animated, setAnimated] = useState(false)
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const radius = 52
  const stroke = 8
  const normalised = radius - stroke / 2
  const circumference = 2 * Math.PI * normalised
  const offset = circumference - (animated ? percent / 100 : 0) * circumference

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[120px] h-[120px]">
        <svg width="120" height="120" className="-rotate-90">
          {/* Track */}
          <circle
            cx="60" cy="60" r={normalised}
            fill="none"
            stroke="var(--bg-hover)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <motion.circle
            cx="60" cy="60" r={normalised}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-bold text-primary font-display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {percent}%
          </motion.span>
          <span className="text-xs text-muted">today</span>
        </div>
      </div>
      <p className="text-xs text-secondary text-center">
        {completed} of {total} tasks done
      </p>
    </div>
  )
}
