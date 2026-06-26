import type { Route } from './+types/player'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useLoaderData, useFetcher, useNavigate } from 'react-router'
import type { ShouldRevalidateFunctionArgs } from 'react-router'
import { ArrowLeft, Play, SkipBack, SkipForward, Tv2 } from 'lucide-react'
import { api, dedupeById } from '../services/api'
import type { Category, Video } from '../types'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Lecteur' }]
}

const MIN_RELATED = 10
const MAX_RELATED = 20

function flattenCategories(cats: Category[]): Category[] {
  const result: Category[] = []
  for (const cat of cats) {
    result.push(cat)
    result.push(...flattenCategories(cat.children))
  }
  return result
}

function sortByTitle(videos: Video[]): Video[] {
  return [...videos].sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
}

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params
  if (!id) throw new Response('Vidéo introuvable.', { status: 404 })

  const [video, categoriesTree, allVideos] = await Promise.all([
    api.getVideo(id).catch(() => null),
    api.getCategories(),
    api.getVideos(),
  ])

  if (!video) throw new Response('Vidéo introuvable.', { status: 404 })

  const videos = dedupeById(allVideos)
  const orderedCategories = flattenCategories(dedupeById(categoriesTree))

  // Vidéos groupées par catégorie, chaque groupe trié par titre.
  const videosByCategory = new Map<string, Video[]>()
  for (const cat of orderedCategories) {
    videosByCategory.set(cat.id, sortByTitle(videos.filter(v => v.category === cat.id)))
  }

  const playlist: Video[] = []
  for (const cat of orderedCategories) {
    playlist.push(...(videosByCategory.get(cat.id) ?? []))
  }

  const currentIndex = playlist.findIndex(v => v.id === id)

  const prevVideo = currentIndex > 0 ? playlist[currentIndex - 1] : null
  const nextVideo =
    currentIndex >= 0 && currentIndex < playlist.length - 1
      ? playlist[currentIndex + 1]
      : null

  const afterCurrent = currentIndex >= 0 ? playlist.slice(currentIndex + 1) : []
  const related: Video[] = afterCurrent.slice(0, Math.max(MIN_RELATED, MAX_RELATED))

  return {
    video,
    related,
    prevVideo,
    nextVideo,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { id } = params
  if (!id) return { ok: false }

  const formData = await request.formData()
  const progress_sec = Number(formData.get('progress_sec'))
  const completed = formData.get('completed') === 'true'

  try {
    await api.saveProgress(id, { progress_sec, completed })
  } catch {
    // Silently ignore — progress save failure must not crash the player
  }
  return { ok: true }
}

export function shouldRevalidate({ currentParams, nextParams }: ShouldRevalidateFunctionArgs) {
  return currentParams.id !== nextParams.id
}

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`
  return `${mb} Mo`
}

function RelatedCard({ video, active }: { video: Video; active?: boolean }) {
  return (
    <Link
      to={`/player/${video.id}`}
      className={`relative flex gap-2.5 p-2 rounded-lg transition-colors border ${
        active
          ? 'bg-error/10 border-error'
          : 'border-transparent hover:bg-base-200'
      }`}
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
        {active && (
          <span className="badge badge-error badge-xs text-white mb-1 gap-1">
            <SkipForward size={8} fill="currentColor" /> Suivant
          </span>
        )}
        <p className={`text-xs line-clamp-2 leading-snug ${active ? 'font-semibold text-error' : 'font-medium'}`}>
          {video.title}
        </p>
        <p className="text-[11px] text-base-content/50 mt-1">
          {video.category_name} · {video.duration_display} · {formatSize(video.file_size_mb)}
        </p>
      </div>
    </Link>
  )
}

export default function Player() {
  const { video, related, prevVideo, nextVideo } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const navigate = useNavigate()
  const [played, setPlayed] = useState(0)
  const [duration, setDuration] = useState(0)
  const lastSavedRef = useRef(0)
  const autoAdvancedRef = useRef(false)
  const historyCreatedRef = useRef(false)

  useEffect(() => {
    setPlayed(0)
    setDuration(0)
    lastSavedRef.current = 0
    autoAdvancedRef.current = false
    historyCreatedRef.current = false
  }, [video.id])

  function handlePlay() {
    if (historyCreatedRef.current) return
    historyCreatedRef.current = true
    fetcher.submit(
      { progress_sec: '0', completed: 'false' },
      { method: 'post' },
    )
  }

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

  const goToNext = useCallback(() => {
    if (nextVideo) navigate(`/player/${nextVideo.id}`)
  }, [nextVideo, navigate])

  const goToPrev = useCallback(() => {
    if (prevVideo) navigate(`/player/${prevVideo.id}`)
  }, [prevVideo, navigate])

  function handleEnded() {
    if (autoAdvancedRef.current) return
    autoAdvancedRef.current = true

    fetcher.submit(
      { progress_sec: String(Math.floor(duration)), completed: 'true' },
      { method: 'post' },
    )

    if (nextVideo) goToNext()
  }

  const changesCategory = nextVideo && nextVideo.category !== video.category

  return (
    <div className="flex flex-col xl:flex-row h-full">

      {/* ── Main player column ── */}
      <div className="flex-1 min-w-0 p-3 sm:p-5 xl:overflow-y-auto">
        <Link to={`/?category=${video.category}`} className="btn btn-ghost btn-xs mb-3 gap-1.5 -ml-1">
          <ArrowLeft size={14} /> {video.category_name}
        </Link>

        {/* Video player */}
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-4">
          <video
            key={video.id}
            src={api.resolveUrl(video.stream_url)!}
            controls
            autoPlay
            className="w-full h-full"
            onTimeUpdate={(e) => {
              const el = e.currentTarget
              if (el.duration) setPlayed(el.currentTime / el.duration)
            }}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
            onPlay={handlePlay}
            onEnded={handleEnded}
          />
        </div>

        {/* Prev / Next controls */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <button
            type="button"
            className="btn btn-sm btn-outline gap-1.5"
            onClick={goToPrev}
            disabled={!prevVideo}
            title={prevVideo ? prevVideo.title : 'Pas de vidéo précédente'}
          >
            <SkipBack size={15} /> Précédent
          </button>

          <button
            type="button"
            className="btn btn-sm btn-error text-white gap-1.5"
            onClick={goToNext}
            disabled={!nextVideo}
            title={nextVideo ? nextVideo.title : 'Pas de vidéo suivante'}
          >
            Suivant <SkipForward size={15} />
          </button>
        </div>

        {nextVideo && (
          <p className="text-xs text-base-content/50 truncate mb-4">
            <span className="text-base-content/40">À suivre</span>
            {changesCategory && <span className="text-base-content/40"> · {nextVideo.category_name}</span>}
            {' — '}
            <span className="text-base-content/70">{nextVideo.title}</span>
          </p>
        )}
        {!nextVideo && <div className="mb-4" />}

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
                  <RelatedCard video={v} active={nextVideo?.id === v.id} />
                </div>
              ))}
            </div>
            {/* Vertical list on xl+ */}
            <div className="hidden xl:flex flex-col gap-1">
              {related.map(v => (
                <RelatedCard key={v.id} video={v} active={nextVideo?.id === v.id} />
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
