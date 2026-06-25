import type { Category, Video, Device, ScanResult, WatchHistory } from '../types'

const BASE_URL =
  typeof process !== 'undefined' && process.env.API_URL
    ? process.env.API_URL
    : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api')

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!response.ok) throw new Error(`Erreur ${response.status}`)
  return response.json() as Promise<T>
}

export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export const api = {
  resolveUrl: (path: string | null): string | null => {
    if (!path) return null
    if (/^https?:\/\//i.test(path)) return path
    return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  },

  getCategories: () =>
    request<Category[]>('/categories/'),

  getVideos: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString()
    return request<Video[]>(`/videos/${query ? '?' + query : ''}`)
  },

  getVideo: (id: string) => request<Video>(`/videos/${id}/`),
  getUploadUrl: () => `${BASE_URL}/videos/upload/`,

  triggerScan: () =>
    request<ScanResult>('/scan/', { method: 'POST' }),

  getDevices: () =>
    request<Device[]>('/devices/'),

  getHistory: () =>
    request<WatchHistory[]>('/history/'),

  saveProgress: (id: string, data: { progress_sec: number; completed: boolean }) =>
    request(`/videos/${id}/progress/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
