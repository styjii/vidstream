import type { Route } from './+types/player'
import { useEffect, useState, useRef } from 'react'
import { Link, useLoaderData, useFetcher } from 'react-router'
import type { ShouldRevalidateFunctionArgs } from 'react-router'
import { ArrowLeft, Play, Tv2 } from 'lucide-react'
import { api, dedupeById } from '../services/api'
import type { Video } from '../types'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Lecteur' }]
}

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params
  if (!id) throw new Response('Vidéo introuvable.', { status: 404 })

  const [video, all] = await Promise.all([
    api.getVideo(id).catch(() => null),
    api.getVideos(),
  ])

  if (!video) throw new Response('Vidéo introuvable.', { status: 404 })

  const related = dedupeById(all).filter(v => v.id !== id).slice(0, 10)
  return { video, related }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { id } = params
  if (!id) return { ok: false }

  const formData = await request.formData()
  const progress_sec = Number(formData.get('progress_sec'))
  const completed = formData.get('completed') === 'true'

  await api.saveProgress(id, { progress_sec, completed })
  return { ok: true }
}

export function shouldRevalidate({ currentParams, nextParams }: ShouldRevalidateFunctionArgs) {
  return currentParams.id !== nextParams.id
}

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`
  return `${mb} Mo`
}

function RelatedCard({ video }: { video: Video }) {
  return (
    <Link
      to={`/player/${video.id}`}
      className="flex gap-2.5 p-2 rounded-lg hover:bg-base-200 transition-colors"
    >
      {/* Thumbnail — fixed size on all breakpoints */}
      <div className="relative w-24 h-14 rounded-md bg-neutral shrink-0 overflow-hidden flex items-center justify-center">
        {video.thumbnail_url
          ? <img src={api.resolveUrl(video.thumbnail_url)!} alt={video.title} className="w-full h-full object-cover" />
          : <Play size={14} className="text-neutral-content/30" />
        }
        <span className="absolute bottom-0.5 right-1 bg-black/75 text-white text-[10px] px-1 rounded">
          {video.duration_display}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium line-clamp-2 leading-snug">{video.title}</p>
        <p className="text-[11px] text-base-content/50 mt-1">
          {video.duration_display} · {formatSize(video.file_size_mb)}
        </p>
      </div>
    </Link>
  )
}

export default function Player() {
  const { video, related } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const [played, setPlayed] = useState(0)
  const [duration, setDuration] = useState(0)
  const lastSavedRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const current = Math.floor(played * duration)
      if (current !== lastSavedRef.current && current > 0) {
        lastSavedRef.current = current
        fetcher.submit(
          { progress_sec: String(current), completed: String(played > 0.95) },
          { method: 'post' },
        )
      }
    }, 10_000)
    return () => clearInterval(interval)
  }, [played, duration])

  return (
    // Stack vertically on mobile/tablet, side-by-side on xl+
    <div className="flex flex-col xl:flex-row h-full">

      {/* ── Main player column ── */}
      <div className="flex-1 min-w-0 p-3 sm:p-5 xl:overflow-y-auto">
        <Link to="/" className="btn btn-ghost btn-xs mb-3 gap-1.5 -ml-1">
          <ArrowLeft size={14} /> Retour
        </Link>

        {/* Video player */}
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-4">
          <video
            key={video.id}
            src={api.resolveUrl(video.stream_url)!}
            controls
            className="w-full h-full"
            onTimeUpdate={(e) => {
              const el = e.currentTarget
              if (el.duration) setPlayed(el.currentTime / el.duration)
            }}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          />
        </div>

        {/* Metadata */}
        <h1 className="text-base sm:text-lg font-semibold mb-2 leading-snug">{video.title}</h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/50">
          <span className="badge badge-ghost badge-sm">{video.category_name}</span>
          <span>{formatSize(video.file_size_mb)}</span>
          <span>·</span>
          <span>{video.format?.toUpperCase()} · {video.resolution}</span>
          <span>·</span>
          <span>
            Ajouté le {new Date(video.scanned_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* ── Related panel ── */}
      <aside className="
        xl:w-72 xl:border-l xl:border-t-0 xl:shrink-0
        xl:border-base-300 xl:bg-base-100 xl:overflow-y-auto xl:p-4
        border-t border-base-300 bg-base-100 p-3
      ">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Tv2 size={15} className="text-base-content/50" />
          À regarder ensuite
        </h2>

        {related.length === 0 ? (
          <p className="text-xs text-base-content/40 px-2">Aucune autre vidéo disponible.</p>
        ) : (
          <>
            {/* Horizontal scroll on mobile/tablet */}
            <div className="flex gap-2 overflow-x-auto pb-2 xl:hidden">
              {related.map(v => (
                <div key={v.id} className="w-52 shrink-0">
                  <RelatedCard video={v} />
                </div>
              ))}
            </div>
            {/* Vertical list on xl+ */}
            <div className="hidden xl:flex flex-col gap-1">
              {related.map(v => (
                <RelatedCard key={v.id} video={v} />
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}