import json
import uuid
from datetime import timedelta, date
from decimal import Decimal
from typing import List, Optional
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
from django.db import transaction
from django.db.models import Prefetch
from django.conf import settings
from cryptography.fernet import Fernet
import google.generativeai as genai
from ninja import Router
from ninja.errors import HttpError

from accounts.authentication import JWTAuth
from subscriptions.models import Subscription, SubscriptionEvent, KnownService, UserSettings, SubscriptionShare
from subscriptions.schemas import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionOut,
    SummaryResponse,
    UpcomingItem,
    CategorySummary,
    MessageResponse,
    DuplicateCategoryGroup,
    DuplicateSubItem,
    SearchRequest,
    SubscriptionShareIn,
    SubscriptionShareOut,
)
from subscriptions.services import monthly_cost, annual_cost

router = Router(tags=['Subscriptions'], auth=JWTAuth())

def _to_subscription_out(sub: Subscription) -> SubscriptionOut:
    ninety_days_ago = timezone.now() - timedelta(days=90)
    needs_rev = (sub.status == 'active') and (sub.updated_at < ninety_days_ago)

    previous_amount = None
    price_increased = False
    price_delta = None

    if hasattr(sub, 'price_events'):
        pe = sub.price_events[0] if sub.price_events else None
    else:
        pe = sub.events.filter(event_type='price_changed').order_by('-created_at').first()

    if pe and pe.old_value:
        val = pe.old_value.get('amount') if isinstance(pe.old_value, dict) else pe.old_value
        if val is not None:
            try:
                prev_amt = Decimal(str(val))
                if sub.amount > prev_amt:
                    price_increased = True
                    price_delta = sub.amount - prev_amt
                    previous_amount = prev_amt
                elif sub.amount < prev_amt:
                    previous_amount = prev_amt
                    price_delta = sub.amount - prev_amt
            except Exception:
                pass

    shares_list = list(sub.shares.all()) if hasattr(sub, 'shares') else []
    shares_sum = sum((sh.share_amount for sh in shares_list), Decimal('0'))
    your_share = max(Decimal('0'), sub.amount - shares_sum)

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
        previous_amount=previous_amount,
        price_increased=price_increased,
        price_delta=price_delta,
        shares=[
            SubscriptionShareOut(
                id=sh.id,
                shared_with_name=sh.shared_with_name,
                share_amount=sh.share_amount,
                created_at=sh.created_at,
            )
            for sh in shares_list
        ],
        your_share=your_share,
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
    price_events_qs = SubscriptionEvent.objects.filter(
        event_type='price_changed'
    ).order_by('-created_at')

    qs = Subscription.objects.filter(user=request.auth).prefetch_related(
        Prefetch('events', queryset=price_events_qs, to_attr='price_events'),
        'shares'
    )
    if status:
        qs = qs.filter(status=status)
    if category:
        qs = qs.filter(category=category)
    if search:
        qs = qs.filter(name__icontains=search)

    return [_to_subscription_out(sub) for sub in qs]

@router.post('/', response=SubscriptionOut)
def create_subscription(request, data: SubscriptionCreate):
    if data.shares:
        total_shares = sum((s.share_amount for s in data.shares), Decimal('0'))
        if total_shares > data.amount:
            raise HttpError(400, f"Total split amounts ({total_shares}) cannot exceed subscription amount ({data.amount})")

    with transaction.atomic():
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

        if data.shares:
            for s in data.shares:
                SubscriptionShare.objects.create(
                    subscription=sub,
                    shared_with_name=s.shared_with_name,
                    share_amount=s.share_amount
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
        .prefetch_related('shares')
    )

    today = timezone.now().date()
    week_later = today + timedelta(days=7)
    month_later = today + timedelta(days=30)

    def _get_your_share(s):
        sh_sum = sum((sh.share_amount for sh in s.shares.all()), Decimal('0'))
        return max(Decimal('0'), s.amount - sh_sum)

    m_total = sum(monthly_cost(float(_get_your_share(s)), s.billing_frequency) for s in active_subs)
    y_projected = sum(annual_cost(float(_get_your_share(s)), s.billing_frequency) for s in active_subs)
    active_count = len(active_subs)
    categories_set = {s.category for s in active_subs}
    categories_count = len(categories_set)

    # Categories breakdown
    cat_map = {}
    for s in active_subs:
        c = s.category
        if c not in cat_map:
            cat_map[c] = {'category': c, 'total_monthly': 0.0, 'count': 0}
        cat_map[c]['total_monthly'] += monthly_cost(float(_get_your_share(s)), s.billing_frequency)
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
                amount=_get_your_share(s),
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

@router.get('/duplicates', response=List[DuplicateCategoryGroup])
def get_duplicates(request):
    """Detect potential duplicate or redundant subscriptions in common categories."""
    target_categories = ['cloud', 'entertainment', 'ai', 'software', 'music']
    active_subs = Subscription.objects.filter(
        user=request.auth,
        status='active',
        category__in=target_categories
    ).order_by('category', 'name')

    CATEGORY_LABELS = {
        'cloud': 'Cloud',
        'entertainment': 'Entertainment',
        'ai': 'AI / ML',
        'software': 'Software',
        'music': 'Music',
    }

    grouped = {}
    for sub in active_subs:
        grouped.setdefault(sub.category, []).append(sub)

    results = []
    for cat, subs in grouped.items():
        if len(subs) >= 2:
            combined = sum(monthly_cost(float(s.amount), s.billing_frequency) for s in subs)
            results.append(
                DuplicateCategoryGroup(
                    category=cat,
                    category_label=CATEGORY_LABELS.get(cat, cat.title()),
                    count=len(subs),
                    subscriptions=[
                        DuplicateSubItem(
                            id=s.id,
                            name=s.name,
                            amount=s.amount,
                            currency=s.currency,
                        )
                        for s in subs
                    ],
                    combined_monthly=round(combined, 2),
                )
            )

    return results

@router.post('/search', response=List[SubscriptionOut])
def search_subscriptions(request, data: SearchRequest):
    """Natural-language subscription search powered by Gemini with intelligent fallback."""
    query = (data.query or '').strip()
    price_events_qs = SubscriptionEvent.objects.filter(
        event_type='price_changed'
    ).order_by('-created_at')

    all_subs = list(Subscription.objects.filter(user=request.auth).prefetch_related(
        Prefetch('events', queryset=price_events_qs, to_attr='price_events')
    ))

    if not all_subs:
        return []

    if not query:
        return [_to_subscription_out(s) for s in all_subs]

    # Resolve Gemini API key (BYOK or platform key)
    from subscriptions.services import get_ai_quota_settings
    user_settings = get_ai_quota_settings(request.auth)
    api_key = None
    if user_settings.gemini_api_key_encrypted:
        try:
            fernet_key = settings.ENCRYPTION_KEY
            if isinstance(fernet_key, str):
                fernet_key = fernet_key.encode()
            f = Fernet(fernet_key)
            api_key = f.decrypt(user_settings.gemini_api_key_encrypted.encode()).decode()
        except Exception:
            api_key = None
    if not api_key:
        api_key = getattr(settings, 'GEMINI_API_KEY', '')

    matched_ids = set()
    used_gemini = False

    if api_key:
        subs_context = [
            {
                "id": str(s.id),
                "name": s.name,
                "category": s.category,
                "amount": float(s.amount),
                "currency": s.currency,
                "billing_frequency": s.billing_frequency,
                "status": s.status,
            }
            for s in all_subs
        ]
        prompt = (
            f"Given these subscriptions: {json.dumps(subs_context)}.\n"
            f"The user searched: '{query}'.\n"
            "Return ONLY a JSON array of matching subscription IDs. Example: [\"uuid1\", \"uuid2\"]\n"
            "Return an empty array [] if no subscriptions match the search intent."
        )
        try:
            genai.configure(api_key=api_key)
            try:
                model = genai.GenerativeModel('gemini-2.0-flash')
                response = model.generate_content(prompt)
            except Exception:
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(prompt)

            raw_output = (response.text or '').strip()
            if raw_output.startswith("```"):
                lines = raw_output.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_output = "\n".join(lines).strip()

            parsed = json.loads(raw_output)
            if isinstance(parsed, list):
                matched_ids = {str(item) for item in parsed}
                used_gemini = True
        except Exception as e:
            print(f"[SEARCH GEMINI ERROR]: {e}")
            used_gemini = False

    # Fallback to smart keyword filtering if Gemini was not available or returned no results
    if not used_gemini:
        q_lower = query.lower()
        for s in all_subs:
            tags_str = " ".join(s.tags or []).lower()
            combined_text = f"{s.name} {s.category} {s.status} {s.billing_frequency} {s.notes or ''} {tags_str}".lower()
            if q_lower in combined_text:
                matched_ids.add(str(s.id))
            else:
                terms = q_lower.split()
                if terms and all(term in combined_text for term in terms):
                    matched_ids.add(str(s.id))

    matched_subs = [s for s in all_subs if str(s.id) in matched_ids]
    return [_to_subscription_out(s) for s in matched_subs]

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

@router.post('/{sub_id}/review', response=SubscriptionOut)
def mark_reviewed(request, sub_id: uuid.UUID):
    """Mark a subscription as reviewed, refreshing its updated_at timestamp."""
    sub = get_object_or_404(Subscription, id=sub_id, user=request.auth)
    sub.updated_at = timezone.now()
    sub.save(update_fields=['updated_at'])
    return _to_subscription_out(sub)

# ---------------------------------------------------------------------------
# Subscription Shares Endpoints
# ---------------------------------------------------------------------------

@router.post('/{sub_id}/shares', response={200: SubscriptionShareOut, 400: dict})
def create_subscription_share(request, sub_id: uuid.UUID, data: SubscriptionShareIn):
    """Create a subscription share, verifying the sum of shares does not exceed subscription amount."""
    sub = get_object_or_404(Subscription, id=sub_id, user=request.auth)
    current_shares_sum = sum((s.share_amount for s in sub.shares.all()), Decimal('0'))
    if current_shares_sum + data.share_amount > sub.amount:
        return 400, {
            'detail': f"Total split amounts ({current_shares_sum + data.share_amount}) cannot exceed subscription amount ({sub.amount})"
        }

    share = SubscriptionShare.objects.create(
        subscription=sub,
        shared_with_name=data.shared_with_name,
        share_amount=data.share_amount
    )
    cache.delete(f"summary_{request.auth.id}")
    return 200, share

@router.get('/{sub_id}/shares', response=List[SubscriptionShareOut])
def list_subscription_shares(request, sub_id: uuid.UUID):
    """List all shares for a subscription."""
    sub = get_object_or_404(Subscription, id=sub_id, user=request.auth)
    return list(sub.shares.all())

@router.delete('/{sub_id}/shares/{share_id}', response={200: MessageResponse, 404: dict})
def delete_subscription_share(request, sub_id: uuid.UUID, share_id: uuid.UUID):
    """Delete a subscription share."""
    sub = get_object_or_404(Subscription, id=sub_id, user=request.auth)
    share = get_object_or_404(SubscriptionShare, id=share_id, subscription=sub)
    share.delete()
    cache.delete(f"summary_{request.auth.id}")
    return 200, {'message': 'Share deleted'}


