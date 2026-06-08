function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-hover rounded ${className ?? ''}`} />
}

export default function VisionLoading() {
  return (
    <div className="px-4 lg:px-7 py-6 pb-16">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      {/* Category tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-8 w-20 flex-shrink-0 rounded-full" />)}
      </div>
      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-[var(--border)] rounded-xl overflow-hidden">
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
