import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'change-me-in-production-hos-secret-key-32chars')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = [host.strip() for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if host.strip()]
if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'accounts',
    'subscriptions',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',      # MUST be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

ROOT_URLCONF = 'hos_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'hos_project.wsgi.application'
ASGI_APPLICATION = 'hos_project.asgi.application'

# Custom User model
AUTH_USER_MODEL = 'accounts.User'

# Database — Neon Postgres (Direct connection) or local SQLite fallback
DB_HOST = os.getenv('DB_HOST', '').strip()
if DB_HOST:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'hos'),
            'USER': os.getenv('DB_USER', ''),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': DB_HOST,  # Use direct connection string from Neon, NOT the pooled one
            'PORT': os.getenv('DB_PORT', '5432'),
            'OPTIONS': {
                'sslmode': 'require',
            },
            'CONN_MAX_AGE': 600,           # Connection pooling: keep connections alive 10 min
            'CONN_HEALTH_CHECKS': True,    # Verify connections before use
        }
    }
else:
    import warnings
    warnings.warn(
        "DB_HOST is not set — falling back to local SQLite. This is expected for local "
        "development, but if you see this in a deployed environment, your database is "
        "not connected and data will not persist."
    )
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Redis Cache (for dashboard/summary caching — fallback to LocMemCache if not configured)
REDIS_URL = os.getenv('REDIS_URL', '').strip()
if REDIS_URL and not REDIS_URL.startswith('locmem'):
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
            'TIMEOUT': 300,  # 5 min default cache TTL
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'TIMEOUT': 300,
        }
    }

# CORS
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        os.getenv('FRONTEND_URL', 'http://localhost:3000').rstrip('/'),
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]
else:
    frontend_url = os.getenv('FRONTEND_URL', '').rstrip('/')
    CORS_ALLOWED_ORIGINS = [frontend_url] if frontend_url else []
CORS_ALLOW_CREDENTIALS = True

# JWT Settings (custom, not Django's session auth)
JWT_SECRET = os.getenv('JWT_SECRET', 'hos-super-secret-jwt-key-minimum-64-characters-for-hs256-security')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
GOOGLE_GMAIL_REDIRECT_URI = os.getenv('GOOGLE_GMAIL_REDIRECT_URI', 'http://localhost:3000/settings/privacy')

# Plaid Integration
PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID', '')
PLAID_SECRET = os.getenv('PLAID_SECRET', '')
PLAID_ENV = os.getenv('PLAID_ENV', 'sandbox')

# Feature Flags
FEATURE_EMAIL_SCAN = os.getenv('FEATURE_EMAIL_SCAN', 'false').lower() == 'true'
FEATURE_BANK_LINK = os.getenv('FEATURE_BANK_LINK', 'false').lower() == 'true'

# Gemini & Encryption
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '')

# Resend (for later passes)
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
from django.core.exceptions import ImproperlyConfigured

CRON_SECRET_KEY = os.getenv('CRON_SECRET_KEY', '')
if not DEBUG and not CRON_SECRET_KEY:
    raise ImproperlyConfigured("CRON_SECRET_KEY must be set via environment variable when DEBUG=False.")
if not CRON_SECRET_KEY:
    CRON_SECRET_KEY = 'dev-only-insecure-cron-secret-do-not-deploy'

# Web Push (VAPID)
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '')
VAPID_MAILTO = os.getenv('VAPID_MAILTO', 'mailto:admin@houseofsubscriptions.com')

if not DEBUG and (not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY):
    import warnings
    warnings.warn(
        "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set. Web Push notifications will "
        "silently fail. Generate your own keypair with: python manage.py generate_vapid_keys"
    )

# Frontend URL
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Password hashing — use bcrypt as primary
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
