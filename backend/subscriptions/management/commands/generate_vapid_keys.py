from django.core.management.base import BaseCommand
from py_vapid import Vapid01
import base64

class Command(BaseCommand):
    help = "Generate a fresh VAPID keypair for Web Push and print .env-ready output."

    def handle(self, *args, **options):
        vapid = Vapid01()
        vapid.generate_keys()
        private_pem = vapid.private_pem()
        public_raw = vapid.public_key.public_bytes(
            encoding=__import__('cryptography.hazmat.primitives.serialization', fromlist=['Encoding']).Encoding.X962,
            format=__import__('cryptography.hazmat.primitives.serialization', fromlist=['PublicFormat']).PublicFormat.UncompressedPoint,
        )
        public_b64 = base64.urlsafe_b64encode(public_raw).decode('utf-8').rstrip('=')
        private_raw = vapid.private_key.private_numbers().private_value.to_bytes(32, 'big')
        private_b64 = base64.urlsafe_b64encode(private_raw).decode('utf-8').rstrip('=')

        self.stdout.write(self.style.SUCCESS("Add these to your .env:"))
        self.stdout.write(f"VAPID_PUBLIC_KEY={public_b64}")
        self.stdout.write(f"VAPID_PRIVATE_KEY={private_b64}")
