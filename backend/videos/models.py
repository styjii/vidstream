"""
VidStream — Models
Tables: Category, Video, Device, WatchHistory, Upload
"""

import uuid
from django.db import models


class Category(models.Model):
    """Scanned folder (Movies, Series, Music...)"""

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=100)
    folder_path = models.TextField(unique=True)
    icon        = models.CharField(max_length=50, default='folder')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Catégorie'
        verbose_name_plural = 'Catégories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Video(models.Model):
    """Video file indexed by the scanner."""

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category       = models.ForeignKey(Category, on_delete=models.SET_NULL,
                                       null=True, related_name='videos')
    title          = models.CharField(max_length=255)
    file_path      = models.TextField(unique=True)
    thumbnail_path = models.TextField(blank=True, null=True)
    duration_sec   = models.IntegerField(default=0)
    file_size_mb   = models.IntegerField(default=0)
    format         = models.CharField(max_length=10, blank=True)
    resolution     = models.CharField(max_length=20, blank=True)
    scanned_at     = models.DateTimeField(auto_now_add=True)
    last_watched   = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name        = 'Vidéo'
        verbose_name_plural = 'Vidéos'
        ordering = ['-scanned_at']

    def __str__(self):
        return self.title

    @property
    def duration_display(self):
        """Return duration formatted as HH:MM:SS (or MM:SS when under one hour)."""
        h = self.duration_sec // 3600
        m = (self.duration_sec % 3600) // 60
        s = self.duration_sec % 60
        if h:
            return f'{h}:{m:02d}:{s:02d}'
        return f'{m}:{s:02d}'


class Device(models.Model):
    """LAN device that connects to the server."""

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=100, default='Appareil inconnu')
    ip_address  = models.GenericIPAddressField()
    mac_address = models.CharField(max_length=17, blank=True)
    first_seen  = models.DateTimeField(auto_now_add=True)
    last_seen   = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Appareil'
        verbose_name_plural = 'Appareils'
        ordering = ['-last_seen']

    def __str__(self):
        return f'{self.name} ({self.ip_address})'


class WatchHistory(models.Model):
    """Playback progress per video/device pair."""

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    video        = models.ForeignKey(Video, on_delete=models.CASCADE,
                                     related_name='history')
    device       = models.ForeignKey(Device, on_delete=models.CASCADE,
                                     related_name='history')
    progress_sec = models.IntegerField(default=0)
    completed    = models.BooleanField(default=False)
    watched_at   = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Historique'
        verbose_name_plural = 'Historiques'
        ordering     = ['-watched_at']
        unique_together = ['video', 'device']  # one record per video/device pair

    def __str__(self):
        return f'{self.device} → {self.video.title} ({self.progress_sec}s)'


class Upload(models.Model):
    """File sent from a LAN device to the server."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'En cours'
        DONE    = 'done',    'Terminé'
        ERROR   = 'error',   'Erreur'

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    video             = models.OneToOneField(Video, on_delete=models.SET_NULL,
                                          related_name='upload', null=True, blank=True)
    device            = models.ForeignKey(Device, on_delete=models.SET_NULL,
                                          null=True, related_name='uploads')
    original_filename = models.CharField(max_length=255)
    file_size_mb      = models.IntegerField(default=0)
    status            = models.CharField(max_length=20, choices=Status.choices,
                                         default=Status.PENDING)
    uploaded_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Envoi'
        verbose_name_plural = 'Envois'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.original_filename} — {self.Status(self.status).label}'