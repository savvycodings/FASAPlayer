import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJobs, getJob, type PriceJob } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useParams } from 'react-router-dom'

export function JobsPage() {
  const [jobs, setJobs] = useState<PriceJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getJobs(50)
      .then((r) => setJobs(r.jobs))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  if (error) return <p className="text-destructive">{error}</p>
  if (loading) return <p className="text-muted-foreground">Loading jobs…</p>

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Price sync jobs</h2>
      <p className="text-sm text-muted-foreground">
        Run on server: <code>pnpm run sync-card-prices --resume</code>
      </p>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Progress</th>
              <th className="text-left p-3">Failed</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-border">
                <td className="p-3">
                  <Link to={`/jobs/${j.id}`} className="hover:text-primary">
                    {j.recordedDate}
                  </Link>
                </td>
                <td className="p-3">
                  <Badge variant={j.status === 'completed' ? 'default' : 'secondary'}>{j.status}</Badge>
                </td>
                <td className="p-3">
                  {j.processed}/{j.totalCards} ({j.succeeded} ok)
                </td>
                <td className="p-3">{j.failed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function JobDetailPage() {
  const { jobId } = useParams()
  const [job, setJob] = useState<PriceJob | null>(null)
  const [failures, setFailures] = useState<{ pokedataCardId: number; error: string; attempts: number }[]>([])

  useEffect(() => {
    if (!jobId) return
    getJob(jobId).then((r) => {
      setJob(r.job)
      setFailures(r.failures)
    })
  }, [jobId])

  if (!job) return <p className="text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-4">
      <Link to="/jobs" className="text-sm text-muted-foreground hover:text-primary">
        ← Jobs
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            Job {job.recordedDate}{' '}
            <Badge variant="secondary" className="ml-2">
              {job.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>
            {job.processed}/{job.totalCards} processed · {job.succeeded} succeeded · {job.failed} failed
          </p>
          <p className="text-muted-foreground">Cursor card id: {job.cursorCardId}</p>
          <p className="text-muted-foreground text-xs">ID: {job.id}</p>
        </CardContent>
      </Card>
      {failures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failures ({failures.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto text-sm space-y-2">
            {failures.map((f) => (
              <div key={f.pokedataCardId} className="border-b border-border/50 pb-2">
                <Link to={`/cards/${f.pokedataCardId}`} className="text-primary">
                  Card {f.pokedataCardId}
                </Link>
                <p className="text-muted-foreground text-xs mt-1">{f.error}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
