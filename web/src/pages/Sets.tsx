import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSets, type AdminSet } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatPct } from '@/lib/utils'

export function SetsPage() {
  const [sets, setSets] = useState<AdminSet[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      setError(null)
      getSets('ENGLISH', q)
        .then((r) => setSets(r.sets))
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  if (error) return <p className="text-destructive">{error}</p>
  if (loading) return <p className="text-muted-foreground">Loading sets…</p>

  return (
    <div className="space-y-4">
      <Input placeholder="Search sets…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Set</th>
              <th className="text-left p-3 font-medium">Cards</th>
              <th className="text-left p-3 font-medium">Synced</th>
              <th className="text-left p-3 font-medium">Price %</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">
                  <Link to={`/sets/${s.id}`} className="font-medium hover:text-primary">
                    {s.name}
                  </Link>
                  {s.code && <span className="text-muted-foreground ml-2 text-xs">{s.code}</span>}
                </td>
                <td className="p-3">{s.cardCount}</td>
                <td className="p-3">
                  {s.cardsSynced ? <Badge variant="secondary">yes</Badge> : <Badge variant="outline">no</Badge>}
                </td>
                <td className="p-3">{formatPct(s.priceCoveragePct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
