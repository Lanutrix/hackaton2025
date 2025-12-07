import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict
from src.database import get_db
from src.middleware.auth import get_current_active_user
from src.models.user import User
from src.models.history import History


router = APIRouter(
    prefix="/history",
    tags=["history"]
)


@router.post("/save-history", response_model=bool)
async def save_history(
    categories: List[str],
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> bool:
    """Save waste categories to user history."""
    batch_id = str(uuid.uuid4())
    
    for category in categories:
        history_entry = History(
            user_id=current_user.id,
            category=category,
            batch_id=batch_id
        )
        db.add(history_entry)
    
    await db.flush()
    return True


@router.get("", response_model=Dict[str, int])
async def get_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, int]:
    """Get count of each category for the current user."""
    # Получаем количество по категориям
    result = await db.execute(
        select(History.category, func.count(History.id))
        .where(History.user_id == current_user.id)
        .group_by(History.category)
    )
    categories = {row[0]: row[1] for row in result.fetchall()}
    
    # Получаем количество вызовов save-history (уникальных batch_id)
    saves_result = await db.execute(
        select(func.count(func.distinct(History.batch_id)))
        .where(History.user_id == current_user.id)
    )
    saves_count = saves_result.scalar() or 0
    
    categories["total"] = sum(categories.values())
    categories["saves_count"] = saves_count
    return categories

