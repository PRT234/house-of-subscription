# 🏠 House of Subscriptions

> A free, privacy-first subscription manager — track, analyze, and optimize every recurring payment.

House of Subscriptions gives you absolute visibility over recurring expenses, impending renewals, hidden subscription creeping, and monthly financial run-rates without invasive bank linking or proprietary data lock-in.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Backend:** Django 5.1, Django Ninja (fast Pydantic OpenAPI endpoints)
- **Database:** PostgreSQL (optimized for Neon Serverless) / SQLite (local dev fallback)
- **Caching:** Redis (Upstash Redis compatible) / LocMemCache (local dev fallback)
- **Authentication:** HS256 JWT with custom bearer authorization, Google OAuth support, bcrypt password hashing

---

## 🏛️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│              Next.js 14 Frontend (Port 3000)            │
│  - App Router (layout, dashboard, subs, calendar, etc.) │
│  - Recharts Visualizations & Glassmorphism UI          │
│  - LocalStorage + Cookie Auth Bearer Token             │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / JSON (REST API)
                             ▼
┌─────────────────────────────────────────────────────────┐
│             Django 5.1 + Django Ninja (Port 8000)       │
│  - /api/auth/ (signup, login, google, me)               │
│  - /api/subscriptions/ (CRUD, summary metrics, events)  │
│  - JWT Bearer Authentication                            │
│  - 2-Minute In-Memory / Redis Summary Caching           │
└──────────────┬────────────────────────────┬─────────────┘
               │                            │
               ▼                            ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│   PostgreSQL / SQLite     │  │   Redis / LocMemCache     │
│  - Users, Subscriptions   │  │  - Fast metric summaries  │
│  - Audit Events, Services │  │  - Cache invalidation on  │
│  - User Settings          │  │    write mutations        │
└───────────────────────────┘  └───────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Create and activate virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Seed popular subscription services (Netflix, Spotify, ChatGPT, etc.)
python -c "
import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hos_project.settings')
django.setup()
from subscriptions.models import KnownService
with open('seed_data/known_services.json') as f:
    for s in json.load(f):
        KnownService.objects.update_or_create(name=s['name'], defaults=s)
"

# Start the Django development server
python manage.py runserver 8000
```

The Django Ninja interactive API documentation will be available at:
`http://localhost:8000/api/docs`

---

### 2. Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install npm dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DJANGO_SECRET_KEY` | Django secret key for cryptographic signing | change-me-in-production |
| `DEBUG` | Django debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames | `localhost,127.0.0.1` |
| `DB_NAME` | PostgreSQL database name (if using Postgres) | `hos` |
| `DB_USER` | PostgreSQL user | |
| `DB_PASSWORD` | PostgreSQL password | |
| `DB_HOST` | Direct Neon PostgreSQL host (leave blank for local SQLite) | |
| `DB_PORT` | PostgreSQL port | `5432` |
| `REDIS_URL` | Redis connection URL (leave blank for local memory cache) | |
| `JWT_SECRET` | Secret key for signing HS256 JWT tokens | 64+ char random string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | |
| `FRONTEND_URL` | Frontend URL for CORS configuration | `http://localhost:3000` |
| `GEMINI_API_KEY` | Gemini API key for future AI features | |
| `ENCRYPTION_KEY` | Fernet key for encrypting sensitive user credentials | |
| `RESEND_API_KEY` | Resend API key for email alerts | |
| `CRON_SECRET_KEY` | Secret key for authenticating cron jobs | |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of Django API | `http://localhost:8000` |

---

## ✅ Features Checklist

### Pass 1: Core Architecture & Fundamentals
- [x] Full-stack architecture with App Router Next.js 14 & Django 5.1 Ninja
- [x] Custom User model with UUID primary keys and auth providers
- [x] Secure JWT authentication with HS256 algorithm and bcrypt password hashers
- [x] Subscription models with complete lifecycle auditing (`SubscriptionEvent`)
- [x] Full CRUD endpoints with user-scoped isolation
- [x] 2-minute cached summary calculation with write-invalidation
- [x] Glassmorphic dark theme with smooth micro-interactions
- [x] Dashboard with 4 stat cards, upcoming list, and category distribution pie chart
- [x] Interactive renewal calendar with day inspection side-panel
- [x] Financial analytics with category bar charts and 6-month projections
- [x] PWA manifest and service worker configuration

### Pass 2: Future Roadmap
- [ ] Automated email reminders via Resend API
- [ ] AI-assisted receipt and email invoice parsing with Google Gemini
- [ ] Cancellation assistant with one-click cancellation guides
- [ ] Multi-currency conversion via real-time exchange rates
- [ ] Export to CSV, JSON, and PDF summary reports

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
