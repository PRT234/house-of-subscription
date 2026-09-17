from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from accounts.models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'email', 'display_name', 'auth_provider', 'date_joined', 'is_staff')
    list_filter = ('auth_provider', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('email', 'display_name', 'username')
    ordering = ('-date_joined',)
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('display_name', 'email', 'avatar_url', 'auth_provider')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
