import os
import sys
import json
import django

# Setup django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hos_project.settings')
django.setup()

from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from accounts.models import User
from accounts.services import create_access_token
from subscriptions.models import Subscription, SubscriptionShare, PushSubscription, UserSettings
from subscriptions.push_service import send_push_notification
from django.test import Client

def run_tests():
    print("=== Testing Collaboration & New Features ===")
    client = Client()

    user, _ = User.objects.get_or_create(
        email='collab_test@example.com',
        defaults={'username': 'collab_test@example.com', 'display_name': 'Collab Tester'}
    )
    user.set_password('password123')
    user.save()
    UserSettings.objects.get_or_create(user=user)

    token = create_access_token(str(user.id), user.email)
    auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    # Clean previous test data
    Subscription.objects.filter(user=user).delete()
    PushSubscription.objects.filter(user=user).delete()

    # 1. Test Subscription Splitting & Shares
    print("\n--- Test 1: Subscription Splitting & Validation ---")
    sub = Subscription.objects.create(
        user=user,
        name='Netflix Family Plan',
        amount=Decimal('1000.00'),
        currency='INR',
        billing_frequency='monthly',
        next_renewal_date=date.today() + timedelta(days=15),
        category='entertainment',
        status='active'
    )

    # Add share 1: 400
    res1 = client.post(
        f'/api/subscriptions/{sub.id}/shares',
        data=json.dumps({'shared_with_name': 'Alice', 'share_amount': '400.00'}),
        content_type='application/json',
        **auth_headers
    )
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.content}"
    share1_id = res1.json()['id']
    print("[PASS] Created share 1 (Alice: 400.00)")

    # Add share 2: 350
    res2 = client.post(
        f'/api/subscriptions/{sub.id}/shares',
        data=json.dumps({'shared_with_name': 'Bob', 'share_amount': '350.00'}),
        content_type='application/json',
        **auth_headers
    )
    assert res2.status_code == 200
    print("[PASS] Created share 2 (Bob: 350.00)")

    # Add share 3: 300 (total would be 400 + 350 + 300 = 1050 > 1000 => must return 400)
    res_invalid = client.post(
        f'/api/subscriptions/{sub.id}/shares',
        data=json.dumps({'shared_with_name': 'Charlie', 'share_amount': '300.00'}),
        content_type='application/json',
        **auth_headers
    )
    assert res_invalid.status_code == 400, f"Expected 400 on over-split, got {res_invalid.status_code}"
    print("[PASS] Over-splitting properly rejected with 400 error")

    # List shares
    res_list = client.get(f'/api/subscriptions/{sub.id}/shares', **auth_headers)
    assert res_list.status_code == 200
    shares_data = res_list.json()
    assert len(shares_data) == 2, f"Expected 2 shares, got {len(shares_data)}"
    print("[PASS] Listed subscription shares successfully")

    # Verify your_share calculation in GET /api/subscriptions/
    res_subs = client.get('/api/subscriptions/', **auth_headers)
    assert res_subs.status_code == 200
    netflix_sub = next(s for s in res_subs.json() if s['id'] == str(sub.id))
    assert Decimal(str(netflix_sub['your_share'])) == Decimal('250.00'), f"Expected your_share 250.00, got {netflix_sub['your_share']}"
    assert len(netflix_sub['shares']) == 2
    print("[PASS] your_share correctly calculated as 250.00 (1000 - 750)")

    # Verify summary reflects your_share
    res_summary = client.get('/api/subscriptions/summary', **auth_headers)
    assert res_summary.status_code == 200
    summary_data = res_summary.json()
    assert summary_data['monthly_total'] == 250.0, f"Expected monthly_total 250.0, got {summary_data['monthly_total']}"
    print("[PASS] Summary monthly_total reflects your_share (250.0)")

    # Delete a share
    res_del_share = client.delete(f'/api/subscriptions/{sub.id}/shares/{share1_id}', **auth_headers)
    assert res_del_share.status_code == 200
    res_subs_after = client.get('/api/subscriptions/', **auth_headers)
    netflix_after = next(s for s in res_subs_after.json() if s['id'] == str(sub.id))
    assert Decimal(str(netflix_after['your_share'])) == Decimal('650.00'), f"Expected your_share 650.00, got {netflix_after['your_share']}"
    print("[PASS] Share deletion and your_share update verified")

    # 2. Test Considering / Wishlist Query
    print("\n--- Test 2: Considering / Wishlist Query ---")
    wish_sub = Subscription.objects.create(
        user=user,
        name='Figma Professional',
        amount=Decimal('1200.00'),
        currency='INR',
        billing_frequency='monthly',
        next_renewal_date=date.today() + timedelta(days=30),
        category='software',
        status='considering'
    )
    res_wish = client.get('/api/subscriptions/?status=considering', **auth_headers)
    assert res_wish.status_code == 200
    wish_items = res_wish.json()
    assert any(s['name'] == 'Figma Professional' for s in wish_items)
    print("[PASS] Considering status filtering verified")

    # 3. Test Web Push Endpoints
    print("\n--- Test 3: Web Push Subscriptions ---")
    # Get public key
    res_pk = client.get('/api/notifications/vapid-public-key')
    assert res_pk.status_code == 200
    assert 'public_key' in res_pk.json() and len(res_pk.json()['public_key']) > 0
    print("[PASS] VAPID public key endpoint verified")

    # Subscribe
    dummy_endpoint = 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABdummy123'
    sub_payload = {
        'endpoint': dummy_endpoint,
        'p256dh_key': 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9EgVKA7Gh272YET9xRocWG2K8JpDJiUh4q3W4Hn0LHGQUo=',
        'auth_key': 'tBHItJI5svbpez7KI4CCXg=='
    }
    res_sub_push = client.post(
        '/api/notifications/subscribe',
        data=json.dumps(sub_payload),
        content_type='application/json',
        **auth_headers
    )
    assert res_sub_push.status_code in (200, 201), f"Expected 200/201, got {res_sub_push.status_code}"
    assert PushSubscription.objects.filter(user=user, endpoint=dummy_endpoint).exists()
    print("[PASS] Push subscription created in database")

    # Unsubscribe
    res_unsub_push = client.delete(
        '/api/notifications/unsubscribe',
        data=json.dumps(sub_payload),
        content_type='application/json',
        **auth_headers
    )
    assert res_unsub_push.status_code == 200
    assert not PushSubscription.objects.filter(user=user, endpoint=dummy_endpoint).exists()
    print("[PASS] Push subscription removed successfully")

    print("\n==============================================")
    print("ALL BACKEND COLLABORATION TESTS PASSED!")
    print("==============================================")

if __name__ == '__main__':
    run_tests()
