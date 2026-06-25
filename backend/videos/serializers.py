"""
VidStream — Serializers
"""

from rest_framework import serializers
from .models import Category, Video, Device, WatchHistory, Upload


class CategorySerializer(serializers.ModelSerializer):
    """
    Sérialise une catégorie avec TOUTE sa descendance, peu importe la
    profondeur de l'arborescence (pas de limite à 2 niveaux).

    - `video_count`      : nombre de vidéos directement dans cette catégorie
    - `total_video_count`: nombre de vidéos dans cette catégorie + toutes
                            ses sous-catégories (récursif)
    - `children`         : liste des sous-catégories directes, chacune
                            sérialisée avec ce même serializer → récursion
                            naturelle jusqu'aux feuilles de l'arbre.
    """

    video_count = serializers.IntegerField(source="videos.count", read_only=True)
    total_video_count = serializers.SerializerMethodField()
    full_path = serializers.CharField(read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "icon",
            "folder_path",
            "parent",
            "full_path",
            "video_count",
            "total_video_count",
            "children",
            "created_at",
        ]

    def get_children(self, obj):
        children = obj.children.all().order_by("name")
        return CategorySerializer(children, many=True, context=self.context).data

    def get_total_video_count(self, obj):
        count = obj.videos.count()
        for child in obj.children.all():
            count += self.get_total_video_count(child)
        return count


class VideoSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_path = serializers.SerializerMethodField()
    duration_display = serializers.CharField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    stream_url = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = [
            "id",
            "title",
            "category",
            "category_name",
            "category_path",
            "duration_sec",
            "duration_display",
            "file_size_mb",
            "format",
            "resolution",
            "scanned_at",
            "last_watched",
            "thumbnail_url",
            "stream_url",
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_path(self, obj):
        return obj.category.full_path if obj.category else None

    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        if obj.thumbnail_path and request:
            return request.build_absolute_uri(f"/api/videos/{obj.id}/thumbnail/")
        return None

    def get_stream_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f"/api/videos/{obj.id}/stream/")
        return None


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ["id", "name", "ip_address", "mac_address", "first_seen", "last_seen"]


class WatchHistorySerializer(serializers.ModelSerializer):
    video_title = serializers.CharField(source="video.title", read_only=True)
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = WatchHistory
        fields = [
            "id",
            "video",
            "video_title",
            "device",
            "device_name",
            "progress_sec",
            "completed",
            "watched_at",
        ]


class UploadSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = Upload
        fields = [
            "id",
            "original_filename",
            "file_size_mb",
            "status",
            "status_display",
            "device_name",
            "uploaded_at",
        ]