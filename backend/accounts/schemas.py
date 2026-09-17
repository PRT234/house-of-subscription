from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class SignupRequest(BaseModel):
    email: str
    password: str      # min 8 chars — validate in the endpoint
    display_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    auth_provider: str
    date_joined: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
