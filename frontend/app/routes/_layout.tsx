import { Outlet } from 'react-router'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { api, dedupeById } from '../services/api'
import type { Category } from '../types'

export async function loader(): Promise<{ categories: Category[] }> {
  const categories = dedupeById(await api.getCategories())
  return { categories }
}

export default function AppLayout() {
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}