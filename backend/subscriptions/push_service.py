import json
from django.conf import settings
from subscriptions.models import PushSubscription

def send_push_notification(user_id, title: str, body: str, url: str = '/dashboard') -> int:
    """
    Send web push notification to all active push subscriptions for user_id.
    Prunes expired subscriptions (HTTP 410 or 404).
    Returns count of successfully delivered notifications.
    """
    subscriptions = list(PushSubscription.objects.filter(user_id=user_id))
    if not subscriptions:
        return 0

    vapid_private = getattr(settings, 'VAPID_PRIVATE_KEY', '')
    vapid_claims = {
        'sub': getattr(settings, 'VAPID_MAILTO', 'mailto:admin@houseofsubscriptions.com')
    }

    payload = json.dumps({
        'title': title,
        'body': body,
        'url': url,
    })

    sent_count = 0
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        print("[PUSH WARNING] pywebpush is not installed. Skipping push delivery.")
        return 0

    for sub in subscriptions:
        sub_info = {
            'endpoint': sub.endpoint,
            'keys': {
                'p256dh': sub.p256dh_key,
                'auth': sub.auth_key,
            }
        }
        try:
            webpush(
                subscription_info=sub_info,
                data=payload,
                vapid_private_key=vapid_private,
                vapid_claims=vapid_claims,
                timeout=10,
            )
            sent_count += 1
        except WebPushException as ex:
            # If the push service returns 404 or 410, the subscription has expired or was revoked
            if ex.response is not None and ex.response.status_code in (404, 410):
                sub.delete()
            else:
                print(f"[PUSH ERROR] Failed to send push to {sub.endpoint}: {ex}")
        except Exception as e:
            print(f"[PUSH ERROR] Unexpected error for {sub.endpoint}: {e}")

    return sent_count
