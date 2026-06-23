"""
VidStream — API Views
Endpoints:
  1. Videos list + categories
  2. Video streaming with Range headers
  3. Upload from LAN device
  4. Watch history + progress
"""

import os
import mimetypes
import logging
from pathlib import Path

from django.http       import FileResponse, StreamingHttpResponse, Http404
from django.utils      import timezone
from django.shortcuts  import get_object_or_404
from django.conf       import settings

from rest_framework             import status
from rest_framework.decorators  import api_view, parser_classes
from rest_framework.parsers     import MultiPartParser, FormParser
from rest_framework.response    import Response

from .models      import Category, Video, Device, WatchHistory, Upload
from .serializers import (
    CategorySerializer, VideoSerializer,
    DeviceSerializer, WatchHistorySerializer, UploadSerializer,
)
from .scanner import scan_all_folders

logger = logging.getLogger(__name__)

CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB chunks for streaming


# ------------------------------------------------------------------ #
#  Helper — register or update the calling device                     #
# ------------------------------------------------------------------ #

def get_or_create_device(request) -> Device:
    """Register a LAN device based on its IP address."""
    ip   = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    ip   = ip.split(',')[0].strip()
    name = request.META.get('HTTP_X_DEVICE_NAME', 'Appareil inconnu')

    device, _ = Device.objects.update_or_create(
        ip_address=ip,
        defaults={'name': name},
    )
    return device


# ------------------------------------------------------------------ #
#  1. Categories                                                       #
# ------------------------------------------------------------------ #

@api_view(['GET'])
def category_list(request):
    """Return all categories with their video count."""
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True, context={'request': request})
    return Response(serializer.data)


# ------------------------------------------------------------------ #
#  2. Videos                                                          #
# ------------------------------------------------------------------ #

@api_view(['GET'])
def video_list(request):
    """
    Return all videos. Optional filters:
      ?category=<uuid>
      ?search=<query>
      ?recent=true   → last 20 added
    """
    videos = Video.objects.select_related('category').all()

    category_id = request.query_params.get('category')
    search      = request.query_params.get('search')
    recent      = request.query_params.get('recent')

    if category_id:
        videos = videos.filter(category__id=category_id)

    if search:
        videos = videos.filter(title__icontains=search)

    if recent:
        videos = videos.order_by('-scanned_at')[:20]

    serializer = VideoSerializer(videos, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def video_detail(request, pk):
    """Return details for a single video."""
    video      = get_object_or_404(Video, pk=pk)
    serializer = VideoSerializer(video, context={'request': request})
    return Response(serializer.data)


# ------------------------------------------------------------------ #
#  3. Streaming with Range headers                                    #
# ------------------------------------------------------------------ #

def _file_iterator(file_obj, start: int, end: int, chunk: int = CHUNK_SIZE):
    """Yield file chunks between start and end byte positions."""
    file_obj.seek(start)
    remaining = end - start + 1
    while remaining > 0:
        data = file_obj.read(min(chunk, remaining))
        if not data:
            break
        remaining -= len(data)
        yield data


@api_view(['GET'])
def video_stream(request, pk):
    """
    Stream a video file with HTTP Range support.
    Allows the player to seek anywhere in the video.
    """
    video = get_object_or_404(Video, pk=pk)

    if not os.path.exists(video.file_path):
        raise Http404('Fichier vidéo introuvable sur le serveur.')

    file_size   = os.path.getsize(video.file_path)
    content_type, _ = mimetypes.guess_type(video.file_path)
    content_type = content_type or 'application/octet-stream'

    range_header = request.META.get('HTTP_RANGE', '').strip()

    # No Range header — serve the full file
    if not range_header:
        response = FileResponse(
            open(video.file_path, 'rb'),
            content_type=content_type,
        )
        response['Content-Length']      = file_size
        response['Accept-Ranges']       = 'bytes'
        response['Content-Disposition'] = f'inline; filename="{Path(video.file_path).name}"'
        # Update last watched timestamp
        Video.objects.filter(pk=pk).update(last_watched=timezone.now())
        return response

    # Parse Range header: "bytes=start-end"
    try:
        range_spec    = range_header.replace('bytes=', '')
        range_start, range_end = range_spec.split('-')
        start = int(range_start)
        end   = int(range_end) if range_end else file_size - 1
    except ValueError:
        return Response(
            {'erreur': 'En-tête Range invalide.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    end = min(end, file_size - 1)

    if start > end or start >= file_size:
        return Response(
            {'erreur': 'Plage demandée non satisfaisable.'},
            status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
        )

    content_length = end - start + 1
    f = open(video.file_path, 'rb')

    response = StreamingHttpResponse(
        _file_iterator(f, start, end),
        status=206,
        content_type=content_type,
    )
    response['Content-Length']  = content_length
    response['Content-Range']   = f'bytes {start}-{end}/{file_size}'
    response['Accept-Ranges']   = 'bytes'

    Video.objects.filter(pk=pk).update(last_watched=timezone.now())
    return response


@api_view(['GET'])
def video_thumbnail(request, pk):
    """Serve the thumbnail image for a video."""
    video = get_object_or_404(Video, pk=pk)

    if not video.thumbnail_path or not os.path.exists(video.thumbnail_path):
        raise Http404('Miniature introuvable.')

    return FileResponse(open(video.thumbnail_path, 'rb'), content_type='image/jpeg')


# ------------------------------------------------------------------ #
#  4. Upload from LAN                                                 #
# ------------------------------------------------------------------ #

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def video_upload(request):
    """
    Receive a video file uploaded from a LAN device.
    Form fields:
      - file        : the video file (required)
      - category_id : UUID of the destination category (optional)
      - title       : custom title (optional, defaults to filename)
    """
    file        = request.FILES.get('file')
    category_id = request.data.get('category_id')
    title       = request.data.get('title', '')

    if not file:
        return Response(
            {'erreur': 'Aucun fichier fourni.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Determine destination folder
    if category_id:
        category = get_object_or_404(Category, pk=category_id)
        dest_dir = Path(category.folder_path)
    else:
        dest_dir = Path(settings.MEDIA_ROOT) / 'uploads'
        category, _ = Category.objects.get_or_create(
            folder_path=str(dest_dir),
            defaults={'name': 'Uploads'},
        )

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / file.name

    # Save the file to disk
    with open(dest_path, 'wb') as f:
        for chunk in file.chunks():
            f.write(chunk)

    device   = get_or_create_device(request)
    size_mb  = int(dest_path.stat().st_size / (1024 * 1024))
    final_title = title or Path(file.name).stem.replace('_', ' ').replace('.', ' ')

    # Create Video entry
    video = Video.objects.create(
        category      = category,
        title         = final_title,
        file_path     = str(dest_path),
        file_size_mb  = size_mb,
        format        = Path(file.name).suffix.lstrip('.').lower(),
    )

    # Create Upload tracking entry
    upload = Upload.objects.create(
        video             = video,
        device            = device,
        original_filename = file.name,
        file_size_mb      = size_mb,
        status            = Upload.Status.DONE,
    )

    return Response(
        {
            'message': 'Vidéo reçue avec succès.',
            'video':   VideoSerializer(video, context={'request': request}).data,
            'upload':  UploadSerializer(upload).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ------------------------------------------------------------------ #
#  5. Scan trigger                                                    #
# ------------------------------------------------------------------ #

@api_view(['POST'])
def trigger_scan(request):
    """Trigger a full folder scan from the API."""
    summary = scan_all_folders()
    return Response({
        'message':       f"{summary['total_added']} vidéo(s) ajoutée(s).",
        'total_added':   summary['total_added'],
        'total_skipped': summary['total_skipped'],
        'categories':    summary['categories'],
    })


# ------------------------------------------------------------------ #
#  6. Devices                                                         #
# ------------------------------------------------------------------ #

@api_view(['GET'])
def device_list(request):
    """Return all known LAN devices."""
    devices    = Device.objects.all()
    serializer = DeviceSerializer(devices, many=True)
    return Response(serializer.data)


# ------------------------------------------------------------------ #
#  7. Watch history + progress                                        #
# ------------------------------------------------------------------ #

@api_view(['GET'])
def watch_history(request):
    """
    Return watch history for the calling device.
    Identified by IP address.
    """
    device  = get_or_create_device(request)
    history = WatchHistory.objects.filter(device=device).select_related('video')
    serializer = WatchHistorySerializer(history, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def save_progress(request, pk):
    """
    Save or update playback progress for a video.
    Body: { "progress_sec": 120, "completed": false }
    """
    video        = get_object_or_404(Video, pk=pk)
    device       = get_or_create_device(request)
    progress_sec = request.data.get('progress_sec', 0)
    completed    = request.data.get('completed', False)

    entry, _ = WatchHistory.objects.update_or_create(
        video=video,
        device=device,
        defaults={
            'progress_sec': progress_sec,
            'completed':    completed,
        },
    )

    serializer = WatchHistorySerializer(entry)
    return Response(serializer.data)
