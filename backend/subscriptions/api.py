import uuid
from datetime import timedelta, date
from decimal import Decimal
from typing import List, Optional
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
from ninja import Router

from accounts.authentication import JWTAuth
from subscriptions.models import Subscription, SubscriptionEvent, KnownService
from subscriptions.schemas import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionOut,
    SummaryResponse,
    UpcomingItem,
    CategorySummary,
    MessageResponse,
)
from subscriptions.services import monthly_cost, annual_cost

router = Router(tags=['Subscriptions'], auth=JWTAuth())

def _to_subscription_out(sub: Subscription) -> SubscriptionOut:
    ninety_days_ago = timezone.now() - timedelta(days=90)
    needs_rev = (sub.status == 'active') and (sub.updated_at < ninety_days_ago)
    return SubscriptionOut(
        id=sub.id,
        name=sub.name,
        amount=sub.amount,
        currency=sub.currency,
        billing_frequency=sub.billing_frequency,
        next_renewal_date=sub.next_renewal_date,
        category=sub.category,
        status=sub.status,
        is_trial=sub.is_trial,
        trial_end_date=sub.trial_end_date,
        payment_method=sub.payment_method,
        notes=sub.notes,
        tags=sub.tags or [],
        needs_review=needs_rev,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )

@router.get('/', response=List[SubscriptionOut])
def list_subscriptions(
    request,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    qs = Subscription.objects.filter(user=request.auth)
    if status:
        qs = qs.filter(status=status)
    if category:
        qs = qs.filter(category=category)
    if search:
        qs = qs.filter(name__icontains=search)

    return [_to_subscription_out(sub) for sub in qs]

@router.post('/', response=SubscriptionOut)
def create_subscription(request, data: SubscriptionCreate):
    sub = Subscription.objects.create(
        user=request.auth,
        name=data.name,
        amount=data.amount,
        currency=data.currency,
        billing_frequency=data.billing_frequency,
        next_renewal_date=data.next_renewal_date,
        category=data.category,
        status=data.status,
        is_trial=data.is_trial,
        trial_end_date=data.trial_end_date,
        payment_method=data.payment_method,
        notes=data.notes,
        tags=data.tags or [],
    )

    SubscriptionEvent.objects.create(
        subscription=sub,
        user=request.auth,
        event_type='created',
        new_value={
            'id': str(sub.id),
            'name': sub.name,
            'amount': str(sub.amount),
            'currency': sub.currency,
            'billing_frequency': sub.billing_frequency,
            'next_renewal_date': str(sub.next_renewal_date),
            'category': sub.category,
            'status': sub.status,
        }
    )

    cache.delete(f"summary_{request.auth.id}")
    return _to_subscription_out(sub)

@router.get('/summary', response=SummaryResponse)
def get_summary(request):
    cache_key = f"summary_{request.auth.id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    active_subs = list(
        Subscription.objects.filter(user=request.auth, status='active')
        .only('id', 'name', 'amount', 'currency', 'billing_frequency', 'next_renewal_date', 'category')
    )

    today = timezone.now().date()
    week_later = today + timedelta(days=7)
    month_later = today + timedelta(days=30)

    m_total = sum(monthly_cost(float(s.amount), s.billing_frequency) for s in active_subs)
    y_projected = sum(annual_cost(float(s.amount), s.billing_frequency) for s in active_subs)
    active_count = len(active_subs)
    categories_set = {s.category for s in active_subs}
    categories_count = len(categories_set)

    # Categories breakdown
    cat_map = {}
    for s in active_subs:
        c = s.category
        if c not in cat_map:
            cat_map[c] = {'category': c, 'total_monthly': 0.0, 'count': 0}
        cat_map[c]['total_monthly'] += monthly_cost(float(s.amount), s.billing_frequency)
        cat_map[c]['count'] += 1

    by_category = [
        CategorySummary(
            category=v['category'],
            total_monthly=round(v['total_monthly'], 2),
            count=v['count']
        )
        for v in cat_map.values()
    ]
    by_category.sort(key=lambda x: x.total_monthly, reverse=True)

    # Upcoming renewals
    future_subs = [s for s in active_subs if s.next_renewal_date >= today]
    future_subs.sort(key=lambda x: x.next_renewal_date)
    upcoming: List[UpcomingItem] = []
    for s in future_subs[:5]:
        days = (s.next_renewal_date - today).days
        upcoming.append(
            UpcomingItem(
                id=s.id,
                name=s.name,
                amount=s.amount,
                currency=s.currency,
                next_renewal_date=s.next_renewal_date,
                category=s.category,
                days_until=days,
            )
        )

    due_this_week = sum(1 for s in active_subs if today <= s.next_renewal_date <= week_later)
    due_this_month = sum(1 for s in active_subs if today <= s.next_renewal_date <= month_later)

    result = SummaryResponse(
        monthly_total=round(m_total, 2),
        yearly_projected=round(y_projected, 2),
        active_count=active_count,
        categories_count=categories_count,
        upcoming=upcoming,
        by_category=by_category,
        due_this_week=due_this_week,
        due_this_month=due_this_month,
    )

    cache.set(cache_key, result.dict() if hasattr(result, 'dict') else result.model_dump(), timeout=120)
    return result

@router.get('/known-services', response=List[dict])
def list_known_services(request):
    """Auxiliary endpoint returning catalogue of known subscription services."""
    services = KnownService.objects.all().order_by('name')
    return [
        {
            'id': s.id,
            'name': s.name,
            'category': s.category,
            'logo_url': s.logo_url,
            'default_cost': float(s.default_cost) if s.default_cost is not None else None,
            'currency': s.currency,
            'cancel_url': s.cancel_url,
            'cancel_steps': s.cancel_steps,
            'aliases': s.aliases,
        }
        for s in services
    ]

@router.get('/{sub_id}', response=SubscriptionOut)
def get_subscription(request, sub_id: uuid.UUID):
    sub = get_object_or_404(Subscription, id=sub_id, user=request.auth)
    return _to_subscription_out(sub)

@router.put('/{sub_id}', response=SubscriptionOut)
def update_subscription(request, sub_id: uuid.UUID, data: SubscriptionUpdate):
    sub = get_object_or_404(Subscription, id=sub_id, user=request.auth)

    # Check for specific event tracking
    if data.amount is not None and data.amount != sub.amount:
        SubscriptionEvent.objects.create(
            subscription=sub,
            user=request.auth,
            event_type='price_changed',
            field_changed='amount',
            old_value={'amount': str(sub.amount)},
            new_value={'amount': str(data.amount)},
        )
        sub.amount = data.amount

    if data.status is not None and data.status != sub.status:
        event_map = {
            'cancelled': 'cancelled',
            'paused': 'paused',
            'active': 'reactivated' if sub.status == 'cancelled' else 'updated',
        }
        event_type = event_map.get(data.status, 'updated')
        SubscriptionEvent.objects.create(
            subscription=sub,
            user=request.auth,
            event_type=event_type,
            field_changed='status',
            old_value={'status': sub.status},
            new_value={'status': data.status},
        )
        sub.status = data.status

    fields_to_check = [
        'name', 'currency', 'billing_frequency', 'next_renewal_date',
        'category', 'is_trial', 'trial_end_date', 'payment_method', 'notes', 'tags'
    ]

    for field in fields_to_check:
        new_val = getattr(data, field)
        if new_val is not None:
            old_val = getattr(sub, field)
            if old_val != new_val:
                SubscriptionEvent.objects.create(
                    subscription=sub,
                    user=request.auth,
                    event_type='updated',
                    field_changed=field,
                    old_value={field: str(old_val)},
                    new_value={field: str(new_val)},
                )
                setattr(sub, field, new_val)

    sub.save()
    cache.delete(f"summary_{request.auth.id}")
    return _to_subscription_out(sub)

@router.delete('/{sub_id}', response=MessageResponse)
def delete_subscription(request, sub_id: uuid.UUID):
    sub = get_object_or_404(Subscription, id=sub_id, user=request.auth)
    sub.status = 'cancelled'
    sub.save()

    SubscriptionEvent.objects.create(
        subscription=sub,
        user=request.auth,
        event_type='cancelled',
        field_changed='status',
        old_value={'status': 'active'},
        new_value={'status': 'cancelled'},
    )

    cache.delete(f"summary_{request.auth.id}")
    return {'message': 'Subscription cancelled'}
