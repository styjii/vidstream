"""
VidStream — Serializers
"""

from rest_framework import serializers
from .models import Category, Video, Device, WatchHistory, Upload


class CategorySerializer(serializers.ModelSerializer):
    video_count = serializers.IntegerField(source="videos.count", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "icon", "folder_path", "video_count", "created_at"]


class VideoSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
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
