"""
Обработчик изображений для анализа мусора.

Single Responsibility: Только логика обработки изображений
Dependency Inversion: Зависит от абстракции OpenAIClientInterface
"""
import asyncio
import json
import re
import hashlib
from typing import Any, Dict, Optional

from src.utils.api import get_openai_client


# Системный промпт для анализа изображений мусора
WASTE_ANALYSIS_PROMPT = """Ты эксперт по сортировке и утилизации отходов в России.
Проанализируй фото и определи все видимые компоненты для раздельного сбора мусора.

Твоя задача:
1. Разбери предмет на ВСЕ составные части (упаковка, крышка, этикетка, содержимое и т.д.)
2. Для каждой части ТОЧНО определи тип материала: пластик, стекло, металл, бумага, картон, тетрапак, органика
3. Составь короткую пошаговую инструкцию по утилизации (каждый шаг - одно действие)

ВАЖНО - правила определения материалов:
- Этикетки бывают: бумажные (матовые, легко рвутся) → "бумага"
- Крышки: пластиковые → "пластик", металлические → "металл"
- Фольгированные упаковки, пакеты с металлическим слоем → "металл"
- Тетрапак (молоко, соки) → "тетрапак" (отдельный контейнер)
- Внимательно смотри на ТЕКСТУРУ материала на фото!

Инструкция должна быть:
- Короткой и понятной (максимум 5-7 шагов)
- Практичной (человек делает это дома)
- Последовательной (подготовка → разделение → утилизация)
- Если компоненты из РАЗНЫХ материалов - указывай разные баки для каждого!

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

# Промпт для распознавания штрихкода
BARCODE_DETECTION_PROMPT = """Найди штрихкод на изображении и извлеки его номер.

Твоя задача:
1. Найти штрихкод (EAN-13, EAN-8, UPC-A, UPC-E или другой)
2. Прочитать цифры под штрихкодом или распознать их по полоскам

Ответь ТОЛЬКО цифрами штрихкода без пробелов и других символов.
Если штрихкод не найден или не читается, ответь: NOT_FOUND
Если видно несколько штрихкодов, верни только первый найденный.

Примеры ответов:
4600104030703
4607066980442
NOT_FOUND
"""


class ImageProcessor:
    """Процессор изображений для анализа мусора"""
    
    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._cache_lock = asyncio.Lock()
    
    def _generate_cache_key(self, prompt: str, image_base64: str) -> str:
        """Генерирует ключ кэша из промпта и хэша изображения"""
        image_hash = hashlib.md5(image_base64.encode()).hexdigest()
        return f"{prompt[:50]}:{image_hash}"
    
    async def process_image(
        self,
        prompt: str,
        image_base64: str,
        client_ip: str,
        detail: str = "auto",
        max_tokens: int = 1024,
        temperature: float = 0.3,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Обрабатывает изображение с заданным промптом.
        
        Args:
            prompt: Текстовый промпт для анализа изображения
            image_base64: Изображение в формате base64
            client_ip: IP адрес клиента для rate limiting
            detail: Уровень детализации (low, high, auto)
            max_tokens: Максимальное количество токенов в ответе
            temperature: Температура генерации
            use_cache: Использовать кэширование
        
        Returns:
            Dict с результатом обработки
        """
        cache_key = self._generate_cache_key(prompt, image_base64)
        
        if use_cache and cache_key in self._cache:
            return self._cache[cache_key]
        
        async with self._cache_lock:
            if use_cache and cache_key in self._cache:
                return self._cache[cache_key]
            
            try:
                client = get_openai_client()
                content = await client.vision(
                    client_ip=client_ip,
                    prompt=prompt,
                    image_base64=image_base64,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    detail=detail
                )
                
                result = {"success": True, "content": content}
                
            except Exception as e:
                result = {"success": False, "error": f"Ошибка обработки изображения: {str(e)}"}
            
            if use_cache:
                self._cache[cache_key] = result
            
            return result
    
    async def process_image_json(
        self,
        prompt: str,
        image_base64: str,
        client_ip: str,
        detail: str = "auto",
        max_tokens: int = 1024,
        temperature: float = 0.3,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Обрабатывает изображение и парсит ответ как JSON.
        """
        result = await self.process_image(
            prompt=prompt,
            image_base64=image_base64,
            client_ip=client_ip,
            detail=detail,
            max_tokens=max_tokens,
            temperature=temperature,
            use_cache=use_cache
        )
        
        if not result["success"]:
            return result
        
        content = result["content"]
        
        try:
            data = json.loads(content)
            return {"success": True, "data": data}
        except json.JSONDecodeError:
            # Пробуем извлечь JSON из markdown блока
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
    
    async def detect_barcode(
        self,
        image_base64: str,
        client_ip: str,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Распознаёт штрихкод на изображении.
        """
        result = await self.process_image(
            prompt=BARCODE_DETECTION_PROMPT,
            image_base64=image_base64,
            client_ip=client_ip,
            detail="low",
            max_tokens=64,
            temperature=0.1,
            use_cache=use_cache
        )
        
        if not result["success"]:
            return result
        
        content = result["content"].strip()
        
        if content == "NOT_FOUND" or not content:
            return {"success": False, "error": "Штрихкод не найден на изображении"}
        
        # Извлекаем только цифры
        digits = re.sub(r'\D', '', content)
        
        if not digits:
            return {
                "success": False,
                "error": "Не удалось распознать цифры штрихкода",
                "raw_content": content
            }
        
        return {"success": True, "barcode": digits}
    
    async def analyze_waste(
        self,
        image_base64: str,
        client_ip: str,
        detail: str = "high",
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Анализирует изображение мусора.
        """
        return await self.process_image_json(
            prompt=WASTE_ANALYSIS_PROMPT,
            image_base64=image_base64,
            client_ip=client_ip,
            detail=detail,
            max_tokens=1024,
            temperature=0.1,
            use_cache=use_cache
        )
    
    def clear_cache(self) -> None:
        """Очистка кэша"""
        self._cache.clear()


# Singleton экземпляр (ленивая инициализация)
_image_processor: Optional[ImageProcessor] = None


def _get_processor() -> ImageProcessor:
    """Получение или создание процессора"""
    global _image_processor
    if _image_processor is None:
        _image_processor = ImageProcessor()
    return _image_processor


async def process_image(
    prompt: str, 
    image_base64: str, 
    client_ip: str = "default",
    **kwargs
) -> Dict[str, Any]:
    """Обрабатывает изображение с заданным промптом."""
    return await _get_processor().process_image(prompt, image_base64, client_ip, **kwargs)


async def process_image_json(
    prompt: str, 
    image_base64: str, 
    client_ip: str = "default",
    **kwargs
) -> Dict[str, Any]:
    """Обрабатывает изображение и возвращает результат как JSON."""
    return await _get_processor().process_image_json(prompt, image_base64, client_ip, **kwargs)


async def analyze_waste(
    image_base64: str, 
    client_ip: str = "default",
    **kwargs
) -> Dict[str, Any]:
    """Анализирует фото мусора."""
    return await _get_processor().analyze_waste(image_base64, client_ip, **kwargs)


async def detect_barcode(
    image_base64: str, 
    client_ip: str = "default",
    **kwargs
) -> Dict[str, Any]:
    """Распознаёт штрихкод на фото."""
    return await _get_processor().detect_barcode(image_base64, client_ip, **kwargs)
