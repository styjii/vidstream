// VidStream — Home route (responsive + lucide-react)

import type { Route }               from './+types/home'
import { Link, useSearchParams }    from 'react-router'
import { ChevronRight, FolderOpen } from 'lucide-react'
import { useVideos, useCategories } from '../hooks/useVideos'
import VideoCard                    from '../components/VideoCard'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Accueil' }]
}

interface VideoGridProps {
  params:      Record<string, string>
  title?:      string
  categoryId?: string
}

function VideoGrid({ params, title, categoryId }: VideoGridProps) {
  const { videos, loading, error } = useVideos(params)

  if (loading) return (
    <div className="flex justify-center py-10">
      <span className="loading loading-spinner loading-md text-error" />
    </div>
  )
  if (error) return (
    <div className="alert alert-error text-sm my-4">{error}</div>
  )
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
  const [searchParams] = useSearchParams()
  const search         = searchParams.get('search')
  const categoryId     = searchParams.get('category')
  const recent         = searchParams.has('recent')
  const { categories } = useCategories()

  if (search) return (
    <div className="p-4 sm:p-6">
      <h1 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5">
        Résultats pour « {search} »
      </h1>
      <VideoGrid params={{ search }} />
    </div>
  )

  if (categoryId) {
    const cat = categories.find(c => c.id === categoryId)
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5 flex items-center gap-2">
          <FolderOpen size={18} />
          {cat?.name ?? 'Catégorie'}
        </h1>
        <VideoGrid params={{ category: categoryId }} />
      </div>
    )
  }

  if (recent) return (
    <div className="p-4 sm:p-6">
      <h1 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5">
        Récemment ajoutées
      </h1>
      <VideoGrid params={{ recent: 'true' }} />
    </div>
  )

  return (
    <div className="p-4 sm:p-6">
      {categories.map(cat => (
        <VideoGrid
          key={cat.id}
          params={{ category: cat.id }}
          title={cat.name}
          categoryId={cat.id}
        />
      ))}
    </div>
  )
}
