const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function adminHeaders(): HeadersInit {
  const secret = import.meta.env.VITE_ADMIN_SECRET || ''
  return {
    'Content-Type': 'application/json',
    'X-Admin-Secret': secret,
  }
}

async function adminFetch<T>(path: string): Promise<T> {
  const secret = import.meta.env.VITE_ADMIN_SECRET?.trim()
  if (!secret) {
    throw new Error('VITE_ADMIN_SECRET is missing in web/.env — restart pnpm dev after adding it')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(`${base}${path}`, {
      headers: adminHeaders(),
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || res.statusText || `HTTP ${res.status}`)
    }
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Request timed out — is the API running on port 3050? (pnpm run server:dev)')
    }
    if (e instanceof TypeError) {
      throw new Error('Cannot reach API — start server: pnpm run server:dev from repo root')
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

export type Dashboard = {
  sets: number
  marketCards: number
  cardPrices: number
  historyRows: number
  cardsWithPriceSync: number
  priceCoveragePct: number
  latestJob: {
    id: string
    recordedDate: string
    status: string
    processed: number
    totalCards: number
    succeeded: number
    failed: number
    startedAt: string
    completedAt: string | null
  } | null
}

export function getDashboard() {
  return adminFetch<Dashboard>('/api/admin/dashboard')
}

export function getSets(language = 'ENGLISH', q = '') {
  const params = new URLSearchParams({ language })
  if (q) params.set('q', q)
  return adminFetch<{ sets: AdminSet[]; language: string }>(`/api/admin/market/sets?${params}`)
}

export type AdminSet = {
  id: number
  name: string
  code: string | null
  language: string
  cardCount: number
  cardsSynced: boolean
  cardsSyncedAt: string | null
  releaseDate: string | null
  priceCoveragePct: number
}

export function getSetCards(setId: number, q = '') {
  const params = q ? `?q=${encodeURIComponent(q)}` : ''
  return adminFetch<{ cards: AdminCard[] }>(`/api/admin/market/sets/${setId}/cards${params}`)
}

export type AdminCard = {
  id: number
  name: string
  number: string
  secret: boolean
  set: string | null
  marketPrice: number | null
  ebayLastSold: number | null
  imageUrl: string | null
  lastFetchedAt: string | null
  lastPriceSyncedAt: string | null
  historyPointCount: number
}

export function getCard(cardId: string) {
  return adminFetch<{
    catalog: Record<string, unknown> | null
    cache: {
      id: string
      cardName: string | null
      setName: string | null
      imageUrl: string | null
      marketPrice: number | null
      ebayLastSold: number | null
      lastFetchedAt: string
    } | null
    history: { date: string; recordedAt: string; marketPrice: number | null; ebayLastSold: number | null }[]
    latestSyncFailure: { error: string } | null
  }>(`/api/admin/cards/${encodeURIComponent(cardId)}`)
}

export function patchCardImage(cardId: string, imageUrl: string) {
  return fetch(`${base}/api/admin/cards/${encodeURIComponent(cardId)}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ imageUrl }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  })
}

export function getJobs(limit = 20, offset = 0) {
  return adminFetch<{ jobs: PriceJob[] }>(`/api/admin/price-jobs?limit=${limit}&offset=${offset}`)
}

export type PriceJob = {
  id: string
  recordedDate: string
  status: string
  cursorCardId: number
  totalCards: number
  processed: number
  succeeded: number
  failed: number
  errorSummary: string | null
  startedAt: string
  updatedAt: string
  completedAt: string | null
}

export function getJob(id: string) {
  return adminFetch<{ job: PriceJob; failures: { pokedataCardId: number; error: string; attempts: number }[] }>(
    `/api/admin/price-jobs/${id}`,
  )
}
