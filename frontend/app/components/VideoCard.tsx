import { Link } from 'react-router'
import { Play } from 'lucide-react'
import { api } from '../services/api'
import type { Video } from '../types'

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`
  return `${mb} Mo`
}

export default function VideoCard({ video }: { video: Video }) {
  return (
    <Link to={`/player/${video.id}`} className="group cursor-pointer block min-w-0">
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl bg-neutral overflow-hidden mb-2">
        {video.thumbnail_url ? (
          <img
            src={api.resolveUrl(video.thumbnail_url)!}
            alt={video.title}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-content/20 group-hover:opacity-70 transition-opacity">
            <Play size={32} />
          </div>
        )}
        <span className="absolute bottom-1.5 right-2 bg-black/75 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          {video.duration_display}
        </span>
      </div>

      {/* Info */}
      <p className="text-sm font-medium line-clamp-2 text-base-content leading-snug mb-0.5">
        {video.title}
      </p>
      <p className="text-xs text-base-content/50 truncate">
        {video.category_name} · {formatSize(video.file_size_mb)} · {video.format?.toUpperCase()}
      </p>
    </Link>
  )
}