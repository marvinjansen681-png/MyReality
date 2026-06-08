function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-hover rounded ${className ?? ''}`} />
}

function WidgetShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-[var(--border)] rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">{title}</p>
      {children}
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <main className="px-4 lg:px-7 py-6 pb-10 space-y-6">
      {/* Greeting skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-4 lg:hidden">
        <WidgetShell title="Today's Progress">
          <div className="flex justify-center py-4">
            <Skeleton className="w-24 h-24 rounded-full" />
          </div>
        </WidgetShell>
        <WidgetShell title="Today's Tasks">
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        </WidgetShell>
        <WidgetShell title="Upcoming Deadlines">
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-7 w-full" />)}
          </div>
        </WidgetShell>
      </div>

      {/* Desktop */}
      <div className="hidden lg:grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          <WidgetShell title="Today's Tasks">
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          </WidgetShell>
          <WidgetShell title="Recent Activity">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </WidgetShell>
        </div>
        <div className="flex flex-col gap-4">
          <WidgetShell title="Today's Progress">
            <div className="flex justify-center py-2">
              <Skeleton className="w-24 h-24 rounded-full" />
            </div>
          </WidgetShell>
          <WidgetShell title="Upcoming Deadlines">
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-7 w-full" />)}
            </div>
          </WidgetShell>
          <WidgetShell title="Vision Spotlight">
            <Skeleton className="h-28 w-full rounded-md" />
          </WidgetShell>
        </div>
      </div>
    </main>
  )
}
