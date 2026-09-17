from datetime import datetime, timedelta, timezone
from jose import jwt
from django.conf import settings
from accounts.models import User
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        'sub': str(user_id),
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def verify_google_token(id_token: str) -> dict:
    """Verify Google ID token locally using google-auth to prevent API rate limits."""
    try:
        request = requests.Request()
        id_info = google_id_token.verify_oauth2_token(
            id_token, request, settings.GOOGLE_CLIENT_ID
        )
        return {
            'email': id_info['email'],
            'name': id_info.get('name', ''),
            'picture': id_info.get('picture', ''),
        }
    except Exception as e:
        raise ValueError(f'Invalid Google token: {str(e)}')
