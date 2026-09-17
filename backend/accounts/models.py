from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=100)
    avatar_url = models.URLField(null=True, blank=True)
    auth_provider = models.CharField(max_length=20, default='email')  # 'email' | 'google'

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'display_name']

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.email})"
