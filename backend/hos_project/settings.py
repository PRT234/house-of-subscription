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
CORS_ALLOWED_ORIGINS = [
    os.getenv('FRONTEND_URL', 'http://localhost:3000').rstrip('/'),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
CORS_ALLOW_CREDENTIALS = True

# JWT Settings (custom, not Django's session auth)
JWT_SECRET = os.getenv('JWT_SECRET', 'hos-super-secret-jwt-key-minimum-64-characters-for-hs256-security')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')

# Gemini (for later passes)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '')  # Fernet key

# Resend (for later passes)
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
CRON_SECRET_KEY = os.getenv('CRON_SECRET_KEY', 'change-me-cron-secret')

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
