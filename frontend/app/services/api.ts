// VidStream — API service

import type { Category, Video, Device, ScanResult } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!response.ok) throw new Error(`Erreur ${response.status}`)
  return response.json() as Promise<T>
}

export const api = {
  getCategories: () =>
    request<Category[]>('/categories/'),

  getVideos: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString()
    return request<Video[]>(`/videos/${query ? '?' + query : ''}`)
  },

  getVideo:        (id: string) => request<Video>(`/videos/${id}/`),
  getStreamUrl:    (id: string) => `${BASE_URL}/videos/${id}/stream/`,
  getThumbnailUrl: (id: string) => `${BASE_URL}/videos/${id}/thumbnail/`,
  getUploadUrl:    ()           => `${BASE_URL}/videos/upload/`,

  triggerScan: () =>
    request<ScanResult>('/scan/', { method: 'POST' }),

  getDevices: () =>
    request<Device[]>('/devices/'),

  getHistory: () =>
    request('/history/'),

  saveProgress: (id: string, data: { progress_sec: number; completed: boolean }) =>
    request(`/videos/${id}/progress/`, {
      method: 'POST',
      body:   JSON.stringify(data),
    }),
}
