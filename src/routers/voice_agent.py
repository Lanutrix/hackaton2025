"""
Роутер для голосового AI-агента по сортировке мусора.

Функционал:
- Транскрибация аудио через gpt-4o-transcribe
- Стриминг ответов через SSE с gpt-4o-mini-2024-07-18
"""
from fastapi import APIRouter, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
import json

from src.utils.api import get_openai_client
from src.utils.client_ip import get_client_ip

router = APIRouter(
    prefix="/voice_agent",
    tags=["voice_agent"]
)

# Системный промпт для агента сортировки мусора
SYSTEM_PROMPT = """Ты — эксперт по сортировке и переработке мусора. Твоя задача — помочь пользователю понять, как правильно подготовить и утилизировать отходы.

ВАЖНЫЕ ПРАВИЛА:
1. Отвечай КРАТКО (до 300 символов, максимум 1000)
2. Задавай уточняющие вопросы по одному, чтобы понять:
   - Из какого материала сделан предмет (пластик, металл, стекло, бумага, органика и т.д.)
   - Есть ли остатки продукта внутри
   - Загрязнена ли упаковка
   - Можно ли её разделить на части
3. После 2-4 уточняющих вопросов, когда получишь достаточно информации, ОБЯЗАТЕЛЬНО верни JSON в формате:

```json
{
  "params": {
    "ключ1": "значение1",
    "ключ2": "значение2"
  },
  "steps": {
    "1": "Первый шаг",
    "2": "Второй шаг"
  }
}
```

Где params — это параметры отхода (материал, тип загрязнения и т.д.), а steps — пошаговая инструкция по подготовке к утилизации.

4. Говори на русском языке
5. Будь дружелюбным и понятным"""


class ChatMessage(BaseModel):
    role: str  # "user" или "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("/transcribe")
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    """
    Транскрибация аудио файла через gpt-4o-transcribe.
    
    Принимает: аудио файл (webm, wav, mp3 и др.)
    Возвращает: {"text": "транскрибированный текст"}
    """
    from io import BytesIO
    from fastapi import HTTPException
    
    client_ip = get_client_ip(request)
    openai_client = get_openai_client()
    
    # Читаем содержимое файла
    audio_content = await file.read()
    
    # Валидация: проверяем минимальный размер файла
    if len(audio_content) < 1000:  # Меньше 1KB - скорее всего пустая запись
        raise HTTPException(
            status_code=400, 
            detail="Аудио файл слишком короткий. Попробуйте записать более длинное сообщение."
        )
    
    print(f"Received audio file: {file.filename}, size: {len(audio_content)} bytes, content_type: {file.content_type}")
    
    # Определяем правильное расширение файла
    filename = file.filename or "audio.webm"
    content_type = file.content_type or ""
    
    # Убеждаемся, что расширение соответствует content-type
    if "mp4" in content_type and not filename.endswith(".mp4"):
        filename = "audio.mp4"
    elif "wav" in content_type and not filename.endswith(".wav"):
        filename = "audio.wav"
    elif "ogg" in content_type and not filename.endswith(".ogg"):
        filename = "audio.ogg"
    elif "webm" in content_type or "opus" in content_type:
        filename = "audio.webm"
    
    # Создаём file-like object из bytes
    audio_file = BytesIO(audio_content)
    
    # Транскрибируем
    try:
        text = await openai_client.transcribe_audio(
            client_ip=client_ip,
            audio_file=audio_file,
            filename=filename,
            model="whisper-1",
            language="ru"
        )
    except ValueError as e:
        # Ошибка валидации (например, слишком тихое аудио)
        error_msg = str(e)
        print(f"Audio validation error: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        error_msg = str(e)
        print(f"Transcription error: {error_msg}")
        if "Invalid file or format" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Формат аудио не поддерживается. Попробуйте записать ещё раз."
            )
        raise
    
    return {"text": text}


@router.post("/chat")
async def chat_stream(request: Request, chat_request: ChatRequest):
    """
    SSE endpoint для стриминга ответов агента.
    
    Принимает: историю сообщений
    Возвращает: SSE stream с частями ответа
    """
    client_ip = get_client_ip(request)
    openai_client = get_openai_client()
    
    # Формируем сообщения для API
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in chat_request.messages:
        messages.append({"role": msg.role, "content": msg.content})
    
    async def generate():
        """Генератор SSE событий"""
        try:
            async for chunk in openai_client.chat_completion_stream(
                client_ip=client_ip,
                messages=messages,
                model="gpt-4o-mini-2024-07-18",
                temperature=0.4,
                max_tokens=1000
            ):
                # Формат SSE: data: {json}\n\n
                data = json.dumps({"content": chunk}, ensure_ascii=False)
                yield f"data: {data}\n\n"
            
            # Финальное событие
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"data: {error_data}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

