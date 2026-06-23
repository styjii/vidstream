"""
VidStream — Video folder scanner
Scans configured folders, extracts metadata via ffprobe,
generates thumbnails via ffmpeg, and indexes videos in the database.
"""

import os
import subprocess
import json
import logging
from pathlib import Path

from django.conf import settings

from .models import Category, Video

logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = getattr(settings, 'VIDEO_EXTENSIONS', [
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'
])


# ------------------------------------------------------------------ #
#  Metadata extraction                                                #
# ------------------------------------------------------------------ #

def get_video_metadata(file_path: str) -> dict:
    """
    Extract duration, format and resolution from a video file using ffprobe.
    Returns a dict with keys: duration_sec, format, resolution.
    Returns empty dict on failure.
    """
    try:
        cmd = [
            'ffprobe', '-v', 'quiet',
            '-print_format', 'json',
            '-show_streams', '-show_format',
            file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)

        duration_sec = int(float(data.get('format', {}).get('duration', 0)))

        # Find the video stream for resolution
        resolution = ''
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                w = stream.get('width', 0)
                h = stream.get('height', 0)
                resolution = f'{w}x{h}'
                break

        fmt = data.get('format', {}).get('format_name', '').split(',')[0]

        return {
            'duration_sec': duration_sec,
            'format':       fmt,
            'resolution':   resolution,
        }

    except Exception as e:
        logger.warning(f'ffprobe failed for {file_path}: {e}')
        return {}


# ------------------------------------------------------------------ #
#  Thumbnail generation                                               #
# ------------------------------------------------------------------ #

def generate_thumbnail(file_path: str, video_id: str) -> str | None:
    """
    Generate a thumbnail image at 10% of the video duration using ffmpeg.
    Saves it to MEDIA_ROOT/thumbnails/<video_id>.jpg.
    Returns the thumbnail path or None on failure.
    """
    try:
        thumb_dir = Path(settings.MEDIA_ROOT) / 'thumbnails'
        thumb_dir.mkdir(parents=True, exist_ok=True)
        thumb_path = thumb_dir / f'{video_id}.jpg'

        # Get duration to calculate 10% timestamp
        meta = get_video_metadata(file_path)
        duration = meta.get('duration_sec', 0)
        timestamp = max(1, duration // 10)

        cmd = [
            'ffmpeg', '-y',
            '-ss', str(timestamp),
            '-i', file_path,
            '-vframes', '1',
            '-q:v', '2',
            str(thumb_path)
        ]
        subprocess.run(cmd, capture_output=True, timeout=30)

        if thumb_path.exists():
            return str(thumb_path)

    except Exception as e:
        logger.warning(f'Thumbnail generation failed for {file_path}: {e}')

    return None


# ------------------------------------------------------------------ #
#  File size helper                                                   #
# ------------------------------------------------------------------ #

def get_file_size_mb(file_path: str) -> int:
    """Return file size in megabytes."""
    try:
        return os.path.getsize(file_path) // (1024 * 1024)
    except OSError:
        return 0


# ------------------------------------------------------------------ #
#  Core scanner                                                       #
# ------------------------------------------------------------------ #

def scan_folder(category: Category) -> dict:
    """
    Scan a single category folder and index new video files.
    Skips files already in the database.
    Returns a summary dict: {added, skipped, errors}.
    """
    summary = {'added': 0, 'skipped': 0, 'errors': 0}
    folder = Path(category.folder_path)

    if not folder.exists():
        logger.error(f'Folder not found: {folder}')
        return summary

    # Collect all existing file paths to avoid duplicates
    existing_paths = set(Video.objects.values_list('file_path', flat=True))

    for root, _, files in os.walk(folder):
        for filename in files:
            ext = Path(filename).suffix.lower()
            if ext not in VIDEO_EXTENSIONS:
                continue

            file_path = str(Path(root) / filename)

            # Skip already indexed files
            if file_path in existing_paths:
                summary['skipped'] += 1
                continue

            try:
                title    = Path(filename).stem
                meta     = get_video_metadata(file_path)
                size_mb  = get_file_size_mb(file_path)

                video = Video.objects.create(
                    category     = category,
                    title        = title,
                    file_path    = file_path,
                    duration_sec = meta.get('duration_sec', 0),
                    file_size_mb = size_mb,
                    format       = meta.get('format', ext.lstrip('.')),
                    resolution   = meta.get('resolution', ''),
                )

                # Generate thumbnail after creating the video
                thumb_path = generate_thumbnail(file_path, str(video.id))
                if thumb_path:
                    video.thumbnail_path = thumb_path
                    video.save(update_fields=['thumbnail_path'])

                summary['added'] += 1
                logger.info(f'Indexed: {title}')

            except Exception as e:
                summary['errors'] += 1
                logger.error(f'Failed to index {file_path}: {e}')

    return summary


def scan_all_folders() -> dict:
    """
    Scan all configured folders from settings.VIDEO_SCAN_FOLDERS.
    Creates Category objects if they don't exist yet.
    Returns a global summary.
    """
    global_summary = {'added': 0, 'skipped': 0, 'errors': 0}
    folders = getattr(settings, 'VIDEO_SCAN_FOLDERS', [])

    if not folders:
        logger.warning('No VIDEO_SCAN_FOLDERS configured in settings.')
        return global_summary

    for folder_config in folders:
        name   = folder_config.get('name', 'Inconnu')
        path   = folder_config.get('path', '')
        icon   = folder_config.get('icon', 'folder')

        if not path:
            continue

        # Get or create the category
        category, created = Category.objects.get_or_create(
            folder_path=path,
            defaults={'name': name, 'icon': icon}
        )

        if created:
            logger.info(f'Nouvelle catégorie créée : {name}')

        logger.info(f'Scanning: {name} ({path})')
        summary = scan_folder(category)

        for key in global_summary:
            global_summary[key] += summary[key]

        logger.info(
            f'{name} — {summary["added"]} ajoutées, '
            f'{summary["skipped"]} ignorées, '
            f'{summary["errors"]} erreurs'
        )

    return global_summary
