import uuid
from django.db import models
from django.conf import settings

class Subscription(models.Model):
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'), ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'), ('yearly', 'Yearly'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'), ('trial', 'Trial'),
        ('cancelled', 'Cancelled'), ('paused', 'Paused'),
        ('considering', 'Considering'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscriptions')
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    billing_frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    next_renewal_date = models.DateField()
    category = models.CharField(max_length=50, default='other')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_trial = models.BooleanField(default=False)
    trial_end_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)  # list of strings
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'
        ordering = ['next_renewal_date']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'next_renewal_date']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['status']),
            models.Index(fields=['next_renewal_date']),
        ]

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class SubscriptionEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='events')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=30)
        # 'created' | 'updated' | 'price_changed' | 'cancelled' | 'reactivated' | 'paused'
    field_changed = models.CharField(max_length=50, null=True, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subscription_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subscription', 'event_type']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.subscription.name} ({self.created_at})"


class KnownService(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, db_index=True)
    category = models.CharField(max_length=50)
    logo_url = models.URLField(null=True, blank=True)
    default_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='INR')
    cancel_url = models.URLField(null=True, blank=True)
    cancel_steps = models.TextField(null=True, blank=True)
    aliases = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'known_services'
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name


class UserSettings(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='settings')
    currency = models.CharField(max_length=3, default='INR')
    reminder_days = models.IntegerField(default=3)
    theme = models.CharField(max_length=10, default='dark')
    notifications_enabled = models.BooleanField(default=True)
    gemini_api_key_encrypted = models.TextField(null=True, blank=True)
    ai_imports_used = models.IntegerField(default=0)
    ai_imports_reset_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_settings'

    def __str__(self):
        return f"Settings for {self.user.email}"


class SubscriptionShare(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='shares')
    shared_with_name = models.CharField(max_length=100)
    share_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subscription_shares'

    def __str__(self):
        return f"{self.shared_with_name} - {self.share_amount} for {self.subscription.name}"


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.TextField()
    p256dh_key = models.TextField()
    auth_key = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'push_subscriptions'

    def __str__(self):
        return f"PushSubscription for {self.user.email} ({self.created_at})"

