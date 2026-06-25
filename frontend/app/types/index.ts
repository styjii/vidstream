export interface Category {
  id: string
  name: string
  icon: string
  folder_path: string
  parent: string | null
  full_path: string
  video_count: number
  total_video_count: number
  children: Category[]
  created_at: string
}

export interface Video {
  id: string
  title: string
  category: string
  category_name: string
  duration_sec: number
  duration_display: string
  file_size_mb: number
  format: string
  resolution: string
  scanned_at: string
  last_watched: string | null
  thumbnail_url: string | null
  stream_url: string
}

export interface Device {
  id: string
  name: string
  ip_address: string
  mac_address: string
  first_seen: string
  last_seen: string
}

export interface WatchHistory {
  id: string
  video: string
  video_title: string
  device: string
  device_name: string
  progress_sec: number
  completed: boolean
  watched_at: string
}

export interface ScanResult {
  message: string
  total_added: number
  total_skipped: number
  categories: { name: string; added: number; skipped: number }[]
}