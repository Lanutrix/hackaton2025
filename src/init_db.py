import asyncio
from sqlalchemy.ext.asyncio import AsyncEngine
from src.database import Base, engine
from src.models.user import User
from src.models.refresh_token import RefreshToken
from src.models.history import History


async def init_db(max_retries: int = 5, retry_delay: int = 2):
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("Database tables created successfully")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Database connection attempt {attempt + 1} failed: {e}")
                print(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
            else:
                print(f"Failed to connect to database after {max_retries} attempts")
                raise

