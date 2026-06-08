function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-hover rounded ${className ?? ''}`} />
}

export default function PlannerLoading() {
  return (
    <div className="px-4 lg:px-7 py-6 pb-16">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-7 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
      {/* Day columns */}
      <div className="hidden lg:grid grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-card border border-[var(--border)] rounded-lg p-3 space-y-2">
            <Skeleton className="h-5 w-16 mx-auto" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-9 w-full" />
            ))}
          </div>
        ))}
      </div>
      {/* Mobile */}
      <div className="lg:hidden space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-9 w-16 flex-shrink-0 rounded-lg" />)}
        </div>
        <div className="bg-card border border-[var(--border)] rounded-lg p-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </div>
    </div>
  )
}
