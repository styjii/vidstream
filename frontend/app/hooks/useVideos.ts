import { useState, useEffect } from 'react'
import { api } from '../services/api'
import type { Video, Category } from '../types'

export function useVideos(params: Record<string, string> = {}) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const key = JSON.stringify(params)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.getVideos(params)
      .then(setVideos)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [key])

  return { videos, loading, error }
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}

export function useVideo(id: string | undefined) {
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.getVideo(id)
      .then(setVideo)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  return { video, loading, error }
}
