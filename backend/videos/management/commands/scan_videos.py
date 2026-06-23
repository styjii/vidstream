"""
VidStream — Management command
Usage: python manage.py scan_videos
"""

from django.core.management.base import BaseCommand
from videos.scanner import scan_all_folders


class Command(BaseCommand):
    help = 'Scan configured folders and index video files into the database'

    def handle(self, *args, **kwargs):
        self.stdout.write('Démarrage du scan...\n')
        summary = scan_all_folders()
        self.stdout.write(
            self.style.SUCCESS(
                f'\nScan terminé — '
                f'{summary["added"]} vidéo(s) ajoutée(s), '
                f'{summary["skipped"]} ignorée(s), '
                f'{summary["errors"]} erreur(s).'
            )
        )
