from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.database import Base


class History(Base):
    __tablename__ = "history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    batch_id = Column(String(36), nullable=False, index=True)  # UUID для группировки вызовов save-history
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", backref="history")

