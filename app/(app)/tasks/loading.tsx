function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-hover rounded ${className ?? ''}`} />
}

export default function TasksLoading() {
  return (
    <div className="px-4 lg:px-7 py-6 pb-16 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-md mb-4" />

      {/* Task rows */}
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-card border border-[var(--border)] rounded-lg px-4 py-3">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
            <Skeleton className="flex-1 h-4" />
            <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 w-14 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
