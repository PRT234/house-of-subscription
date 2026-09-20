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

class ConnectedEmailAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='connected_emails')
    email_address = models.EmailField()
    oauth_refresh_token_encrypted = models.TextField()
    connected_at = models.DateTimeField(auto_now_add=True)
    last_scanned_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'connected_email_accounts'
        unique_together = ['user', 'email_address']

class BankConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bank_connections')
    institution_name = models.CharField(max_length=255)
    plaid_access_token_encrypted = models.TextField()
    connected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bank_connections'
