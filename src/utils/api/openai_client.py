"""
Базовый клиент OpenAI с интеграцией rate limiting.

Single Responsibility: Управление OpenAI клиентом и выполнение запросов
Dependency Inversion: Зависит от абстракции RateLimiterInterface
"""
import os
import asyncio
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional, BinaryIO
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
    
    @abstractmethod
    async def transcribe_audio(
        self,
        client_ip: str,
        audio_file: BinaryIO,
        filename: str = "audio.webm",
        model: str = "whisper-1",
        language: str = "ru"
    ) -> str:
        """Транскрибация аудио"""
        pass
    
    @abstractmethod
    async def chat_completion_stream(
        self,
        client_ip: str,
        messages: List[Dict[str, Any]],
        model: str = "gpt-4o-mini-2024-07-18",
        temperature: float = 0.3,
        max_tokens: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        """Стриминг chat completion"""
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
    
    async def transcribe_audio(
        self,
        client_ip: str,
        audio_file: BinaryIO,
        filename: str = "audio.webm",
        model: str = "whisper-1",
        language: str = "ru"
    ) -> str:
        """
        Транскрибация аудио с rate limiting.
        
        Args:
            client_ip: IP адрес клиента для rate limiting
            audio_file: Аудио файл (file-like object)
            filename: Имя файла для определения формата
            model: Модель транскрибации (whisper-1 или gpt-4o-transcribe)
            language: Язык аудио
            
        Returns:
            Текст транскрипции
        """
        from io import BytesIO
        from pydub import AudioSegment
        
        await self._rate_limiter.wait_and_acquire(client_ip)
        
        client = await self._ensure_client()
        
        # Читаем содержимое файла
        audio_content = audio_file.read()
        audio_file.seek(0)
        
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".webm"
        print(f"Received audio: filename={filename}, ext={ext}, size={len(audio_content)}")
        
        # Конвертируем webm/ogg в mp3 для совместимости с API
        if ext in [".webm", ".ogg", ".opus"]:
            try:
                print("Converting audio to mp3...")
                audio_input = BytesIO(audio_content)
                
                # Определяем формат для pydub
                format_name = "webm" if ext == ".webm" else ext[1:]
                audio_segment = AudioSegment.from_file(audio_input, format=format_name)
                
                # Проверяем уровень громкости (dBFS) - если слишком тихо, отклоняем
                loudness = audio_segment.dBFS
                print(f"Audio loudness: {loudness} dBFS")
                
                # -50 dBFS - это очень тихо, скорее всего тишина или шум
                if loudness < -45:
                    raise ValueError(f"Аудио слишком тихое ({loudness:.1f} dBFS). Говорите громче или ближе к микрофону.")
                
                # Конвертируем в mp3
                mp3_buffer = BytesIO()
                audio_segment.export(mp3_buffer, format="mp3", bitrate="128k")
                mp3_buffer.seek(0)
                audio_content = mp3_buffer.read()
                filename = "audio.mp3"
                ext = ".mp3"
                print(f"Converted to mp3: size={len(audio_content)}")
            except ValueError:
                raise  # Пробрасываем ошибку тихого аудио
            except Exception as e:
                print(f"Audio conversion failed: {e}, trying original format")
        
        # Определяем content-type по расширению
        content_type_map = {
            ".webm": "audio/webm",
            ".mp4": "audio/mp4",
            ".m4a": "audio/m4a",
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".ogg": "audio/ogg",
            ".opus": "audio/opus",
        }
        content_type = content_type_map.get(ext, "audio/mpeg")
        
        print(f"Transcribing audio: filename={filename}, content_type={content_type}, size={len(audio_content)}")
        
        response = await client.audio.transcriptions.create(
            model=model,
            file=(filename, audio_content, content_type),
            language=language
        )
        
        return response.text.strip()
    
    async def chat_completion_stream(
        self,
        client_ip: str,
        messages: List[Dict[str, Any]],
        model: str = "gpt-4o-mini-2024-07-18",
        temperature: float = 0.3,
        max_tokens: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        """
        Стриминг chat completion с rate limiting.
        
        Args:
            client_ip: IP адрес клиента для rate limiting
            messages: Список сообщений для API
            model: Модель OpenAI
            temperature: Температура генерации
            max_tokens: Максимальное количество токенов
            
        Yields:
            Части текста ответа по мере их генерации
        """
        await self._rate_limiter.wait_and_acquire(client_ip)
        
        client = await self._ensure_client()
        
        kwargs = {
            "model": model,
            "temperature": temperature,
            "messages": messages,
            "stream": True
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        
        stream = await client.chat.completions.create(**kwargs)
        
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


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
