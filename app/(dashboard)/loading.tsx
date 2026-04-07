export default function DashboardLoading(): React.ReactElement {
    return (
        <div className="mx-auto w-full max-w-6xl animate-pulse space-y-8 p-4 md:p-8">
            {/* Header skeleton */}
            <div className="space-y-3">
                <div className="h-3 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-8 w-64 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-48 rounded-full bg-zinc-100 dark:bg-zinc-900" />
            </div>

            {/* Cards skeleton */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-3xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                        <div className="h-44 bg-zinc-200 dark:bg-zinc-800" />
                        <div className="p-5 space-y-3">
                            <div className="h-5 w-3/4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-4 w-1/2 rounded-full bg-zinc-100 dark:bg-zinc-800/50" />
                            <div className="h-6 w-1/3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
