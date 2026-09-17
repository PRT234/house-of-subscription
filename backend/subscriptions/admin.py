from django.contrib import admin
from subscriptions.models import Subscription, SubscriptionEvent, KnownService, UserSettings

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'amount', 'currency', 'billing_frequency', 'next_renewal_date', 'category', 'status', 'is_trial')
    list_filter = ('status', 'billing_frequency', 'category', 'is_trial', 'currency')
    search_fields = ('name', 'user__email', 'user__display_name', 'notes')
    ordering = ('next_renewal_date',)

@admin.register(SubscriptionEvent)
class SubscriptionEventAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'user', 'event_type', 'field_changed', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('subscription__name', 'user__email')
    ordering = ('-created_at',)

@admin.register(KnownService)
class KnownServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'default_cost', 'currency', 'created_at')
    list_filter = ('category', 'currency')
    search_fields = ('name', 'category')
    ordering = ('name',)

@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'currency', 'reminder_days', 'theme', 'notifications_enabled', 'ai_imports_used')
    list_filter = ('theme', 'notifications_enabled', 'currency')
    search_fields = ('user__email', 'user__display_name')
