from ninja import Router
from django.db import IntegrityError
from accounts.models import User
from accounts.schemas import SignupRequest, LoginRequest, GoogleAuthRequest, AuthResponse, UserOut
from accounts.services import create_access_token, verify_google_token
from accounts.authentication import JWTAuth
from subscriptions.models import UserSettings

router = Router(tags=['Auth'])

def _format_user_out(user: User) -> UserOut:
    if hasattr(UserOut, 'model_validate'):
        return UserOut.model_validate(user)
    return UserOut.from_orm(user)

@router.post('/signup', response={200: AuthResponse, 400: dict, 409: dict})
def signup(request, data: SignupRequest):
    if len(data.password) < 8:
        return 400, {'detail': 'Password must be at least 8 characters'}
    if User.objects.filter(email=data.email).exists():
        return 409, {'detail': 'Email already registered'}
    try:
        user = User.objects.create_user(
            username=data.email,
            email=data.email,
            password=data.password,
            display_name=data.display_name,
        )
        UserSettings.objects.get_or_create(user=user)
        token = create_access_token(str(user.id), user.email)
        return 200, {
            'access_token': token,
            'token_type': 'bearer',
            'user': _format_user_out(user)
        }
    except IntegrityError:
        return 409, {'detail': 'User creation conflict'}

@router.post('/login', response={200: AuthResponse, 401: dict})
def login(request, data: LoginRequest):
    try:
        user = User.objects.get(email=data.email)
    except User.DoesNotExist:
        return 401, {'detail': 'Invalid credentials'}
    if not user.check_password(data.password):
        return 401, {'detail': 'Invalid credentials'}
    token = create_access_token(str(user.id), user.email)
    return 200, {
        'access_token': token,
        'token_type': 'bearer',
        'user': _format_user_out(user)
    }

@router.post('/google', response={200: AuthResponse, 401: dict})
def google_auth(request, data: GoogleAuthRequest):
    try:
        google_info = verify_google_token(data.id_token)
    except ValueError as e:
        return 401, {'detail': str(e)}
    user, created = User.objects.get_or_create(
        email=google_info['email'],
        defaults={
            'username': google_info['email'],
            'display_name': google_info.get('name') or google_info['email'].split('@')[0],
            'avatar_url': google_info.get('picture', ''),
            'auth_provider': 'google',
        }
    )
    if created:
        user.set_unusable_password()
        user.save()
        UserSettings.objects.get_or_create(user=user)
    token = create_access_token(str(user.id), user.email)
    return 200, {
        'access_token': token,
        'token_type': 'bearer',
        'user': _format_user_out(user)
    }

@router.get('/me', response=UserOut, auth=JWTAuth())
def me(request):
    return request.auth

@router.delete('/delete-account', response={200: dict, 401: dict}, auth=JWTAuth())
def delete_account(request):
    user = request.auth
    if user:
        user.delete() # This cascades to everything linked to the user!
        return 200, {'deleted': True}
    return 401, {'detail': 'Invalid user'}
