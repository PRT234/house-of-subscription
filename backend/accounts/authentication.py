from ninja.security import HttpBearer
from jose import jwt, JWTError
from django.conf import settings
from accounts.models import User

class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get('sub')
            if not user_id:
                return None
            user = User.objects.get(id=user_id)
            return user
        except (JWTError, User.DoesNotExist):
            return None
