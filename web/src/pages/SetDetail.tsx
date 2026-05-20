import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSetCards, type AdminCard } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { formatUsd } from '@/lib/utils'

export function SetDetailPage() {
  const { setId } = useParams()
  const id = parseInt(setId || '', 10)
  const [cards, setCards] = useState<AdminCard[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    if (Number.isNaN(id)) return
    const t = setTimeout(() => {
      getSetCards(id, q).then((r) => setCards(r.cards))
    }, 200)
    return () => clearTimeout(t)
  }, [id, q])

  return (
    <div className="space-y-4">
      <Link to="/sets" className="text-sm text-muted-foreground hover:text-primary">
        ← Sets
      </Link>
      <h2 className="text-lg font-semibold">Set {id}</h2>
      <Input placeholder="Filter cards…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Market</th>
              <th className="text-left p-3">eBay</th>
              <th className="text-left p-3">History pts</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">{c.number}</td>
                <td className="p-3">
                  <Link to={`/cards/${c.id}`} className="hover:text-primary">
                    {c.name}
                  </Link>
                  {c.secret && <span className="ml-1 text-xs text-muted-foreground">★</span>}
                </td>
                <td className="p-3">{formatUsd(c.marketPrice)}</td>
                <td className="p-3">{formatUsd(c.ebayLastSold)}</td>
                <td className="p-3">{c.historyPointCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
