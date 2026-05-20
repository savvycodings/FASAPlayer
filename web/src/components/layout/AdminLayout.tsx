import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/sets', label: 'Sets' },
  { to: '/jobs', label: 'Price jobs' },
  { to: '/viz', label: 'Architecture' },
]

export function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">FASAPlayer Admin</h1>
          <p className="text-sm text-muted-foreground">Catalog, pricing history, sync jobs</p>
        </div>
        <nav className="flex gap-1 flex-wrap">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
