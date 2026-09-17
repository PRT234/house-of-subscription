import os
import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from subscriptions.models import KnownService

class Command(BaseCommand):
    help = 'Seeds known subscription services from seed_data/known_services.json'

    def handle(self, *args, **options):
        json_path = settings.BASE_DIR / 'seed_data' / 'known_services.json'
        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f"File not found: {json_path}"))
            return

        with open(json_path, 'r', encoding='utf-8') as f:
            services_data = json.load(f)

        created_count = 0
        updated_count = 0

        for item in services_data:
            _, created = KnownService.objects.update_or_create(
                name=item['name'],
                defaults={
                    'category': item.get('category', 'other'),
                    'logo_url': item.get('logo_url'),
                    'default_cost': item.get('default_cost'),
                    'currency': item.get('currency', 'INR'),
                    'cancel_url': item.get('cancel_url'),
                    'cancel_steps': item.get('cancel_steps'),
                    'aliases': item.get('aliases', []),
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded known services. Created: {created_count}, Updated: {updated_count}, Total in DB: {KnownService.objects.count()}"
            )
        )
