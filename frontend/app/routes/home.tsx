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

function VideoGrid({ videos }: { videos: Video[] }) {
  if (!videos.length) return (
    <p className="text-sm text-base-content/50 py-2">Aucune vidéo trouvée.</p>
  )
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
      {videos.map(v => <VideoCard key={v.id} video={v} />)}
    </div>
  )
}

/** Affiche une catégorie + ses sous-catégories récursivement */
function CategorySection({
  cat,
  videos,
  depth = 0,
}: {
  cat: Category
  videos: Video[]
  depth?: number
}) {
  const catVideos = videos.filter(v => v.category === cat.id)
  const hasVideos = catVideos.length > 0
  const hasChildren = cat.children.length > 0

  // Ne rien afficher si la catégorie et ses descendants n'ont aucune vidéo
  if (cat.total_video_count === 0) return null

  return (
    <section className={depth === 0 ? 'mb-8 sm:mb-10' : 'mt-5'}>
      {/* En-tête de catégorie */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2
          className={`font-semibold flex items-center gap-2 ${
            depth === 0 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm text-base-content/80'
          }`}
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          <FolderOpen
            size={depth === 0 ? 16 : 14}
            className={depth > 0 ? 'text-base-content/40' : 'text-base-content/50'}
          />
          {depth > 0 && (
            <span className="text-base-content/30 mr-0.5">{'›'.repeat(depth)}</span>
          )}
          {cat.name}
          {cat.total_video_count > 0 && (
            <span className="badge badge-ghost badge-xs font-normal">
              {cat.total_video_count}
            </span>
          )}
        </h2>
        {hasVideos && (
          <Link
            to={`/?category=${cat.id}`}
            className="text-xs text-info hover:underline flex items-center gap-0.5 shrink-0"
          >
            Voir tout <ChevronRight size={13} />
          </Link>
        )}
      </div>

      {/* Vidéos directes de cette catégorie */}
      {hasVideos && (
        <div style={{ paddingLeft: `${depth * 16}px` }}>
          <VideoGrid videos={catVideos} />
        </div>
      )}

      {/* Sous-catégories */}
      {hasChildren && (
        <div>
          {cat.children.map(child => (
            <CategorySection
              key={child.id}
              cat={child}
              videos={videos}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/** Cherche récursivement une catégorie par id dans l'arbre */
function findCategory(cats: Category[], id: string): Category | undefined {
  for (const cat of cats) {
    if (cat.id === id) return cat
    const found = findCategory(cat.children, id)
    if (found) return found
  }
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
    const cat = findCategory(categories, categoryId!)
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-base sm:text-lg font-semibold mb-1 flex items-center gap-2">
          <FolderOpen size={18} />
          {cat?.name ?? 'Catégorie'}
        </h1>
        {cat?.full_path && cat.parent && (
          <p className="text-xs text-base-content/40 mb-4">{cat.full_path}</p>
        )}
        {cat && cat.children.length > 0 ? (
          // Vue catégorie avec sous-catégories
          <div className="mt-4 sm:mt-5">
            {/* Vidéos directes de la catégorie courante */}
            {videos.filter(v => v.category === cat.id).length > 0 && (
              <section className="mb-8">
                <h2 className="text-xs text-base-content/50 uppercase tracking-wider mb-3">
                  Vidéos directes
                </h2>
                <VideoGrid videos={videos.filter(v => v.category === cat.id)} />
              </section>
            )}
            {/* Sous-catégories */}
            {cat.children.map(child => (
              <CategorySection key={child.id} cat={child} videos={videos} depth={0} />
            ))}
          </div>
        ) : (
          <div className="mt-4 sm:mt-5">
            <VideoGrid videos={videos} />
          </div>
        )}
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

  // Mode "all" — vue hiérarchique complète
  return (
    <div className="p-4 sm:p-6">
      {categories.map(cat => (
        <CategorySection key={cat.id} cat={cat} videos={videos} depth={0} />
      ))}
    </div>
  )
}