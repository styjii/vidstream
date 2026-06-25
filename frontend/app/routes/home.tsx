import type { Route } from './+types/home'
import { Link, useLoaderData } from 'react-router'
import { ChevronRight, FolderOpen } from 'lucide-react'
import { api, dedupeById } from '../services/api'
import VideoCard from '../components/VideoCard'
import type { Category, Video } from '../types'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Accueil' }]
}

interface HomeLoaderData {
  categories: Category[]
  videos: Video[]
  mode: 'search' | 'category' | 'recent' | 'all'
  search?: string
  categoryId?: string
}

export async function loader({ request }: Route.LoaderArgs): Promise<HomeLoaderData> {
  const url = new URL(request.url)
  const search = url.searchParams.get('search') ?? undefined
  const categoryId = url.searchParams.get('category') ?? undefined
  const recent = url.searchParams.has('recent')

  const categories = dedupeById(await api.getCategories())

  if (search) {
    const videos = dedupeById(await api.getVideos({ search }))
    return { categories, videos, mode: 'search', search }
  }

  if (categoryId) {
    const videos = dedupeById(await api.getVideos({ category: categoryId }))
    return { categories, videos, mode: 'category', categoryId }
  }

  if (recent) {
    const videos = dedupeById(await api.getVideos({ recent: 'true' }))
    return { categories, videos, mode: 'recent' }
  }

  const videos = dedupeById(await api.getVideos())
  return { categories, videos, mode: 'all' }
}

function VideoGrid({ videos, title, categoryId }: { videos: Video[]; title?: string; categoryId?: string }) {
  if (!videos.length) return (
    <p className="text-sm text-base-content/50 py-4">Aucune vidéo trouvée.</p>
  )

  return (
    <section className="mb-8 sm:mb-10">
      {title && (
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <FolderOpen size={16} className="text-base-content/50" />
            {title}
          </h2>
          {categoryId && (
            <Link
              to={`/?category=${categoryId}`}
              className="text-xs text-info hover:underline flex items-center gap-0.5"
            >
              Voir tout <ChevronRight size={13} />
            </Link>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
        {videos.map(v => <VideoCard key={v.id} video={v} />)}
      </div>
    </section>
  )
}

export default function Home() {
  const { categories, videos, mode, search, categoryId } = useLoaderData<typeof loader>()

  if (mode === 'search') return (
    <div className="p-4 sm:p-6">
      <h1 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5">
        Résultats pour « {search} »
      </h1>
      <VideoGrid videos={videos} />
    </div>
  )

  if (mode === 'category') {
    const cat = categories.find(c => c.id === categoryId)
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5 flex items-center gap-2">
          <FolderOpen size={18} />
          {cat?.name ?? 'Catégorie'}
        </h1>
        <VideoGrid videos={videos} />
      </div>
    )
  }

  if (mode === 'recent') return (
    <div className="p-4 sm:p-6">
      <h1 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5">
        Récemment ajoutées
      </h1>
      <VideoGrid videos={videos} />
    </div>
  )

  return (
    <div className="p-4 sm:p-6">
      {categories.map(cat => (
        <VideoGrid
          key={cat.id}
          videos={videos.filter(v => v.category === cat.id)}
          title={cat.name}
          categoryId={cat.id}
        />
      ))}
    </div>
  )
}
