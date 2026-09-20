from ninja import Router
from django.conf import settings
from cryptography.fernet import Fernet
from pydantic import BaseModel
from typing import List
from accounts.models import ConnectedEmailAccount
from accounts.authentication import JWTAuth
import json

router = Router(tags=['Email Scanning'])
auth = JWTAuth()

class EmailAccountOut(BaseModel):
    id: str
    email_address: str
    connected_at: str
    last_scanned_at: str | None = None

class ConnectEmailRequest(BaseModel):
    email_address: str
    refresh_token: str

def _get_fernet():
    fernet_key = settings.ENCRYPTION_KEY
    if isinstance(fernet_key, str):
        fernet_key = fernet_key.encode()
    return Fernet(fernet_key)

def check_feature_flag(request):
    if not settings.FEATURE_EMAIL_SCAN:
        return 403, {'detail': 'Email scanning feature is disabled.'}
    return None

@router.get('/accounts', response={200: List[EmailAccountOut], 403: dict}, auth=auth)
def list_accounts(request):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check
    
    accounts = ConnectedEmailAccount.objects.filter(user=request.auth)
    return 200, [
        {
            'id': str(acc.id),
            'email_address': acc.email_address,
            'connected_at': acc.connected_at.isoformat(),
            'last_scanned_at': acc.last_scanned_at.isoformat() if acc.last_scanned_at else None
        } for acc in accounts
    ]

@router.post('/connect', response={200: dict, 400: dict, 403: dict}, auth=auth)
def connect_account(request, payload: ConnectEmailRequest):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check

    f = _get_fernet()
    encrypted_token = f.encrypt(payload.refresh_token.encode()).decode()

    account, created = ConnectedEmailAccount.objects.update_or_create(
        user=request.auth,
        email_address=payload.email_address,
        defaults={
            'oauth_refresh_token_encrypted': encrypted_token
        }
    )
    return 200, {'status': 'success', 'id': str(account.id)}

@router.delete('/accounts/{account_id}', response={200: dict, 403: dict, 404: dict}, auth=auth)
def disconnect_account(request, account_id: str):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check

    try:
        account = ConnectedEmailAccount.objects.get(id=account_id, user=request.auth)
        account.delete()
        return 200, {'status': 'deleted'}
    except ConnectedEmailAccount.DoesNotExist:
        return 404, {'detail': 'Account not found'}

@router.post('/scan/{account_id}', response={200: dict, 403: dict, 404: dict}, auth=auth)
def scan_account(request, account_id: str):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check

    try:
        account = ConnectedEmailAccount.objects.get(id=account_id, user=request.auth)
        # Mocking the scan process for now
        from django.utils import timezone
        account.last_scanned_at = timezone.now()
        account.save()
        return 200, {'status': 'scanned', 'message': 'Scan initiated/completed successfully.'}
    except ConnectedEmailAccount.DoesNotExist:
        return 404, {'detail': 'Account not found'}
