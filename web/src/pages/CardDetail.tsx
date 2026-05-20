import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { getCard, patchCardImage } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatUsd } from '@/lib/utils'

export function CardDetailPage() {
  const { cardId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof getCard>> | null>(null)
  const [imageEdit, setImageEdit] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!cardId) return
    setLoading(true)
    getCard(cardId)
      .then((d) => {
        setPayload(d)
        setImageEdit(d.cache?.imageUrl || '')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [cardId])

  if (loading) return <p className="text-muted-foreground">Loading…</p>
  if (error) return <p className="text-destructive">{error}</p>
  if (!payload) return null

  const chartData = payload.history.map((h) => ({
    date: h.date,
    market: h.marketPrice,
    ebay: h.ebayLastSold,
  }))

  const catalog = payload.catalog as {
    name?: string
    num?: string
    set_name?: string
    pokedata_set_id?: number
  } | null

  return (
    <div className="space-y-6">
      <Link to={catalog?.pokedata_set_id ? `/sets/${catalog.pokedata_set_id}` : '/sets'} className="text-sm text-muted-foreground hover:text-primary">
        ← Back
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        {payload.cache?.imageUrl && (
          <img
            src={payload.cache.imageUrl}
            alt=""
            className="w-48 rounded-lg border border-border object-contain bg-muted"
          />
        )}
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold">{payload.cache?.cardName || catalog?.name || cardId}</h2>
          <p className="text-muted-foreground">
            #{catalog?.num} · {payload.cache?.setName || catalog?.set_name}
          </p>
          <div className="flex gap-4 text-lg">
            <span>Market: {formatUsd(payload.cache?.marketPrice)}</span>
            <span>eBay: {formatUsd(payload.cache?.ebayLastSold)}</span>
          </div>
          {payload.latestSyncFailure && (
            <Badge variant="destructive">Sync error: {payload.latestSyncFailure.error}</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price history (90 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="market" name="Market USD" stroke="var(--color-primary)" dot={false} />
                  <Line type="monotone" dataKey="ebay" name="eBay USD" stroke="#8884d8" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History table</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Market</th>
                <th className="text-left p-2">eBay</th>
              </tr>
            </thead>
            <tbody>
              {[...payload.history].reverse().map((h) => (
                <tr key={h.date} className="border-b border-border/50">
                  <td className="p-2">{h.date}</td>
                  <td className="p-2">{formatUsd(h.marketPrice)}</td>
                  <td className="p-2">{formatUsd(h.ebayLastSold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image URL override</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input value={imageEdit} onChange={(e) => setImageEdit(e.target.value)} className="flex-1 min-w-[200px]" />
          <Button
            disabled={saving || !cardId}
            onClick={async () => {
              setSaving(true)
              try {
                await patchCardImage(cardId!, imageEdit)
                load()
              } finally {
                setSaving(false)
              }
            }}
          >
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
