"""
VidStream — videos/urls.py
"""

from django.urls import path
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from . import views


schema_view = get_schema_view(
    openapi.Info(
        title="Snippets API",
        default_version="v1",
        description="Test description",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@snippets.local"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path(
        "swagger<format>/", schema_view.without_ui(cache_timeout=0), name="schema-json"
    ),
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),

    # Categories
    path("categories/", views.category_list, name="category-list"),

    # Videos
    path("videos/", views.video_list, name="video-list"),
    path("videos/<uuid:pk>/", views.video_detail, name="video-detail"),
    path("videos/<uuid:pk>/stream/", views.video_stream, name="video-stream"),
    path("videos/<uuid:pk>/thumbnail/", views.video_thumbnail, name="video-thumbnail"),

    # Upload
    path("videos/upload/", views.video_upload, name="video-upload"),

    # Scan
    path("scan/", views.trigger_scan, name="trigger-scan"),

    # Devices
    path("devices/", views.device_list, name="device-list"),

    # History CRUD + progress
    path("history/", views.watch_history, name="watch-history"),
    path("history/<uuid:pk>/", views.watch_history_detail, name="watch-history-detail"),
    path("videos/<uuid:pk>/progress/", views.save_progress, name="save-progress"),
]
