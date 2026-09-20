from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal

class SubscriptionShareIn(BaseModel):
    shared_with_name: str
    share_amount: Decimal

class SubscriptionShareOut(BaseModel):
    id: UUID
    shared_with_name: str
    share_amount: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class PushSubscriptionIn(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str

class PushSubscriptionOut(BaseModel):
    id: UUID
    endpoint: str
    created_at: datetime

    class Config:
        from_attributes = True

class SubscriptionCreate(BaseModel):
    name: str
    amount: Decimal
    currency: str = 'INR'
    billing_frequency: str = 'monthly'
    next_renewal_date: date
    category: str = 'other'
    status: str = 'active'
    is_trial: bool = False
    trial_end_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    shares: Optional[List[SubscriptionShareIn]] = None

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    billing_frequency: Optional[str] = None
    next_renewal_date: Optional[date] = None
    category: Optional[str] = None
    status: Optional[str] = None
    is_trial: Optional[bool] = None
    trial_end_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    shares: Optional[List[SubscriptionShareIn]] = None

class SubscriptionOut(BaseModel):
    id: UUID
    name: str
    amount: Decimal
    currency: str
    billing_frequency: str
    next_renewal_date: date
    category: str
    status: str
    is_trial: bool
    trial_end_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    needs_review: bool = False
    previous_amount: Optional[Decimal] = None
    price_increased: bool = False
    price_delta: Optional[Decimal] = None
    shares: List[SubscriptionShareOut] = []
    your_share: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DuplicateSubItem(BaseModel):
    id: UUID
    name: str
    amount: Decimal
    currency: str

class DuplicateCategoryGroup(BaseModel):
    category: str
    category_label: str
    count: int
    subscriptions: List[DuplicateSubItem]
    combined_monthly: float

class SearchRequest(BaseModel):
    query: str

class UpcomingItem(BaseModel):
    id: UUID
    name: str
    amount: Decimal
    currency: str
    next_renewal_date: date
    category: str
    days_until: int

class CategorySummary(BaseModel):
    category: str
    total_monthly: float
    count: int

class SummaryResponse(BaseModel):
    monthly_total: float
    yearly_projected: float
    active_count: int
    categories_count: int
    upcoming: List[UpcomingItem]
    by_category: List[CategorySummary]
    due_this_week: int
    due_this_month: int

class MessageResponse(BaseModel):
    message: str
