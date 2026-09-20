from ninja import Router
from django.conf import settings
from cryptography.fernet import Fernet
from pydantic import BaseModel
from typing import List
from accounts.models import BankConnection
from accounts.authentication import JWTAuth
import plaid
from plaid.api import plaid_api
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest

router = Router(tags=['Plaid Integration'])
auth = JWTAuth()

class BankConnectionOut(BaseModel):
    id: str
    institution_name: str
    connected_at: str

class ExchangeTokenRequest(BaseModel):
    public_token: str
    institution_name: str

def _get_fernet():
    fernet_key = settings.ENCRYPTION_KEY
    if isinstance(fernet_key, str):
        fernet_key = fernet_key.encode()
    return Fernet(fernet_key)

def check_feature_flag(request):
    if not settings.FEATURE_BANK_LINK:
        return 403, {'detail': 'Bank linking feature is disabled.'}
    return None

def get_plaid_client():
    configuration = plaid.Configuration(
        host=plaid.Environment.Sandbox if settings.PLAID_ENV == 'sandbox' else plaid.Environment.Production,
        api_key={
            'clientId': settings.PLAID_CLIENT_ID,
            'secret': settings.PLAID_SECRET,
        }
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)

@router.post('/create-link-token', response={200: dict, 403: dict, 500: dict}, auth=auth)
def create_link_token(request):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check

    try:
        client = get_plaid_client()
        req = LinkTokenCreateRequest(
            products=[Products("transactions")],
            client_name="House of Subscriptions",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(
                client_user_id=str(request.auth.id)
            )
        )
        response = client.link_token_create(req)
        return 200, {'link_token': response['link_token']}
    except plaid.ApiException as e:
        return 500, {'detail': str(e)}

@router.post('/exchange-token', response={200: dict, 400: dict, 403: dict}, auth=auth)
def exchange_token(request, payload: ExchangeTokenRequest):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check

    try:
        client = get_plaid_client()
        req = ItemPublicTokenExchangeRequest(
            public_token=payload.public_token
        )
        response = client.item_public_token_exchange(req)
        access_token = response['access_token']
        
        f = _get_fernet()
        encrypted_token = f.encrypt(access_token.encode()).decode()

        connection, created = BankConnection.objects.get_or_create(
            user=request.auth,
            institution_name=payload.institution_name,
            defaults={
                'plaid_access_token_encrypted': encrypted_token
            }
        )
        
        # If not created, just update the token
        if not created:
            connection.plaid_access_token_encrypted = encrypted_token
            connection.save()
            
        return 200, {'status': 'success', 'id': str(connection.id)}
    except plaid.ApiException as e:
        return 400, {'detail': str(e)}

@router.get('/connections', response={200: List[BankConnectionOut], 403: dict}, auth=auth)
def list_connections(request):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check
    
    connections = BankConnection.objects.filter(user=request.auth)
    return 200, [
        {
            'id': str(conn.id),
            'institution_name': conn.institution_name,
            'connected_at': conn.connected_at.isoformat(),
        } for conn in connections
    ]

@router.delete('/connections/{connection_id}', response={200: dict, 403: dict, 404: dict}, auth=auth)
def disconnect_bank(request, connection_id: str):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check

    try:
        connection = BankConnection.objects.get(id=connection_id, user=request.auth)
        connection.delete()
        return 200, {'status': 'deleted'}
    except BankConnection.DoesNotExist:
        return 404, {'detail': 'Connection not found'}

@router.post('/transactions', response={200: dict, 403: dict}, auth=auth)
def fetch_transactions(request):
    flag_check = check_feature_flag(request)
    if flag_check:
        return flag_check
    
    # Stub for future Gemini integration
    return 200, {'status': 'success', 'message': 'Transactions fetched and analyzed.'}
