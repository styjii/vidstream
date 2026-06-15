# 🎬 VidStream

Serveur multimédia personnel en réseau local (LAN). Parcourez et regardez les vidéos stockées sur votre PC depuis n'importe quel appareil connecté au même réseau — sans aucun service cloud.

![Stack](https://img.shields.io/badge/Backend-Django%205-green?style=flat-square)
![Stack](https://img.shields.io/badge/Frontend-React%2018-blue?style=flat-square)
![Stack](https://img.shields.io/badge/Base%20de%20données-SQLite-orange?style=flat-square)
![License](https://img.shields.io/badge/Licence-MIT-lightgrey?style=flat-square)

---

## ✨ Fonctionnalités

- **Scan automatique** des dossiers vidéo configurés (Films, Séries, Musique…)
- **Streaming LAN** avec support des `Range` headers (avancer/reculer dans la vidéo)
- **Interface style YouTube** : grille par catégorie, lecteur intégré, recherche
- **Upload depuis le réseau** : envoyer une vidéo depuis un autre PC ou téléphone vers le serveur
- **Historique de lecture** et reprise automatique par appareil
- **Détection des appareils LAN** connectés en temps réel
- **Dark mode** automatique

---

## 🗂️ Structure du projet

```
vidstream/
├── backend/                   # API Django
│   ├── config/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── videos/                # App principale
│   │   ├── models.py          # Category, Video, Device, WatchHistory, Upload
│   │   ├── scanner.py         # Scan automatique des dossiers
│   │   ├── serializers.py
│   │   ├── views.py           # Stream, upload, liste, historique
│   │   └── urls.py
│   ├── manage.py
│   └── requirements.txt
├── frontend/                  # Interface React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx       # Grille des vidéos
│   │   │   ├── Player.jsx     # Lecteur vidéo
│   │   │   ├── Upload.jsx     # Page d'envoi
│   │   │   └── Settings.jsx   # Dossiers + appareils
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── VideoCard.jsx
│   │   │   └── Sidebar.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## 🗄️ Schéma de la base de données (SQLite)

```
CATEGORY          VIDEO                DEVICE
─────────         ──────────────       ──────────────
id (PK)      ←── category_id (FK)     id (PK)
name              id (PK)              name
folder_path       title                ip_address
icon              file_path            mac_address
created_at        thumbnail_path       first_seen
                  duration_sec         last_seen
                  file_size_mb              │
                  format                    │
                  resolution           WATCH_HISTORY
                  scanned_at      ←── device_id (FK)
                  last_watched    ←── video_id (FK)
                       │              progress_sec
                       │              completed
                    UPLOAD            watched_at
               ←── video_id (FK)
               ←── device_id (FK)
                   original_filename
                   file_size_mb
                   status
                   uploaded_at
```

---

## 🚀 Installation

### Prérequis

- Python 3.11+
- Node.js 20+
- `ffmpeg` installé et accessible dans le PATH (pour les miniatures)

### 1. Cloner le dépôt

```bash
git clone https://github.com/ton-utilisateur/vidstream.git
cd vidstream
```

### 2. Backend Django

```bash
cd backend

# Créer et activer l'environnement virtuel
python -m venv .venv
source .venv/bin/activate        # Linux / macOS
# .venv\Scripts\activate         # Windows

# Installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations
python manage.py migrate

# Lancer le serveur
python manage.py runserver 0.0.0.0:8000
```

> Le serveur écoute sur `0.0.0.0:8000` pour être accessible depuis le réseau local.

### 3. Frontend React

```bash
cd frontend

npm install
npm run dev
```

L'interface sera accessible sur `http://localhost:5173` (ou `http://<IP-du-serveur>:5173` depuis un autre appareil).

---

## ⚙️ Configuration des dossiers à scanner

Dans `backend/config/settings.py`, définir les dossiers vidéo :

```python
VIDEO_SCAN_FOLDERS = [
    {"name": "Films",   "path": "/home/user/Videos/Films"},
    {"name": "Séries",  "path": "/home/user/Videos/Séries"},
    {"name": "Musique", "path": "/home/user/Videos/Musique"},
    {"name": "Uploads", "path": "/home/user/Videos/Uploads"},
]

MEDIA_ROOT = "/home/user/Videos"
```

Pour déclencher un scan manuellement :

```bash
python manage.py scan_videos
```

---

## 📡 Accès depuis le réseau local

1. Trouver l'adresse IP du PC serveur :
   ```bash
   ip a | grep inet        # Linux
   ipconfig                # Windows
   ```
2. Sur les autres appareils du réseau, ouvrir :
   ```
   http://192.168.1.X:5173
   ```
   (remplacer `192.168.1.X` par l'IP réelle du serveur)

---

## 📦 Dépendances principales

### Backend (`requirements.txt`)
| Package | Rôle |
|---|---|
| `django` | Framework web |
| `djangorestframework` | API REST |
| `django-cors-headers` | Autoriser les requêtes React → Django |
| `ffmpeg-python` | Génération des miniatures |

### Frontend (`package.json`)
| Package | Rôle |
|---|---|
| `react` + `react-router-dom` | UI + navigation |
| `axios` | Appels API |
| `react-player` | Lecteur vidéo |
| `@tabler/icons-react` | Icônes |

---

## 🛠️ Endpoints API (Django REST)

| Méthode | URL | Description |
|---|---|---|
| `GET` | `/api/videos/` | Liste toutes les vidéos |
| `GET` | `/api/videos/?category=Films` | Filtrer par catégorie |
| `GET` | `/api/videos/<id>/stream/` | Streamer une vidéo (Range support) |
| `GET` | `/api/videos/<id>/thumbnail/` | Miniature de la vidéo |
| `POST` | `/api/videos/upload/` | Envoyer une vidéo depuis le LAN |
| `GET` | `/api/categories/` | Liste des catégories |
| `POST` | `/api/scan/` | Déclencher un nouveau scan |
| `GET` | `/api/devices/` | Appareils connectés au LAN |
| `GET` | `/api/history/` | Historique de lecture |
| `POST` | `/api/history/<id>/progress/` | Sauvegarder la progression |

---

## 📄 Licence

MIT — libre d'utilisation personnelle et modification.
