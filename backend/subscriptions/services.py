"""Cost calculation utilities — used by both API and scheduled jobs."""

def monthly_cost(amount: float, frequency: str) -> float:
    factors = {'weekly': 52 / 12, 'monthly': 1.0, 'quarterly': 1 / 3, 'yearly': 1 / 12}
    return float(amount) * factors.get(frequency, 1.0)

def annual_cost(amount: float, frequency: str) -> float:
    factors = {'weekly': 52.0, 'monthly': 12.0, 'quarterly': 4.0, 'yearly': 1.0}
    return float(amount) * factors.get(frequency, 12.0)

def send_resend_email(to_email: str, subject: str, text_content: str) -> bool:
    """Send transactional notification email via Resend API using httpx."""
    import httpx
    from django.conf import settings

    api_key = getattr(settings, 'RESEND_API_KEY', '')
    if not api_key:
        # Graceful logging when RESEND_API_KEY is not configured
        print(f"[RESEND MOCK/DEV] To: {to_email} | Subject: {subject}\n{text_content}\n")
        return True

    try:
        res = httpx.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'from': 'House of Subscriptions <onboarding@resend.dev>',
                'to': [to_email],
                'subject': subject,
                'text': text_content,
            },
            timeout=10.0,
        )
        return res.status_code in (200, 201)
    except Exception as e:
        print(f"[RESEND ERROR] Failed to send email to {to_email}: {str(e)}")
        return False

from django.utils import timezone

def get_ai_quota_settings(user):
    """Fetch or create UserSettings for a user, resetting the monthly AI import
    counter if the calendar month has rolled over since the last reset."""
    from subscriptions.models import UserSettings
    user_settings, _ = UserSettings.objects.get_or_create(user=user)
    now = timezone.now()
    needs_reset = (
        user_settings.ai_imports_reset_at is None
        or user_settings.ai_imports_reset_at.year != now.year
        or user_settings.ai_imports_reset_at.month != now.month
    )
    if needs_reset:
        user_settings.ai_imports_used = 0
        user_settings.ai_imports_reset_at = now
        user_settings.save(update_fields=['ai_imports_used', 'ai_imports_reset_at'])
    return user_settings
