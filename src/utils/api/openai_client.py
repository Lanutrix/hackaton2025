"""
Базовый клиент OpenAI с интеграцией rate limiting.

Single Responsibility: Управление OpenAI клиентом и выполнение запросов
Dependency Inversion: Зависит от абстракции RateLimiterInterface
"""
import os
import asyncio
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from openai import AsyncOpenAI

from .rate_limiter import get_rate_limiter, RateLimiterInterface

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = "https://api.proxyapi.ru/openai/v1"

if API_KEY is None:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment")


class OpenAIClientInterface(ABC):
    """Interface Segregation: Интерфейс для OpenAI клиента"""
    
    @abstractmethod
    async def chat_completion(
        self,
        client_ip: str,
        messages: List[Dict[str, Any]],
        model: str = "gpt-4o-mini-2024-07-18",
        temperature: float = 0.3,
        max_tokens: Optional[int] = None
    ) -> str:
        """Выполнение chat completion запроса"""
        pass
    
    @abstractmethod
    async def web_search(
        self,
        client_ip: str,
        prompt: str,
        model: str = "gpt-4o-mini-2024-07-18",
        temperature: float = 0.1,
        search_context_size: str = "high"
    ) -> str:
        """Выполнение запроса с веб-поиском"""
        pass
    
    @abstractmethod
    async def vision(
        self,
        client_ip: str,
        prompt: str,
        image_base64: str,
        model: str = "gpt-4o-mini-2024-07-18",
        temperature: float = 0.3,
        max_tokens: int = 1024,
        detail: str = "auto"
    ) -> str:
        """Выполнение запроса с изображением"""
        pass


class RateLimitedOpenAIClient(OpenAIClientInterface):
    """
    OpenAI клиент с rate limiting по IP.
    
    Open/Closed: Расширяемый для добавления новых типов запросов
    Liskov Substitution: Может быть заменен любой реализацией OpenAIClientInterface
    """
    
    def __init__(self, rate_limiter: Optional[RateLimiterInterface] = None):
        """
        Args:
            rate_limiter: Экземпляр rate limiter (опционально, используется глобальный)
        """
        self._client: Optional[AsyncOpenAI] = None
        self._rate_limiter = rate_limiter or get_rate_limiter()
        self._client_lock = asyncio.Lock()
    
    async def _ensure_client(self) -> AsyncOpenAI:
        """Ленивая инициализация клиента"""
        if self._client is None:
            async with self._client_lock:
                if self._client is None:
                    self._client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL)
        return self._client
    
    async def close(self) -> None:
        """Закрытие клиента"""
        if self._client:
            await self._client.close()
            self._client = None
    
    async def chat_completion(
        self,
        client_ip: str,
        messages: List[Dict[str, Any]],
        model: str = "gpt-4o-mini-2024-07-18",
        temperature: float = 0.3,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Выполнение chat completion запроса с rate limiting.
        
        Args:
            client_ip: IP адрес клиента для rate limiting
            messages: Список сообщений для API
            model: Модель OpenAI
            temperature: Температура генерации
            max_tokens: Максимальное количество токенов (опционально)
            
        Returns:
            Текст ответа от API
        """
        await self._rate_limiter.wait_and_acquire(client_ip)
        
        client = await self._ensure_client()
        
        kwargs = {
            "model": model,
            "temperature": temperature,
            "messages": messages
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        
        response = await client.chat.completions.create(**kwargs)
        
        return response.choices[0].message.content.strip()
    
    async def web_search(
        self,
        client_ip: str,
        prompt: str,
        model: str = "gpt-4o-mini-2024-07-18",
        temperature: float = 0.1,
        search_context_size: str = "high"
    ) -> str:
        """
        Выполнение запроса с веб-поиском и rate limiting.
        
        Args:
            client_ip: IP адрес клиента для rate limiting
            prompt: Текст запроса
            model: Модель OpenAI
            temperature: Температура генерации
            search_context_size: Размер контекста поиска (low, medium, high)
            
        Returns:
            Текст ответа от API
        """
        await self._rate_limiter.wait_and_acquire(client_ip)
        
        client = await self._ensure_client()
        
        response = await client.responses.create(
            model=model,
            temperature=temperature,
            tools=[{
                "type": "web_search",
                "search_context_size": search_context_size
            }],
            input=prompt
        )
        
        return response.output_text.strip()
    
    async def vision(
        self,
        client_ip: str,
        prompt: str,
        image_base64: str,
        model: str = "gpt-4o-mini-2024-07-18",
        temperature: float = 0.3,
        max_tokens: int = 1024,
        detail: str = "auto"
    ) -> str:
        """
        Выполнение запроса с изображением и rate limiting.
        
        Args:
            client_ip: IP адрес клиента для rate limiting
            prompt: Текст запроса
            image_base64: Изображение в формате base64
            model: Модель OpenAI
            temperature: Температура генерации
            max_tokens: Максимальное количество токенов
            detail: Уровень детализации (low, high, auto)
            
        Returns:
            Текст ответа от API
        """
        await self._rate_limiter.wait_and_acquire(client_ip)
        
        client = await self._ensure_client()
        
        # Определяем тип изображения
        if image_base64.startswith("/9j/"):
            media_type = "image/jpeg"
        elif image_base64.startswith("iVBORw"):
            media_type = "image/png"
        elif image_base64.startswith("R0lGOD"):
            media_type = "image/gif"
        elif image_base64.startswith("UklGR"):
            media_type = "image/webp"
        else:
            media_type = "image/jpeg"
        
        image_url = f"data:{media_type};base64,{image_base64}"
        
        response = await client.chat.completions.create(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url,
                                "detail": detail
                            }
                        }
                    ]
                }
            ]
        )
        
        return response.choices[0].message.content.strip()


# Singleton экземпляр клиента
_openai_client: Optional[RateLimitedOpenAIClient] = None


async def init_openai_client() -> None:
    """Инициализация OpenAI клиента"""
    global _openai_client
    _openai_client = RateLimitedOpenAIClient()


async def shutdown_openai_client() -> None:
    """Shutdown OpenAI клиента"""
    global _openai_client
    if _openai_client:
        await _openai_client.close()
    _openai_client = None


def get_openai_client() -> RateLimitedOpenAIClient:
    """Получение экземпляра OpenAI клиента"""
    if _openai_client is None:
        raise RuntimeError("OpenAI client not initialized. Call init_openai_client() first.")
    return _openai_client
