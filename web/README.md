# FASAPlayer Admin (`/web`)

Vite + React + shadcn-style UI for catalog, card pricing history, and sync jobs.

## Setup

```bash
cd web
pnpm install
cp .env.example .env
# Set VITE_ADMIN_SECRET to match server ADMIN_SECRET
```

## Dev

```bash
pnpm run web:dev   # from repo root
# or: cd web && pnpm dev
```

Open http://localhost:5173 — API requests proxy to http://localhost:3050.

## Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard |
| `/sets` | Market sets |
| `/sets/:id` | Cards in set |
| `/cards/:id` | Chart + history table |
| `/jobs` | Price sync jobs |
| `/viz` | Architecture visualizer (iframe) |

Legacy static pages: `/architecture.html`, `/images.html`

## Price sync

See [docs/PRICE_SYNC.md](../docs/PRICE_SYNC.md).
