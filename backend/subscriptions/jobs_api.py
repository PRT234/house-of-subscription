import hmac
from datetime import timedelta, date
from typing import List, Dict, Any
from django.conf import settings
from django.utils import timezone
from ninja import Router

from accounts.models import User
from subscriptions.models import Subscription, SubscriptionEvent, UserSettings, KnownService
from subscriptions.services import send_resend_email, monthly_cost

router = Router(tags=['Jobs'])

@router.post('/run-daily', response={200: dict, 401: dict})
def run_daily_jobs(request):
    auth_header = request.headers.get("Authorization", "")
    expected = f"Bearer {getattr(settings, 'CRON_SECRET_KEY', 'change-me-cron-secret')}"
    if not hmac.compare_digest(auth_header, expected):
        return 401, {'detail': 'Unauthorized'}

    today = timezone.now().date()
    tasks_summary = []

    # -------------------------------------------------------------
    # Task 1: Check Trial Reminders (3 days prior)
    # -------------------------------------------------------------
    target_trial_date = today + timedelta(days=3)
    trial_subs = Subscription.objects.filter(
        is_trial=True,
        trial_end_date=target_trial_date,
        status='trial',
    ).select_related('user')

    trials_notified = 0
    for sub in trial_subs:
        cancel_url = 'https://houseofsubscriptions.com'
        # Check if known service has cancel url
        known = KnownService.objects.filter(name__iexact=sub.name).first()
        if known and known.cancel_url:
            cancel_url = known.cancel_url

        subject = f"⏰ Your {sub.name} trial ends in 3 days"
        body = (
            f"Hi {sub.user.display_name},\n\n"
            f"Your free trial for {sub.name} will end in 3 days on {sub.trial_end_date}.\n"
            f"Scheduled recurring charge: {sub.currency} {sub.amount} ({sub.billing_frequency}).\n\n"
            f"If you wish to cancel or manage this trial, visit: {cancel_url}\n\n"
            "— House of Subscriptions"
        )
        if send_resend_email(sub.user.email, subject, body):
            trials_notified += 1

    tasks_summary.append(f"check_trial_reminders: {trials_notified} notified")

    # -------------------------------------------------------------
    # Task 2: Check Renewal Reminders (User-configured days)
    # -------------------------------------------------------------
    renewals_notified = 0
    # Group by reminder threshold
    active_users_settings = UserSettings.objects.filter(notifications_enabled=True).select_related('user')

    for u_set in active_users_settings:
        reminder_days = u_set.reminder_days or 3
        target_renewal = today + timedelta(days=reminder_days)

        user_renewals = Subscription.objects.filter(
            user=u_set.user,
            status='active',
            next_renewal_date=target_renewal,
        )

        for sub in user_renewals:
            subject = f"🔔 {sub.name} renews in {reminder_days} days"
            body = (
                f"Hi {u_set.user.display_name},\n\n"
                f"This is a reminder that your subscription for {sub.name} "
                f"is scheduled for renewal on {sub.next_renewal_date}.\n"
                f"Amount: {sub.currency} {sub.amount} ({sub.billing_frequency}).\n\n"
                "— House of Subscriptions"
            )
            if send_resend_email(u_set.user.email, subject, body):
                renewals_notified += 1

    tasks_summary.append(f"check_renewal_reminders: {renewals_notified} notified")

    # -------------------------------------------------------------
    # Task 3: Send Weekly Digest (If Sunday)
    # -------------------------------------------------------------
    # Sunday = 6 in Python date.weekday()
    weekly_digests_sent = 0
    if today.weekday() == 6:
        seven_days_later = today + timedelta(days=7)
        ninety_days_ago = timezone.now() - timedelta(days=90)

        for u_set in active_users_settings:
            upcoming_7d = list(Subscription.objects.filter(
                user=u_set.user,
                status='active',
                next_renewal_date__gte=today,
                next_renewal_date__lte=seven_days_later,
            ))

            trials_7d = list(Subscription.objects.filter(
                user=u_set.user,
                is_trial=True,
                trial_end_date__gte=today,
                trial_end_date__lte=seven_days_later,
            ))

            needs_review_items = list(Subscription.objects.filter(
                user=u_set.user,
                status='active',
                updated_at__lt=ninety_days_ago,
            ))

            if not upcoming_7d and not trials_7d and not needs_review_items:
                continue

            lines = [f"Hi {u_set.user.display_name},\n\nHere is your House of Subscriptions weekly digest:\n"]

            if upcoming_7d:
                lines.append("📅 Renewals in the next 7 days:")
                for s in upcoming_7d:
                    lines.append(f" • {s.name}: {s.currency} {s.amount} on {s.next_renewal_date}")
                lines.append("")

            if trials_7d:
                lines.append("⏰ Trials ending this week:")
                for s in trials_7d:
                    lines.append(f" • {s.name}: ends {s.trial_end_date}")
                lines.append("")

            if needs_review_items:
                lines.append("🔍 Unreviewed Subscriptions (90+ days):")
                for s in needs_review_items:
                    lines.append(f" • {s.name}: {s.currency} {s.amount} ({s.category})")
                lines.append("")

            lines.append("View your full dashboard: https://houseofsubscriptions.com\n— House of Subscriptions")
            subject = f"📊 Your Weekly Subscriptions Digest ({today.strftime('%b %d')})"

            if send_resend_email(u_set.user.email, subject, "\n".join(lines)):
                weekly_digests_sent += 1

    tasks_summary.append(f"send_weekly_digest: {weekly_digests_sent} sent (Sunday check: {today.weekday() == 6})")

    # -------------------------------------------------------------
    # Task 4: Send Monthly Report (If 1st of the month)
    # -------------------------------------------------------------
    monthly_reports_sent = 0
    if today.day == 1:
        thirty_days_ago = timezone.now() - timedelta(days=30)
        for u_set in active_users_settings:
            active_subs = list(Subscription.objects.filter(user=u_set.user, status='active'))
            if not active_subs:
                continue

            total_m = sum(monthly_cost(float(s.amount), s.billing_frequency) for s in active_subs)
            price_changes = list(SubscriptionEvent.objects.filter(
                user=u_set.user,
                event_type='price_changed',
                created_at__gte=thirty_days_ago,
            ).select_related('subscription'))

            lines = [
                f"Hi {u_set.user.display_name},\n\n"
                f"Your Monthly Subscription Report for {today.strftime('%B %Y')}:\n",
                f"💵 Total Monthly Run-rate: {u_set.currency} {total_m:.2f}",
                f"📦 Active Services: {len(active_subs)}\n"
            ]

            if price_changes:
                lines.append("📈 Price Changes (Last 30 Days):")
                for ev in price_changes:
                    old_amt = ev.old_value.get('amount') if isinstance(ev.old_value, dict) else 'N/A'
                    new_amt = ev.new_value.get('amount') if isinstance(ev.new_value, dict) else 'N/A'
                    lines.append(f" • {ev.subscription.name}: {old_amt} → {new_amt}")
                lines.append("")

            lines.append("Review and optimize your expenses: https://houseofsubscriptions.com\n— House of Subscriptions")
            subject = f"📑 Monthly Financial Report - {today.strftime('%B %Y')}"

            if send_resend_email(u_set.user.email, subject, "\n".join(lines)):
                monthly_reports_sent += 1

    tasks_summary.append(f"send_monthly_report: {monthly_reports_sent} sent (Day 1 check: {today.day == 1})")

    return 200, {
        'status': 'success',
        'date': str(today),
        'tasks': tasks_summary,
    }
