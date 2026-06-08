'use client'

import { memo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckSquare, Users, ArrowRight } from 'lucide-react'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
  index: number
}

const ProjectCard = memo(function ProjectCard({ project, index }: ProjectCardProps) {
  const done = 0
  const total = project.task_count ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="block bg-card border border-[var(--border)] rounded-lg p-4 hover:border-[var(--border-focus)] transition-colors group"
      >
        {/* Color bar + icon */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ background: project.color + '22' }}
          >
            {project.icon}
          </div>
          <ArrowRight size={16} className="text-muted group-hover:text-gold transition-colors mt-1" />
        </div>

        {/* Name + description */}
        <h3 className="text-sm font-semibold text-primary mb-0.5 line-clamp-1">{project.name}</h3>
        {project.description && (
          <p className="text-xs text-secondary line-clamp-2 mb-3">{project.description}</p>
        )}

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-3 mb-2">
            <div className="h-1 bg-hover rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: project.color }}
              />
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1 text-xs text-muted">
            <CheckSquare size={11} />
            {total} task{total !== 1 ? 's' : ''}
          </span>
          {(project.member_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Users size={11} />
              {project.member_count}
            </span>
          )}
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
            style={{ background: project.color + '22', color: project.color }}
          >
            {project.status}
          </span>
        </div>
      </Link>
    </motion.div>
  )
})

export default ProjectCard
