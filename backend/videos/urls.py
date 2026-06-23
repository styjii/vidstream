"""
VidStream — videos/urls.py
"""

from django.urls import path
from . import views

urlpatterns = [
    # Categories
    path('categories/',                     views.category_list,   name='category-list'),

    # Videos
    path('videos/',                         views.video_list,      name='video-list'),
    path('videos/<uuid:pk>/',               views.video_detail,    name='video-detail'),
    path('videos/<uuid:pk>/stream/',        views.video_stream,    name='video-stream'),
    path('videos/<uuid:pk>/thumbnail/',     views.video_thumbnail, name='video-thumbnail'),

    # Upload
    path('videos/upload/',                  views.video_upload,    name='video-upload'),

    # Scan
    path('scan/',                           views.trigger_scan,    name='trigger-scan'),

    # Devices
    path('devices/',                        views.device_list,     name='device-list'),

    # History + progress
    path('history/',                        views.watch_history,   name='watch-history'),
    path('videos/<uuid:pk>/progress/',      views.save_progress,   name='save-progress'),
]
