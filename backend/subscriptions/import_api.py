import json
from typing import List, Optional
from ninja import Router, File, UploadedFile, Schema
from django.conf import settings
from cryptography.fernet import Fernet
try:
    import pymupdf as fitz
except ImportError:
    import fitz
import google.generativeai as genai

from accounts.authentication import JWTAuth
from subscriptions.models import UserSettings

router = Router(tags=['Import'], auth=JWTAuth())

class ExtractedSubscription(Schema):
    merchant: str
    amount: float
    currency: str = 'INR'
    date: str
    frequency_guess: str = 'monthly'

@router.post('/statement', response={200: List[ExtractedSubscription], 400: dict, 429: dict, 500: dict})
def import_statement(request, file: UploadedFile = File(...)):
    # 1. Read file content and extract text
    try:
        content = file.read()
        filename = (file.name or '').lower()
        if filename.endswith('.pdf'):
            doc = fitz.open(stream=content, filetype="pdf")
            extracted_pages = [page.get_text() for page in doc]
            statement_text = "\n".join(extracted_pages)
        else:
            statement_text = content.decode('utf-8', errors='ignore')
    except Exception as e:
        return 400, {'detail': f"Could not read or parse uploaded file: {str(e)}"}

    if not statement_text.strip():
        return 400, {'detail': 'The uploaded statement appears to be empty or contains no readable text.'}

    # 2. BYOK / Quota verification
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
        except Exception as e:
            return 400, {'detail': f"Failed to decrypt user Gemini API key: {str(e)}"}
    else:
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if user_settings.ai_imports_used >= 10:
            return 429, {
                'detail': 'Free platform AI statement imports limit (10) reached. Please configure your own Gemini API key in Settings.'
            }

    if not api_key:
        return 400, {
            'detail': 'Gemini API key is not configured. Please add your personal Gemini API key under Settings -> AI Import Key.'
        }

    # Increment usage counter if using platform key
    if not user_settings.gemini_api_key_encrypted:
        user_settings.ai_imports_used += 1
        user_settings.save(update_fields=['ai_imports_used'])

    # 3. Call Gemini API
    prompt = (
        "You are a financial data extractor. Given raw bank/credit-card statement text, "
        "identify recurring subscription-like charges (e.g. Netflix, Spotify, AWS, gym memberships, SaaS tools). "
        "Return ONLY a JSON array, no markdown, no explanation, in this exact shape: "
        '[{"merchant": string, "amount": number, "currency": string, "date": "YYYY-MM-DD", "frequency_guess": "weekly"|"monthly"|"quarterly"|"yearly"|"unknown"}]. '
        "Only include charges that look recurring. If none found, return [].\n\n"
        f"Statement text:\n{statement_text[:35000]}"
    )

    try:
        genai.configure(api_key=api_key)
        # Attempt gemini-2.0-flash, fallback to gemini-1.5-flash if needed
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
        except Exception:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)

        raw_output = (response.text or '').strip()

        # 4. Strip markdown code fences
        if raw_output.startswith("```"):
            lines = raw_output.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_output = "\n".join(lines).strip()

        parsed_data = json.loads(raw_output)
        if not isinstance(parsed_data, list):
            return 200, []

        cleaned_items = []
        for item in parsed_data:
            if isinstance(item, dict) and 'merchant' in item and 'amount' in item:
                cleaned_items.append({
                    'merchant': str(item.get('merchant', 'Unknown Service')),
                    'amount': float(item.get('amount', 0)),
                    'currency': str(item.get('currency', 'INR')),
                    'date': str(item.get('date', '')),
                    'frequency_guess': str(item.get('frequency_guess', 'monthly')),
                })

        return 200, cleaned_items

    except Exception as e:
        return 500, {'detail': f"AI extraction failed: {str(e)}"}

@router.get('/export-csv')
def export_csv(request):
    import csv
    from django.http import HttpResponse
    from subscriptions.models import Subscription
    
    subs = Subscription.objects.filter(user=request.auth).order_by('name')
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="subscriptions.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Name', 'Amount', 'Currency', 'Billing Frequency', 'Next Renewal Date', 'Category', 'Status'])
    
    for sub in subs:
        writer.writerow([
            sub.name,
            sub.amount,
            sub.currency,
            sub.billing_frequency,
            sub.next_renewal_date,
            sub.category,
            sub.status
        ])
        
    return response
