from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

from accounts.api import router as auth_router
from subscriptions.api import router as subscriptions_router
from subscriptions.services_api import router as services_router
from subscriptions.import_api import router as import_router
from subscriptions.settings_api import router as settings_router

api = NinjaAPI(
    title='House of Subscriptions API',
    version='1.0.0',
    csrf=False,  # Disable CSRF for API (JWT handles auth)
)

api.add_router('/auth/', auth_router)
api.add_router('/subscriptions/', subscriptions_router)
api.add_router('/services/', services_router)
api.add_router('/import/', import_router)
api.add_router('/settings/', settings_router)

@api.get('/health')
def health(request):
    return {'status': 'ok'}

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]
