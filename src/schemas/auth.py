from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.isalnum() and '_' not in v:
            raise ValueError('Username must contain only alphanumeric characters and underscores')
        return v.lower()


class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

