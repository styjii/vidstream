import type { Route } from './+types/settings'
import { useLoaderData, useFetcher } from 'react-router'
import {
  Folder, RefreshCw, Wifi,
  Laptop, Smartphone, CheckCircle, XCircle, ChevronRight,
} from 'lucide-react'
import { api, dedupeById } from '../services/api'
import type { Category, Device, ScanResult } from '../types'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Paramètres' }]
}

export async function loader(): Promise<{ categories: Category[]; devices: Device[] }> {
  const [categories, devices] = await Promise.all([
    api.getCategories(),
    api.getDevices(),
  ])
  return { categories: dedupeById(categories), devices: dedupeById(devices) }
}

export async function action(): Promise<{ result?: ScanResult; error?: string }> {
  try {
    const result = await api.triggerScan()
    return { result }
  } catch {
    return { error: 'Erreur lors du scan.' }
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `il y a ${days}j`
  if (hours > 0) return `il y a ${hours}h`
  if (mins > 0) return `il y a ${mins} min`
  return "à l'instant"
}

function isOnline(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 5 * 60_000
}

function DeviceIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('samsung') || lower.includes('android'))
    return <Smartphone size={16} />
  return <Laptop size={16} />
}

/** Ligne de dossier récursive */
function CategoryFolderTree({ cat, depth = 0 }: { cat: Category; depth?: number }) {
  const hasChildren = cat.children.length > 0

  return (
    <>
      <div
        className="flex items-start sm:items-center gap-3 py-2 border-b border-base-200 last:border-0"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {hasChildren ? (
          <ChevronRight size={14} className="text-base-content/30 mt-0.5 sm:mt-0 shrink-0" />
        ) : (
          <Folder
            size={depth === 0 ? 18 : 15}
            className="text-base-content/40 mt-0.5 sm:mt-0 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs text-base-content break-all">{cat.folder_path}</code>
            <span className="badge badge-info badge-xs shrink-0">{cat.name}</span>
          </div>
          <p className="text-xs text-base-content/50 mt-0.5">
            {cat.video_count} fichier(s) direct(s)
            {hasChildren && ` · ${cat.total_video_count} au total`}
          </p>
        </div>
      </div>
      {hasChildren && cat.children.map(child => (
        <CategoryFolderTree key={child.id} cat={child} depth={depth + 1} />
      ))}
    </>
  )
}

/** Compte récursivement tous les dossiers */
function countAllFolders(cats: Category[]): number {
  return cats.reduce((acc, cat) => acc + 1 + countAllFolders(cat.children), 0)
}

/** Compte récursivement toutes les vidéos */
function countAllVideos(cats: Category[]): number {
  return cats.reduce((acc, cat) => acc + cat.video_count, 0)
}

export default function Settings() {
  const { categories, devices } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()

  function handleScan() {
    fetcher.submit({}, { method: 'post' })
  }

  const scanning = fetcher.state !== 'idle'
  const scanMsg = fetcher.data?.result?.message ?? null
  const scanError = fetcher.data?.error ?? null

  const totalFolders = countAllFolders(categories)
  const totalVideos = countAllVideos(categories)
  const onlineCount = devices.filter(d => isOnline(d.last_seen)).length

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 max-w-2xl">

      {/* Stats */}
      <div className="stats stats-horizontal shadow border border-base-300 w-full overflow-x-auto">
        <div className="stat px-4 sm:px-6 py-3 sm:py-4">
          <div className="stat-value text-xl sm:text-2xl">{totalVideos}</div>
          <div className="stat-desc text-xs">Vidéos indexées</div>
        </div>
        <div className="stat px-4 sm:px-6 py-3 sm:py-4">
          <div className="stat-value text-xl sm:text-2xl">{totalFolders}</div>
          <div className="stat-desc text-xs">Dossiers</div>
        </div>
        <div className="stat px-4 sm:px-6 py-3 sm:py-4">
          <div className="stat-value text-xl sm:text-2xl">{onlineCount}</div>
          <div className="stat-desc text-xs">Appareils connectés</div>
        </div>
      </div>

      {/* Scanned folders */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-3 p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="card-title text-sm gap-2">
              <Folder size={16} /> Dossiers scannés
            </h2>
            <button
              className="btn btn-outline btn-xs gap-1.5"
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning
                ? <><span className="loading loading-spinner loading-xs" /> Scan...</>
                : <><RefreshCw size={12} /> Rescanner tout</>
              }
            </button>
          </div>

          {scanMsg && (
            <div className="alert alert-success text-xs py-2 gap-2">
              <CheckCircle size={14} /> {scanMsg}
            </div>
          )}
          {scanError && (
            <div className="alert alert-error text-xs py-2 gap-2">
              <XCircle size={14} /> {scanError}
            </div>
          )}

          {categories.map(cat => (
            <CategoryFolderTree key={cat.id} cat={cat} depth={0} />
          ))}
        </div>
      </div>

      {/* LAN Devices */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-3 p-4 sm:p-5">
          <h2 className="card-title text-sm gap-2">
            <Wifi size={16} /> Appareils sur le LAN
          </h2>

          {devices.length === 0 ? (
            <p className="text-sm text-base-content/50">Aucun appareil détecté.</p>
          ) : devices.map(device => (
            <div key={device.id} className="flex items-center gap-3 py-2 border-b border-base-200 last:border-0">
              <div className="w-9 h-9 rounded-full bg-base-200 flex items-center justify-center shrink-0">
                <DeviceIcon name={device.name} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline(device.last_seen) ? 'bg-success' : 'bg-base-300'}`} />
                  <span className="truncate">{device.name}</span>
                </div>
                <p className="text-xs text-base-content/50 mt-0.5">
                  {device.ip_address} · vu {timeAgo(device.last_seen)}
                </p>
              </div>
              {isOnline(device.last_seen) && (
                <span className="badge badge-success badge-xs shrink-0">En ligne</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}