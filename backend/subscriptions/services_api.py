from typing import List, Optional
from ninja import Router, Schema
from subscriptions.models import KnownService

router = Router(tags=['Services'])

class ServiceSearchResult(Schema):
    name: str
    category: str
    logo_url: Optional[str] = None
    default_cost: Optional[float] = None
    currency: str = 'INR'
    cancel_url: Optional[str] = None

@router.get('/search', response=List[ServiceSearchResult])
def search_services(request, q: str = ''):
    query = q.strip()
    if not query:
        qs = KnownService.objects.all()[:8]
    else:
        qs = KnownService.objects.filter(name__icontains=query)[:8]

    return [
        ServiceSearchResult(
            name=s.name,
            category=s.category,
            logo_url=s.logo_url,
            default_cost=float(s.default_cost) if s.default_cost is not None else None,
            currency=s.currency or 'INR',
            cancel_url=s.cancel_url,
        )
        for s in qs
    ]
