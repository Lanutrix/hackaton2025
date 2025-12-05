from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from src.models.user import User
from src.models.refresh_token import RefreshToken
from src.schemas.auth import UserRegister, UserLogin
from src.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from src.config import settings


class AuthService:
    
    @staticmethod
    async def register_user(db: AsyncSession, user_data: UserRegister) -> User:
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        hashed_password = get_password_hash(user_data.password)
        
        new_user = User(
            username=user_data.username,
            hashed_password=hashed_password
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return new_user
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, user_data: UserLogin) -> Optional[User]:
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(user_data.password, user.hashed_password):
            return None
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        return user
    
    @staticmethod
    async def create_tokens(db: AsyncSession, user: User) -> Tuple[str, str]:
        access_token = create_access_token(data={"sub": str(user.id), "username": user.username})
        refresh_token_str = create_refresh_token(data={"sub": str(user.id)})
        
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        refresh_token_record = RefreshToken(
            token=refresh_token_str,
            user_id=user.id,
            expires_at=expires_at
        )
        
        db.add(refresh_token_record)
        await db.commit()
        
        return access_token, refresh_token_str
    
    @staticmethod
    async def refresh_access_token(db: AsyncSession, refresh_token: str) -> str:
        payload = decode_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.token == refresh_token,
                RefreshToken.is_revoked == False
            )
        )
        token_record = result.scalar_one_or_none()
        
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not found or revoked"
            )
        
        if token_record.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired"
            )
        
        user_id = int(payload.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        access_token = create_access_token(data={"sub": str(user.id), "username": user.username})
        
        return access_token
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

