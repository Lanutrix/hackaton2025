import os
import asyncio
import json
import hashlib
from typing import Any, Dict, Optional
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = "https://api.proxyapi.ru/openai/v1"

if API_KEY is None:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment")

# Системный промпт для анализа изображений мусора
WASTE_ANALYSIS_PROMPT = """Ты эксперт по сортировке и утилизации отходов в России.
Проанализируй фото и определи все видимые компоненты для раздельного сбора мусора.

Твоя задача:
1. Разбери предмет на ВСЕ составные части (упаковка, крышка, этикетка, содержимое и т.д.)
2. Для каждой части укажи тип отхода: пластик, стекло, металл, бумага, картон, тетрапак, органика, опасные, смешанные
3. Составь короткую пошаговую инструкцию по утилизации (каждый шаг - одно действие)

Инструкция должна быть:
- Короткой и понятной (максимум 5-7 шагов)
- Практичной (человек делает это дома)
- Последовательной (подготовка → разделение → утилизация)

Ответь ТОЛЬКО в формате JSON без markdown-разметки.

Пример ответа:
{
    "params": {
        "бутылка": "пластик",
        "крышка": "пластик",
        "этикетка": "бумага",
        "остатки напитка": "органика"
    },
    "steps": {
        "1": "Вылей остатки напитка в раковину.",
        "2": "Сполосни бутылку водой.",
        "3": "Открути крышку и отложи отдельно.",
        "4": "Сними бумажную этикетку.",
        "5": "Сомни бутылку для компактности.",
        "6": "Бутылку и крышку положи в бак для пластика.",
        "7": "Этикетку положи в бак для бумаги."
    }
}
"""


class ImageProcessor:
    """Универсальный асинхронный класс для обработки изображений с помощью GPT-4o Vision."""
    
    def __init__(self, max_concurrent_requests: int = 1):
        """
        Инициализация процессора изображений.
        
        Args:
            max_concurrent_requests: Максимальное количество одновременных запросов
        """
        self.client: Optional[AsyncOpenAI] = None
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)
        self._cache: Dict[str, Any] = {}
    
    async def _ensure_client(self):
        """Создает клиент OpenAI, если он еще не создан."""
        if self.client is None:
            self.client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL)
    
    async def close(self):
        """Закрывает клиент и освобождает ресурсы."""
        if self.client:
            await self.client.close()
            self.client = None
    
    def _generate_cache_key(self, prompt: str, image_base64: str) -> str:
        """Генерирует ключ кэша из промпта и хэша изображения."""
        image_hash = hashlib.md5(image_base64.encode()).hexdigest()
        return f"{prompt}:{image_hash}"
    
    async def process_image(
        self,
        prompt: str,
        image_base64: str,
        detail: str = "auto",
        max_tokens: int = 1024,
        temperature: float = 0.3,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Обрабатывает изображение с заданным промптом.
        
        Args:
            prompt: Текстовый промпт для анализа изображения
            image_base64: Изображение в формате base64 (без префикса data:image/...)
            detail: Уровень детализации ("low", "high", "auto")
            max_tokens: Максимальное количество токенов в ответе
            temperature: Температура генерации (0.0 - 2.0)
            use_cache: Использовать ли кэширование результатов
        
        Returns:
            Dict с результатом обработки:
            - success: True если успешно
            - content: Текстовый ответ модели
            - error: Описание ошибки (если success=False)
        """
        # Проверяем кэш
        cache_key = self._generate_cache_key(prompt, image_base64)
        if use_cache and cache_key in self._cache:
            return self._cache[cache_key]
        
        # Выполняем запрос с ограничением параллелизма
        async with self._semaphore:
            await self._ensure_client()
            
            try:
                # Определяем тип изображения (по умолчанию jpeg)
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
                
                # Формируем data URL
                image_url = f"data:{media_type};base64,{image_base64}"
                
                response = await self.client.chat.completions.create(
                    model="gpt-4o",
                    temperature=temperature,
                    max_tokens=max_tokens,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                },
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
                
                content = response.choices[0].message.content.strip()
                result = {
                    "success": True,
                    "content": content
                }
                
            except Exception as e:
                result = {
                    "success": False,
                    "error": f"Ошибка обработки изображения: {str(e)}"
                }
            
            await asyncio.sleep(0.1)  # Задержка между запросами
            
            # Сохраняем в кэш
            if use_cache:
                self._cache[cache_key] = result
            
            return result
    
    async def process_image_json(
        self,
        prompt: str,
        image_base64: str,
        detail: str = "auto",
        max_tokens: int = 1024,
        temperature: float = 0.3,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Обрабатывает изображение и парсит ответ как JSON.
        
        Args:
            prompt: Текстовый промпт (должен требовать JSON ответ)
            image_base64: Изображение в формате base64
            detail: Уровень детализации
            max_tokens: Максимальное количество токенов
            temperature: Температура генерации
            use_cache: Использовать кэширование
        
        Returns:
            Dict с результатом:
            - success: True если успешно
            - data: Распарсенный JSON
            - error: Описание ошибки (если success=False)
            - raw_content: Сырой ответ (если не удалось распарсить JSON)
        """
        result = await self.process_image(
            prompt=prompt,
            image_base64=image_base64,
            detail=detail,
            max_tokens=max_tokens,
            temperature=temperature,
            use_cache=use_cache
        )
        
        if not result["success"]:
            return result
        
        content = result["content"]
        
        try:
            # Пробуем парсить как JSON напрямую
            data = json.loads(content)
            return {"success": True, "data": data}
        except json.JSONDecodeError:
            # Пробуем извлечь JSON из markdown блока
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
            if json_match:
                try:
                    data = json.loads(json_match.group(1).strip())
                    return {"success": True, "data": data}
                except json.JSONDecodeError:
                    pass
            
            # Пробуем найти JSON объект в тексте
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                    return {"success": True, "data": data}
                except json.JSONDecodeError:
                    pass
            
            return {
                "success": False,
                "error": "Не удалось распарсить JSON из ответа",
                "raw_content": content
            }
    
    async def analyze_waste(
        self,
        image_base64: str,
        detail: str = "high",
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Анализирует изображение мусора и возвращает компоненты + инструкцию по утилизации.
        
        Args:
            image_base64: Изображение в формате base64
            detail: Уровень детализации ("low", "high", "auto")
            use_cache: Использовать кэширование
        
        Returns:
            Dict с результатом:
            - success: True если успешно
            - data: {
                "params": {"компонент": "тип отхода", ...},
                "steps": {"1": "шаг 1", "2": "шаг 2", ...}
              }
            - error: Описание ошибки (если success=False)
        """
        return await self.process_image_json(
            prompt=WASTE_ANALYSIS_PROMPT,
            image_base64=image_base64,
            detail=detail,
            max_tokens=1024,
            temperature=0.3,
            use_cache=use_cache
        )


# Глобальный экземпляр процессора
_image_processor: Optional[ImageProcessor] = None


async def init_image_processor(max_concurrent_requests: int = 1):
    """Инициализирует глобальный процессор изображений."""
    global _image_processor
    _image_processor = ImageProcessor(max_concurrent_requests=max_concurrent_requests)


async def shutdown_image_processor():
    """Закрывает глобальный процессор изображений."""
    global _image_processor
    if _image_processor:
        await _image_processor.close()
    _image_processor = None


async def process_image(prompt: str, image_base64: str, **kwargs) -> Dict[str, Any]:
    """
    Обрабатывает изображение с заданным промптом (использует глобальный процессор).
    
    Args:
        prompt: Текстовый промпт для анализа
        image_base64: Изображение в формате base64
        **kwargs: Дополнительные параметры (detail, max_tokens, temperature, use_cache)
    
    Returns:
        Dict с результатом обработки
    """
    if _image_processor is None:
        raise RuntimeError("ImageProcessor не инициализирован. Вызовите init_image_processor()")
    return await _image_processor.process_image(prompt, image_base64, **kwargs)


async def process_image_json(prompt: str, image_base64: str, **kwargs) -> Dict[str, Any]:
    """
    Обрабатывает изображение и возвращает результат как JSON.
    
    Args:
        prompt: Текстовый промпт (должен требовать JSON ответ)
        image_base64: Изображение в формате base64
        **kwargs: Дополнительные параметры
    
    Returns:
        Dict с распарсенным JSON
    """
    if _image_processor is None:
        raise RuntimeError("ImageProcessor не инициализирован. Вызовите init_image_processor()")
    return await _image_processor.process_image_json(prompt, image_base64, **kwargs)


async def analyze_waste(image_base64: str, **kwargs) -> Dict[str, Any]:
    """
    Анализирует фото мусора: определяет компоненты и даёт инструкцию по утилизации.
    
    Args:
        image_base64: Изображение в формате base64
        **kwargs: Дополнительные параметры (detail, use_cache)
    
    Returns:
        Dict с результатом:
        - success: True если успешно
        - data: {
            "params": {"компонент": "тип отхода", ...},
            "steps": {"1": "шаг 1", ...}
          }
    """
    if _image_processor is None:
        raise RuntimeError("ImageProcessor не инициализирован. Вызовите init_image_processor()")
    return await _image_processor.analyze_waste(image_base64, **kwargs)


# Пример использования
if __name__ == "__main__":
    import base64
    
    async def main():
        await init_image_processor()
        
        try:
            # Пример: загрузка изображения и обработка
            # image_path = "test_image.jpg"
            # with open(image_path, "rb") as f:
            #     image_base64 = base64.b64encode(f.read()).decode("utf-8")
            
            # Заглушка для теста
            image_base64 = "placeholder_base64_string"
            
            print("📷 Анализ изображения мусора...")
            
            # Используем специализированную функцию для анализа мусора
            result = await analyze_waste(image_base64)
            
            if result["success"]:
                data = result["data"]
                print("\n🔧 Компоненты:")
                for component, waste_type in data.get("params", {}).items():
                    print(f"   • {component}: {waste_type}")
                
                print("\n📋 Инструкция по утилизации:")
                for step_num, action in data.get("steps", {}).items():
                    print(f"   {step_num}. {action}")
            else:
                print(f"❌ Ошибка: {result.get('error')}")
                if "raw_content" in result:
                    print(f"   Сырой ответ: {result['raw_content']}")
                
        finally:
            await shutdown_image_processor()
    
    asyncio.run(main())

