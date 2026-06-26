import type { Route } from './+types/history'
import { Link, useLoaderData, useFetcher } from 'react-router'
import { ClipboardList, Play, CheckCircle, Trash2 } from 'lucide-react'
import { api, dedupeById } from '../services/api'
import type { WatchHistory } from '../types'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Historique' }]
}

export async function loader(): Promise<{ history: WatchHistory[] }> {
  const history = await api.getHistory()
  return { history: dedupeById(history) }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  const id = formData.get('id') as string

  if (intent === 'delete') {
    await api.deleteHistory(id)
    return { ok: true }
  }

  if (intent === 'mark_complete') {
    await api.updateHistory(id, { completed: true })
    return { ok: true }
  }

  return { ok: false }
}

function formatProgress(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}min regardées`
  if (m > 0) return `${m} min regardées`
  return 'Début'
}

function ProgressIndicator({ sec, completed }: { sec: number; completed: boolean }) {
  if (completed) {
    return (
      <span className="badge badge-success badge-sm gap-1 shrink-0 whitespace-nowrap">
        <CheckCircle size={11} /> Terminé
      </span>
    )
  }

  const percent = Math.min(Math.round((sec / 5400) * 100), 100)
  return (
    <div className="flex flex-col items-end gap-1 shrink-0 w-14">
      <span className="text-xs font-medium tabular-nums text-base-content/60">{percent}%</span>
      <div className="w-full h-1 rounded-full bg-base-300 overflow-hidden">
        <div
          className="h-full rounded-full bg-error transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function HistoryEntry({ entry }: { entry: WatchHistory }) {
  const fetcher = useFetcher()
  const isDeleting = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'delete'

  return (
    <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-base-100 border border-base-300 min-w-0 transition-opacity ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Lien vers le player */}
      <Link
        to={`/player/${entry.video}`}
        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <div className="w-9 h-9 rounded-full bg-base-200 flex items-center justify-center shrink-0">
          <Play size={15} className="text-base-content/50" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-1">{entry.video_title}</p>
          <p className="text-xs text-base-content/50 mt-0.5 truncate">
            {entry.device_name} · {formatProgress(entry.progress_sec)}
          </p>
        </div>
        <ProgressIndicator sec={entry.progress_sec} completed={entry.completed} />
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-1">
        {!entry.completed && (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="mark_complete" />
            <input type="hidden" name="id" value={entry.id} />
            <button
              type="submit"
              className="btn btn-ghost btn-xs btn-square text-success"
              title="Marquer comme terminé"
            >
              <CheckCircle size={14} />
            </button>
          </fetcher.Form>
        )}
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit"
            className="btn btn-ghost btn-xs btn-square text-error"
            title="Supprimer de l'historique"
          >
            <Trash2 size={14} />
          </button>
        </fetcher.Form>
      </div>
    </div>
  )
}

export default function History() {
  const { history } = useLoaderData<typeof loader>()

  return (
    <div className="p-3 sm:p-5 xl:p-6 max-w-2xl">
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
            <HistoryEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
