// VidStream — Player route (responsive + lucide-react)

import type { Route }                  from './+types/player'
import { useEffect, useState, useRef } from 'react'
import { Link, useParams }             from 'react-router'
import { ArrowLeft, Play, Tv2 }        from 'lucide-react'
import { useVideo, useVideos }         from '../hooks/useVideos'
import { api }                         from '../services/api'
import type { Video }                  from '../types'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Lecteur' }]
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
      <div className="relative w-20 h-12 rounded-md bg-neutral flex-shrink-0 overflow-hidden flex items-center justify-center">
        {video.thumbnail_url
          ? <img src={api.getThumbnailUrl(video.id)} alt={video.title} className="w-full h-full object-cover" />
          : <Play size={14} className="text-neutral-content/30" />
        }
        <span className="absolute bottom-0.5 right-1 bg-black/75 text-white text-[10px] px-1 rounded">
          {video.duration_display}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{video.title}</p>
        <p className="text-[11px] text-base-content/50 mt-0.5">
          {video.duration_display} · {formatSize(video.file_size_mb)}
        </p>
      </div>
    </Link>
  )
}

export default function Player() {
  const { id }                    = useParams<{ id: string }>()
  const { video, loading, error } = useVideo(id)
  const { videos: all }           = useVideos()
  const [played,   setPlayed]     = useState(0)
  const [duration, setDuration]   = useState(0)
  const lastSavedRef               = useRef(0)

  useEffect(() => {
    if (!id) return
    const interval = setInterval(() => {
      const current = Math.floor(played * duration)
      if (current !== lastSavedRef.current && current > 0) {
        lastSavedRef.current = current
        api.saveProgress(id, { progress_sec: current, completed: played > 0.95 })
      }
    }, 10_000)
    return () => clearInterval(interval)
  }, [id, played, duration])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-64">
      <span className="loading loading-spinner loading-lg text-error" />
    </div>
  )
  if (error || !video) return (
    <div className="flex-1 flex items-center justify-center min-h-64 p-4">
      <div className="alert alert-error max-w-sm">Vidéo introuvable.</div>
    </div>
  )

  const related = all.filter(v => v.id !== id).slice(0, 10)

  return (
    // Stack vertically on mobile, side-by-side on xl+
    <div className="flex flex-col xl:flex-row flex-1 min-h-0">

      {/* Player column */}
      <div className="flex-1 p-3 sm:p-5 overflow-auto">
        <Link to="/" className="btn btn-ghost btn-xs mb-3 gap-1.5 -ml-1">
          <ArrowLeft size={14} /> Retour
        </Link>

        {/* Video player */}
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-4">
          <video
            key={video.id}
            src={api.getStreamUrl(video.id)}
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
        <h1 className="text-base sm:text-lg font-semibold mb-2">{video.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/50">
          <span className="badge badge-ghost badge-sm">{video.category_name}</span>
          <span>{formatSize(video.file_size_mb)}</span>
          <span>·</span>
          <span>{video.format?.toUpperCase()} · {video.resolution}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            Ajouté le {new Date(video.scanned_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Related — horizontal scroll on mobile, vertical sidebar on xl+ */}
      <aside className="
        xl:w-64 xl:border-l xl:border-base-300 xl:bg-base-100
        xl:overflow-auto xl:flex-shrink-0 xl:p-4
        border-t border-base-300 bg-base-100 p-3
      ">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Tv2 size={15} className="text-base-content/50" />
          À regarder ensuite
        </h2>

        {/* Horizontal scroll on mobile, vertical list on xl */}
        <div className="
          flex gap-2 overflow-x-auto pb-2
          xl:flex-col xl:gap-1 xl:overflow-x-visible xl:pb-0
        ">
          {related.map(v => (
            <div key={v.id} className="min-w-[180px] xl:min-w-0">
              <RelatedCard video={v} />
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
