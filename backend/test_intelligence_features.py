import os
import sys
import django

# Setup django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hos_project.settings')
django.setup()

import json
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from accounts.models import User
from accounts.services import create_access_token
from subscriptions.models import Subscription, SubscriptionEvent, UserSettings
from django.test import Client
from django.conf import settings

def run_tests():
    print("=== Testing Intelligence Features ===")
    client = Client()

    # 1. Setup test user
    user, _ = User.objects.get_or_create(
        email='intel_test@example.com',
        defaults={'username': 'intel_test@example.com', 'display_name': 'Intel User'}
    )
    user.set_password('password123')
    user.save()
    UserSettings.objects.get_or_create(user=user)

    token = create_access_token(str(user.id), user.email)
    auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    # Clean existing test data for this user
    Subscription.objects.filter(user=user).delete()

    # 2. Test Price-Increase Detection
    print("\n--- Test 1: Price-Increase Detection ---")
    sub1 = Subscription.objects.create(
        user=user,
        name='Netflix Premium',
        amount=Decimal('649.00'),
        currency='INR',
        billing_frequency='monthly',
        next_renewal_date=date.today() + timedelta(days=10),
        category='entertainment',
        status='active'
    )
    # Log a price change event from 499 to 649
    SubscriptionEvent.objects.create(
        subscription=sub1,
        user=user,
        event_type='price_changed',
        field_changed='amount',
        old_value={'amount': '499.00'},
        new_value={'amount': '649.00'}
    )

    res = client.get('/api/subscriptions/', **auth_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.content}"
    data = res.json()
    netflix_sub = next(s for s in data if s['name'] == 'Netflix Premium')
    print("Netflix Sub Data:", {
        'name': netflix_sub['name'],
        'amount': netflix_sub['amount'],
        'price_increased': netflix_sub['price_increased'],
        'previous_amount': netflix_sub['previous_amount'],
        'price_delta': netflix_sub['price_delta']
    })
    assert netflix_sub['price_increased'] is True, "price_increased should be True"
    assert Decimal(str(netflix_sub['previous_amount'])) == Decimal('499.00'), "previous_amount should be 499.00"
    assert Decimal(str(netflix_sub['price_delta'])) == Decimal('150.00'), "price_delta should be 150.00"
    print("[PASS] Price-increase detection verified!")

    # 3. Test Duplicate Detection
    print("\n--- Test 2: Duplicate Detection ---")
    # Add a second entertainment sub
    sub2 = Subscription.objects.create(
        user=user,
        name='Disney+ Hotstar',
        amount=Decimal('299.00'),
        currency='INR',
        billing_frequency='monthly',
        next_renewal_date=date.today() + timedelta(days=15),
        category='entertainment',
        status='active'
    )
    # Add a cloud sub (only 1, so should NOT show in duplicates)
    sub3 = Subscription.objects.create(
        user=user,
        name='AWS',
        amount=Decimal('1500.00'),
        currency='INR',
        billing_frequency='monthly',
        next_renewal_date=date.today() + timedelta(days=20),
        category='cloud',
        status='active'
    )

    res = client.get('/api/subscriptions/duplicates', **auth_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.content}"
    duplicates = res.json()
    print("Duplicates response:", json.dumps(duplicates, indent=2))
    assert len(duplicates) == 1, f"Expected 1 duplicate category, got {len(duplicates)}"
    assert duplicates[0]['category'] == 'entertainment'
    assert duplicates[0]['count'] == 2
    assert duplicates[0]['combined_monthly'] == 948.0
    print("[PASS] Duplicate detection verified!")

    # 4. Test Needs-Review Flag & Review endpoint
    print("\n--- Test 3: Needs-Review Flag & Review Endpoint ---")
    # Make sub2 unreviewed for 100 days
    Subscription.objects.filter(id=sub2.id).update(updated_at=timezone.now() - timedelta(days=100))
    res = client.get('/api/subscriptions/', **auth_headers)
    data = res.json()
    disney_sub = next(s for s in data if s['name'] == 'Disney+ Hotstar')
    print("Disney+ needs_review:", disney_sub['needs_review'])
    assert disney_sub['needs_review'] is True, "needs_review should be True for 100-day unupdated sub"

    # Mark reviewed
    res_review = client.post(f'/api/subscriptions/{sub2.id}/review', **auth_headers)
    assert res_review.status_code == 200
    assert res_review.json()['needs_review'] is False, "needs_review should be cleared after mark reviewed"
    print("[PASS] Needs-review flag and review endpoint verified!")

    # 5. Test Scheduled Daily Jobs Endpoint
    print("\n--- Test 4: Scheduled Daily Jobs (HMAC Auth) ---")
    # Unauthorized attempt
    res_unauth = client.post('/api/jobs/run-daily', HTTP_AUTHORIZATION='Bearer wrong-token')
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"

    # Authorized attempt
    cron_secret = getattr(settings, 'CRON_SECRET_KEY', 'change-me-cron-secret')
    res_auth = client.post('/api/jobs/run-daily', HTTP_AUTHORIZATION=f'Bearer {cron_secret}')
    assert res_auth.status_code == 200, f"Expected 200, got {res_auth.status_code}: {res_auth.content}"
    jobs_data = res_auth.json()
    print("Jobs Response:", json.dumps(jobs_data, indent=2))
    assert jobs_data['status'] == 'success'
    print("[PASS] Scheduled jobs security & execution verified!")

    # 6. Test AI / Keyword Search
    print("\n--- Test 5: Natural Language Search ---")
    res_search = client.post(
        '/api/subscriptions/search',
        data=json.dumps({'query': 'entertainment'}),
        content_type='application/json',
        **auth_headers
    )
    assert res_search.status_code == 200, f"Expected 200, got {res_search.status_code}: {res_search.content}"
    search_results = res_search.json()
    print(f"Search results for 'entertainment': {[s['name'] for s in search_results]}")
    assert any(s['name'] == 'Netflix Premium' for s in search_results)
    assert any(s['name'] == 'Disney+ Hotstar' for s in search_results)
    print("[PASS] Natural language search verified!")

    print("\n==============================================")
    print("ALL INTELLIGENCE BACKEND TESTS PASSED SUCCESSFULLY!")
    print("==============================================")

if __name__ == '__main__':
    run_tests()
