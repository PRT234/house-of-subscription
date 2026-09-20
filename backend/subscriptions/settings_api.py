from typing import Optional
from ninja import Router, Schema
from django.conf import settings
from cryptography.fernet import Fernet

from accounts.authentication import JWTAuth
from subscriptions.models import UserSettings

router = Router(tags=['Settings'], auth=JWTAuth())

class SettingsOut(Schema):
    currency: str
    reminder_days: int
    theme: str
    notifications_enabled: bool
    has_own_key: bool
    ai_imports_used: int
    ai_imports_limit: int = 10

class SettingsUpdateIn(Schema):
    currency: Optional[str] = None
    reminder_days: Optional[int] = None
    theme: Optional[str] = None
    notifications_enabled: Optional[bool] = None

class GeminiKeyIn(Schema):
    api_key: str

class KeyStatusOut(Schema):
    has_own_key: bool

@router.get('/', response=SettingsOut)
def get_settings(request):
    from subscriptions.services import get_ai_quota_settings
    user_settings = get_ai_quota_settings(request.auth)
    return SettingsOut(
        currency=user_settings.currency or 'INR',
        reminder_days=user_settings.reminder_days,
        theme=user_settings.theme or 'dark',
        notifications_enabled=user_settings.notifications_enabled,
        has_own_key=bool(user_settings.gemini_api_key_encrypted),
        ai_imports_used=user_settings.ai_imports_used,
        ai_imports_limit=10,
    )

@router.put('/', response=SettingsOut)
def update_settings(request, data: SettingsUpdateIn):
    user_settings, _ = UserSettings.objects.get_or_create(user=request.auth)
    if data.currency is not None:
        user_settings.currency = data.currency
    if data.reminder_days is not None:
        user_settings.reminder_days = data.reminder_days
    if data.theme is not None:
        user_settings.theme = data.theme
    if data.notifications_enabled is not None:
        user_settings.notifications_enabled = data.notifications_enabled

    user_settings.save()

    return SettingsOut(
        currency=user_settings.currency or 'INR',
        reminder_days=user_settings.reminder_days,
        theme=user_settings.theme or 'dark',
        notifications_enabled=user_settings.notifications_enabled,
        has_own_key=bool(user_settings.gemini_api_key_encrypted),
        ai_imports_used=user_settings.ai_imports_used,
        ai_imports_limit=10,
    )

@router.post('/gemini-key', response=KeyStatusOut)
def save_gemini_key(request, data: GeminiKeyIn):
    user_settings, _ = UserSettings.objects.get_or_create(user=request.auth)
    api_key = data.api_key.strip()
    if not api_key:
        return KeyStatusOut(has_own_key=False)

    fernet_key = settings.ENCRYPTION_KEY
    if isinstance(fernet_key, str):
        fernet_key = fernet_key.encode()

    f = Fernet(fernet_key)
    encrypted_bytes = f.encrypt(api_key.encode())

    user_settings.gemini_api_key_encrypted = encrypted_bytes.decode()
    user_settings.ai_imports_used = 0
    user_settings.save()

    return KeyStatusOut(has_own_key=True)

@router.delete('/gemini-key', response=KeyStatusOut)
def remove_gemini_key(request):
    user_settings, _ = UserSettings.objects.get_or_create(user=request.auth)
    user_settings.gemini_api_key_encrypted = None
    user_settings.save(update_fields=['gemini_api_key_encrypted'])
    return KeyStatusOut(has_own_key=False)
