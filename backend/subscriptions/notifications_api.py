from ninja import Router
from django.conf import settings
from accounts.authentication import JWTAuth
from subscriptions.models import PushSubscription
from subscriptions.schemas import PushSubscriptionIn, PushSubscriptionOut, MessageResponse

router = Router(tags=['Notifications'], auth=JWTAuth())

@router.get('/vapid-public-key', auth=None)
def get_vapid_public_key(request):
    """Expose VAPID public key for browser pushManager subscription."""
    return {'public_key': getattr(settings, 'VAPID_PUBLIC_KEY', '')}

@router.post('/subscribe', response={200: PushSubscriptionOut, 201: PushSubscriptionOut})
def subscribe_push(request, data: PushSubscriptionIn):
    """Register or refresh a browser Web Push subscription."""
    sub, created = PushSubscription.objects.update_or_create(
        user=request.auth,
        endpoint=data.endpoint,
        defaults={
            'p256dh_key': data.p256dh_key,
            'auth_key': data.auth_key,
        }
    )
    return (201 if created else 200), sub

@router.delete('/unsubscribe', response=MessageResponse)
def unsubscribe_push(request, data: PushSubscriptionIn):
    """Remove a browser Web Push subscription."""
    PushSubscription.objects.filter(
        user=request.auth,
        endpoint=data.endpoint
    ).delete()
    return {'message': 'Unsubscribed successfully'}
