import { useState } from 'react'
import { Link, NavLink, useNavigate, useFetcher, useRouteLoaderData } from 'react-router'
import {
  Play, Search, Upload, RefreshCw, Settings,
  Wifi, Menu, X, Home, Clock, ClipboardList,
  FolderOpen, Monitor, ChevronRight,
} from 'lucide-react'
import type { loader as layoutLoader } from '../routes/_layout'
import type { Category, ScanResult } from '../types'

function DrawerCategoryTree({
  cat,
  depth = 0,
  onClose,
}: {
  cat: Category
  depth?: number
  onClose: () => void
}) {
  const hasChildren = cat.children.length > 0
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors ${
      isActive
        ? 'bg-base-200 font-medium text-base-content'
        : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
    }`

  return (
    <li>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: `${depth * 14}px` }}>
        {hasChildren ? (
          <button
            className="btn btn-ghost btn-xs btn-square shrink-0 text-base-content/40"
            onClick={() => setOpen(o => !o)}
          >
            <ChevronRight
              size={13}
              className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span className="w-6.5 shrink-0" />
        )}
        <NavLink
          to={`/?category=${cat.id}`}
          className={linkClass}
          onClick={onClose}
          style={{ flex: 1 }}
        >
          <FolderOpen size={16} />
          <span className="flex-1 truncate">{cat.name}</span>
          <span className="badge badge-ghost badge-xs">{cat.total_video_count}</span>
        </NavLink>
      </div>

      {hasChildren && open && (
        <ul className="flex flex-col gap-0.5">
          {cat.children.map(child => (
            <DrawerCategoryTree key={child.id} cat={child} depth={depth + 1} onClose={onClose} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function Navbar() {
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  const data = useRouteLoaderData<typeof layoutLoader>('routes/_layout')
  const categories = data?.categories ?? []

  const scanFetcher = useFetcher<{ result?: ScanResult; error?: string }>()
  const scanning = scanFetcher.state !== 'idle'

  function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/?search=${encodeURIComponent(query.trim())}`)
      setDrawerOpen(false)
    }
  }

  function handleScan() {
    scanFetcher.submit({}, { method: 'post', action: '/settings' })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors ${
      isActive
        ? 'bg-base-200 font-medium text-base-content'
        : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
    }`

  return (
    <>
      {/* ── Navbar bar ── */}
      <nav className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-50 px-3 sm:px-4 min-h-13">

        {/* Left — hamburger + logo */}
        <div className="navbar-start gap-2">
          <button
            className="btn btn-ghost btn-sm btn-square lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>

          <Link to="/" className="flex items-center gap-2 font-semibold text-base">
            <div className="w-8 h-8 bg-error rounded-lg flex items-center justify-center text-white">
              <Play size={14} fill="white" />
            </div>
            <span className="hidden sm:inline">VidStream</span>
          </Link>
        </div>

        {/* Center — search bar */}
        <div className="navbar-center max-w-md px-2 sm:px-4 hidden lg:flex">
          <form onSubmit={handleSearch} className="w-full">
            <label className="input input-sm input-bordered flex items-center gap-2 w-full rounded-full">
              <Search size={13} className="text-base-content/40 shrink-0" />
              <input
                type="text"
                placeholder="Rechercher des vidéos..."
                className="grow text-sm min-w-0"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </label>
          </form>
        </div>

        {/* Right — actions */}
        <div className="navbar-end gap-1 sm:gap-2">
          <div className="badge badge-success gap-1 font-medium text-xs hidden sm:flex">
            <Wifi size={10} /> LAN
          </div>
          <Link to="/upload" className="btn btn-ghost btn-sm btn-square" title="Envoyer une vidéo">
            <Upload size={17} />
          </Link>
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={handleScan}
            disabled={scanning}
            title="Rescanner les dossiers"
          >
            {scanning
              ? <span className="loading loading-spinner loading-xs" />
              : <RefreshCw size={17} />
            }
          </button>
          <Link to="/settings" className="btn btn-ghost btn-sm btn-square" title="Paramètres">
            <Settings size={17} />
          </Link>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-60 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />

          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-base-100 flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <Link
                to="/"
                className="flex items-center gap-2 font-semibold text-base"
                onClick={() => setDrawerOpen(false)}
              >
                <div className="w-7 h-7 bg-error rounded-lg flex items-center justify-center text-white">
                  <Play size={12} fill="white" />
                </div>
                VidStream
              </Link>
              <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-3 pb-2">
              <form onSubmit={handleSearch}>
                <label className="input input-sm input-bordered flex items-center gap-2 w-full rounded-full">
                  <Search size={13} className="text-base-content/40 shrink-0" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="grow text-sm min-w-0"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </label>
              </form>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
              <NavLink to="/" end className={linkClass} onClick={() => setDrawerOpen(false)}>
                <Home size={17} /> Accueil
              </NavLink>
              <NavLink to="/?recent" className={linkClass} onClick={() => setDrawerOpen(false)}>
                <Clock size={17} /> Récents
              </NavLink>
              <NavLink to="/history" className={linkClass} onClick={() => setDrawerOpen(false)}>
                <ClipboardList size={17} /> Historique
              </NavLink>
              <NavLink to="/upload" className={linkClass} onClick={() => setDrawerOpen(false)}>
                <Upload size={17} /> Uploads reçus
              </NavLink>

              <p className="text-xs text-base-content/40 px-4 pt-4 pb-1 uppercase tracking-wider">
                Catégories
              </p>
              <ul className="flex flex-col gap-0.5">
                {categories.map(cat => (
                  <DrawerCategoryTree
                    key={cat.id}
                    cat={cat}
                    depth={0}
                    onClose={() => setDrawerOpen(false)}
                  />
                ))}
              </ul>

              <p className="text-xs text-base-content/40 px-4 pt-4 pb-1 uppercase tracking-wider">
                Réseau
              </p>
              <NavLink to="/settings" className={linkClass} onClick={() => setDrawerOpen(false)}>
                <Monitor size={17} /> Appareils LAN
              </NavLink>
            </nav>

            {/* LAN badge */}
            <div className="px-4 py-3 border-t border-base-300">
              <div className="badge badge-success gap-1.5 font-medium text-xs">
                <Wifi size={10} />
                <span className="w-1.5 h-1.5 rounded-full bg-success-content animate-pulse" />
                LAN connecté
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}