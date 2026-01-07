import { PageLoader, TableLoader } from '@/components/page-loader'

export default function ReleasesLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="space-y-2">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>
      <TableLoader rows={10} />
    </div>
  )
}



