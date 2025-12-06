"""
Rate Limiter для ограничения запросов по IP.
Реализует sliding window алгоритм.

Single Responsibility: Только rate limiting
"""
import asyncio
import time
from collections import defaultdict
from typing import Dict, List
from abc import ABC, abstractmethod


class RateLimiterInterface(ABC):
    """Interface Segregation: Минимальный интерфейс для rate limiter"""
    
    @abstractmethod
    async def acquire(self, client_id: str) -> bool:
        """Попытка получить разрешение на запрос"""
        pass
    
    @abstractmethod
    async def wait_and_acquire(self, client_id: str) -> None:
        """Ожидание и получение разрешения на запрос"""
        pass


class SlidingWindowRateLimiter(RateLimiterInterface):
    """
    Rate limiter с sliding window алгоритмом.
    Ограничивает количество запросов в секунду для каждого client_id (IP).
    
    Open/Closed: Можно расширять, добавляя новые стратегии очистки
    """
    
    def __init__(self, max_requests: int = 10, window_seconds: float = 1.0):
        """
        Args:
            max_requests: Максимальное количество запросов в окне
            window_seconds: Размер окна в секундах
        """
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self._cleanup_lock = asyncio.Lock()
        self._last_cleanup = time.time()
        self._cleanup_interval = 60.0  # Очистка старых записей раз в минуту
    
    def _cleanup_old_requests(self, client_id: str, current_time: float) -> None:
        """Удаляет устаревшие запросы для client_id"""
        cutoff = current_time - self._window_seconds
        self._requests[client_id] = [
            t for t in self._requests[client_id] if t > cutoff
        ]
    
    async def _global_cleanup(self) -> None:
        """Периодическая очистка всех старых записей"""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        async with self._cleanup_lock:
            if current_time - self._last_cleanup < self._cleanup_interval:
                return
            
            cutoff = current_time - self._window_seconds
            empty_clients = []
            
            for client_id in list(self._requests.keys()):
                self._requests[client_id] = [
                    t for t in self._requests[client_id] if t > cutoff
                ]
                if not self._requests[client_id]:
                    empty_clients.append(client_id)
            
            # Удаляем пустые записи
            for client_id in empty_clients:
                del self._requests[client_id]
                if client_id in self._locks:
                    del self._locks[client_id]
            
            self._last_cleanup = current_time
    
    async def acquire(self, client_id: str) -> bool:
        """
        Попытка получить разрешение на запрос.
        
        Returns:
            True если запрос разрешен, False если превышен лимит
        """
        await self._global_cleanup()
        
        async with self._locks[client_id]:
            current_time = time.time()
            self._cleanup_old_requests(client_id, current_time)
            
            if len(self._requests[client_id]) >= self._max_requests:
                return False
            
            self._requests[client_id].append(current_time)
            return True
    
    async def wait_and_acquire(self, client_id: str) -> None:
        """
        Ожидание и получение разрешения на запрос.
        Блокирует до тех пор, пока не появится свободный слот.
        """
        while True:
            await self._global_cleanup()
            
            async with self._locks[client_id]:
                current_time = time.time()
                self._cleanup_old_requests(client_id, current_time)
                
                if len(self._requests[client_id]) < self._max_requests:
                    self._requests[client_id].append(current_time)
                    return
                
                # Вычисляем время ожидания до освобождения слота
                oldest_request = min(self._requests[client_id])
                wait_time = oldest_request + self._window_seconds - current_time
            
            if wait_time > 0:
                await asyncio.sleep(wait_time + 0.01)  # Небольшой буфер
    
    def get_remaining_requests(self, client_id: str) -> int:
        """Возвращает количество оставшихся запросов для client_id"""
        current_time = time.time()
        cutoff = current_time - self._window_seconds
        active_requests = sum(1 for t in self._requests.get(client_id, []) if t > cutoff)
        return max(0, self._max_requests - active_requests)


# Singleton экземпляр rate limiter
_rate_limiter: SlidingWindowRateLimiter | None = None


def get_rate_limiter() -> SlidingWindowRateLimiter:
    """Dependency Inversion: Получение экземпляра rate limiter"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=1.0)
    return _rate_limiter


def init_rate_limiter(max_requests: int = 10, window_seconds: float = 1.0) -> None:
    """Инициализация rate limiter с кастомными параметрами"""
    global _rate_limiter
    _rate_limiter = SlidingWindowRateLimiter(max_requests=max_requests, window_seconds=window_seconds)


def shutdown_rate_limiter() -> None:
    """Shutdown rate limiter"""
    global _rate_limiter
    _rate_limiter = None

