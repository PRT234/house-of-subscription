from ninja import Router
from django.conf import settings

router = Router(tags=['Config'])

@router.get('/features')
def get_features(request):
    """
    Returns the state of gated features.
    No auth required so frontend can check before rendering.
    """
    return {
        'email_scan': settings.FEATURE_EMAIL_SCAN,
        'bank_link': settings.FEATURE_BANK_LINK
    }
