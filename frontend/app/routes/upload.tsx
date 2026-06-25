import type { Route } from './+types/upload'
import { useState, useRef } from 'react'
import { useLoaderData } from 'react-router'
import { Upload as UploadIcon, FileVideo, CheckCircle, XCircle, Server } from 'lucide-react'
import { api, dedupeById } from '../services/api'
import type { Category } from '../types'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'VidStream — Envoyer une vidéo' }]
}

export async function loader(): Promise<{ categories: Category[] }> {
  const categories = await api.getCategories()
  return { categories: dedupeById(categories) }
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`
  return `${mb.toFixed(1)} Mo`
}

export default function Upload() {
  const { categories } = useLoaderData<typeof loader>()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  function handleReset() {
    setFile(null); setTitle(''); setProgress(0)
    setStatus('idle'); setMessage('')
  }

  function handleSubmit() {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title || file.name.replace(/\.[^.]+$/, ''))
    if (categoryId) formData.append('category_id', categoryId)

    setStatus('uploading'); setProgress(0)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', api.getUploadUrl())
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 201) {
        setStatus('done')
        setMessage('Vidéo envoyée avec succès !')
        setFile(null); setTitle(''); setProgress(0)
      } else {
        setStatus('error'); setMessage("Erreur lors de l'envoi.")
      }
    }
    xhr.onerror = () => { setStatus('error'); setMessage('Connexion impossible.') }
    xhr.send(formData)
  }

  return (
    <div className="p-3 sm:p-5 xl:p-6 min-h-full flex items-start justify-center">
      <div className="w-full max-w-lg">
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body gap-4 p-4 sm:p-6">
            <h1 className="card-title text-base gap-2">
              <UploadIcon size={18} />
              Envoyer une vidéo vers le serveur
            </h1>

            {/* Server info */}
            <div className="alert alert-success py-2 text-sm gap-2">
              <Server size={15} />
              Connecté au serveur LAN local
            </div>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${file
                  ? 'border-error bg-error/5'
                  : 'border-base-300 hover:border-error hover:bg-base-200'
                }`}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*,.mkv"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileVideo size={36} className="text-error" />
                  <p className="text-sm font-medium break-all px-2">{file.name}</p>
                  <p className="text-xs text-base-content/50">{formatSize(file.size)}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadIcon size={36} className="text-base-content/30" />
                  <p className="text-sm font-medium text-base-content/70">
                    Glisser-déposer une vidéo ici
                  </p>
                  <p className="text-xs text-base-content/40">
                    ou toucher pour parcourir · mp4, mkv, avi, mov
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {status === 'uploading' && (
              <div className="flex items-center gap-3">
                <progress className="progress progress-error flex-1" value={progress} max="100" />
                <span className="text-sm font-medium w-10 text-right tabular-nums">{progress}%</span>
              </div>
            )}

            {/* Alerts */}
            {status === 'done' && (
              <div className="alert alert-success text-sm gap-2">
                <CheckCircle size={16} /> {message}
              </div>
            )}
            {status === 'error' && (
              <div className="alert alert-error text-sm gap-2">
                <XCircle size={16} /> {message}
              </div>
            )}

            {/* Fields — always stacked (2-col on sm+ only if space permits) */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="label py-1">
                  <span className="label-text text-xs font-medium">Catégorie de destination</span>
                </label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                >
                  <option value="">Uploads (par défaut)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="label py-1">
                  <span className="label-text text-xs font-medium">Titre (optionnel)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="Laisser vide = nom du fichier"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="card-actions justify-end gap-2 pt-1">
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>
                Annuler
              </button>
              <button
                className="btn btn-error btn-sm text-white gap-2"
                onClick={handleSubmit}
                disabled={!file || status === 'uploading'}
              >
                {status === 'uploading' ? (
                  <><span className="loading loading-spinner loading-xs" /> {progress}%</>
                ) : (
                  <><UploadIcon size={14} /> Envoyer</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}