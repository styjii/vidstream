import { useState } from 'react'
import { NavLink, useRouteLoaderData } from 'react-router'
import {
  Home, Clock, ClipboardList, Upload,
  Monitor, FolderOpen, ChevronRight,
} from 'lucide-react'
import type { loader as layoutLoader } from '../routes/_layout'
import type { Category } from '../types'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
}

function CategoryTree({ cat, depth = 0 }: { cat: Category; depth?: number }) {
  const hasChildren = cat.children.length > 0
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 text-sm w-full rounded-lg px-2 py-1.5 transition-colors ${
      isActive
        ? 'bg-base-200 font-medium text-base-content'
        : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
    }`

  return (
    <li>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: `${depth * 12}px` }}>
        {hasChildren ? (
          <button
            className="btn btn-ghost btn-xs btn-square shrink-0 text-base-content/40 hover:text-base-content"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Réduire' : 'Développer'}
          >
            <ChevronRight
              size={13}
              className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span className="w-6.5 shrink-0" />
        )}
        <NavLink to={`/?category=${cat.id}`} className={linkClass}>
          <FolderOpen size={15} className="shrink-0" />
          <span className="flex-1 truncate">{cat.name}</span>
          <span className="badge badge-ghost badge-xs shrink-0">{cat.total_video_count}</span>
        </NavLink>
      </div>

      {hasChildren && open && (
        <ul className="flex flex-col gap-0.5">
          {cat.children.map(child => (
            <CategoryTree key={child.id} cat={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function Sidebar() {
  const data = useRouteLoaderData<typeof layoutLoader>('routes/_layout')
  const categories = data?.categories ?? []

  const mainLinks: NavItem[] = [
    { to: '/', icon: <Home size={16} />, label: 'Accueil', end: true },
    { to: '/?recent', icon: <Clock size={16} />, label: 'Récents' },
    { to: '/history', icon: <ClipboardList size={16} />, label: 'Historique' },
    { to: '/upload', icon: <Upload size={16} />, label: 'Uploads reçus' },
  ]

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 text-sm ${isActive ? 'active' : ''}`

  return (
    <aside
      className="hidden lg:block bg-base-100 border-r border-base-300 w-52 xl:w-56 shrink-0"
      style={{ overflowY: 'auto', overflowX: 'hidden' }}
    >
      <ul className="menu menu-sm py-2 gap-0.5">
        {mainLinks.map(item => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.end} className={linkClass}>
              {item.icon}
              {item.label}
            </NavLink>
          </li>
        ))}

        <li className="menu-title text-xs mt-3">Catégories</li>
        {categories.map(cat => (
          <CategoryTree key={cat.id} cat={cat} depth={0} />
        ))}

        <li className="menu-title text-xs mt-3">Réseau</li>
        <li>
          <NavLink to="/settings" className={linkClass}>
            <Monitor size={16} />
            Appareils LAN
          </NavLink>
        </li>
      </ul>
    </aside>
  )
}