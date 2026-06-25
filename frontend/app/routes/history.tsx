import type { Route } from './+types/history'
import { Link, useLoaderData } from 'react-router'
import { ClipboardList, Play, CheckCircle } from 'lucide-react'
import { api, dedupeById } from '../services/api'
import type { WatchHistory } from '../types'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Historique' }]
}

export async function loader(): Promise<{ history: WatchHistory[] }> {
  const history = await api.getHistory()
  return { history: dedupeById(history) }
}

function formatProgress(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}min regardées`
  return `${m} min regardées`
}

export default function History() {
  const { history } = useLoaderData<typeof loader>()

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5 flex items-center gap-2">
        <ClipboardList size={18} /> Historique de lecture
      </h1>

      {!history.length ? (
        <div className="text-center py-16 text-base-content/40">
          <Play size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune vidéo regardée pour l'instant.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map(entry => (
            <Link
              key={entry.id}
              to={`/player/${entry.video}`}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-base-100 border border-base-300 hover:bg-base-200 transition-colors"
            >
              {/* Play icon */}
              <div className="w-9 h-9 rounded-full bg-base-200 flex items-center justify-center shrink-0">
                <Play size={15} className="text-base-content/50" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.video_title}</p>
                <p className="text-xs text-base-content/50 mt-0.5">
                  {entry.device_name} · {formatProgress(entry.progress_sec)}
                </p>
              </div>

              {/* Status */}
              {entry.completed ? (
                <span className="badge badge-success badge-sm gap-1 shrink-0">
                  <CheckCircle size={11} /> Terminé
                </span>
              ) : (
                <div
                  className="radial-progress text-error shrink-0"
                  style={{
                    '--value': Math.min(Math.round((entry.progress_sec / 5400) * 100), 100),
                    '--size': '2rem',
                    '--thickness': '2px',
                  } as React.CSSProperties}
                >
                  <span className="text-[9px]">
                    {Math.min(Math.round((entry.progress_sec / 5400) * 100), 100)}%
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
