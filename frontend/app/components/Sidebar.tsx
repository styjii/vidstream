import { NavLink, useRouteLoaderData } from 'react-router'
import {
  Home, Clock, ClipboardList, Upload,
  Monitor, FolderOpen,
} from 'lucide-react'
import type { loader as layoutLoader } from '../routes/_layout'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
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
    // Hidden on mobile (toggled via root layout if needed), visible lg+
    <aside className="hidden lg:flex w-48 xl:w-52 bg-base-100 border-r border-base-300 shrink-0 flex-col">
      <ul className="menu menu-sm py-2 gap-0.5 flex-1">
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
          <li key={cat.id}>
            <NavLink to={`/?category=${cat.id}`} className={linkClass}>
              <FolderOpen size={16} />
              <span className="flex-1 truncate">{cat.name}</span>
              <span className="badge badge-ghost badge-xs">{cat.video_count}</span>
            </NavLink>
          </li>
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
