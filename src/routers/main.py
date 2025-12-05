from fastapi import APIRouter, Depends
from src.middleware.auth import get_current_active_user
from src.models.user import User
from src.schemas.auth import UserResponse

router = APIRouter(
    tags=["main"]
)

@router.get("/")
async def home():
    return {"message": "Hi, World!"}


@router.get("/check_auth", response_model=UserResponse)
async def check_auth(current_user: User = Depends(get_current_active_user)):
    return current_user

