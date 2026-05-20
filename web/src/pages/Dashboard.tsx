import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard, type Dashboard } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatPct } from '@/lib/utils'

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
        {error}. Set <code className="text-xs">VITE_ADMIN_SECRET</code> in <code>web/.env</code> and ensure the server has{' '}
        <code>ADMIN_SECRET</code>.
      </div>
    )
  }

  if (!data) return <p className="text-muted-foreground">Loading…</p>

  const job = data.latestJob
  const jobPct = job && job.totalCards > 0 ? (job.processed / job.totalCards) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Sets" value={String(data.sets)} />
        <StatCard title="Market cards" value={String(data.marketCards)} />
        <StatCard title="Priced (cache)" value={String(data.cardPrices)} />
        <StatCard title="Price coverage" value={formatPct(data.priceCoveragePct)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Latest price sync job
            {job && <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>{job.status}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!job ? (
            <p className="text-sm text-muted-foreground">No jobs yet. Run <code>pnpm run sync-card-prices</code>.</p>
          ) : (
            <>
              <Progress value={jobPct} />
              <p className="text-sm text-muted-foreground">
                {job.processed} / {job.totalCards} cards · {job.succeeded} ok · {job.failed} failed · date {job.recordedDate}
              </p>
              <Link to={`/jobs/${job.id}`} className="text-sm text-primary hover:underline">
                View job details →
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History rows</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{data.historyRows.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.cardsWithPriceSync.toLocaleString()} cards synced via daily job
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
