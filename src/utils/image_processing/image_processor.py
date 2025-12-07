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
WASTE_ANALYSIS_PROMPT = """Ты эксперт по раздельному сбору и утилизации бытовых отходов в России. Тебе даётся фотография предмета или группы предметов.

Твоя задача:

1. Анализ изображения
- Найди и перечисли все видимые предметы/объекты, которые потенциально могут быть отходами.
- Для каждого сложного предмета (бутылка, упаковка, контейнер и т.п.) разберись на все составные части:
  - основная упаковка/корпус
  - крышка/колпачок
  - этикетка/стикер
  - внутренние элементы (например, фильтр, пакетик, вкладыш)
  - содержимое (напиток, остатки пищи, косметика и т.п.)
- Не придумывай невидимые части. Опирайся только на то, что отчётливо видно на фото.

2. Классификация материалов
Для КАЖДОЙ части укажи ТОЧНО один тип материала, выбрав только из следующих категорий:
- "Пищевые отходы"
- "Стекло"
- "Металл"
- "Бумага"
- "Пластик"
- "Смешанные отходы" (используй только если материал нельзя однозначно отнести к другим категориям по фото)

Правила определения материалов (обязательно учитывай текстуру и отражения):
- Этикетки:
  - матовые, легко рвутся → "Бумага"
  - глянцевые, блестят, полупрозрачные или прозрачные → "Пластик"
- Крышки:
  - однотонные пластиковые, слегка матовые или глянцевые, без следов коррозии → "Пластик"
  - блестящие, с металлическими отблесками, возможны вмятины, ржавчина → "Металл"
- Упаковки:
  - мягкие пакеты/обёртки с видимым металлическим слоем или сильным "фольгированным" блеском внутри или снаружи → "Металл"
  - прозрачные или полупрозрачные пакеты, плёнки, бутылки, контейнеры → "Пластик"
- Стекло:
  - твёрдое, блестящее, прозрачное/полупрозрачное, часто с характерными бликами и толщиной на кромке → "Стекло"
- Бумага:
  - матовая, волокнистая, может мяться и иметь заломы без блеска → "Бумага"
- Пищевые отходы:
  - видимые остатки еды, напитков, косточки, кожура, мякоть, соусы и т.п. → "Пищевые отходы"
- Если по виду материала ты всё равно сомневаешься — используй категорию "Смешанные отходы".

3. Инструкция по утилизации
Составь короткую, практичную, пошаговую инструкцию из 5–7 шагов:
- Шаги должны быть последовательными: подготовка → разделение → утилизация.
- Каждый шаг — одно конкретное действие, которое человек реально может сделать дома.
- Если части предмета сделаны из разных материалов — обязательно укажи разные баки/контейнеры для каждого материала.
- Если на фото несколько одинаковых предметов (например, несколько бутылок), можно объединять их в инструкциях: "все бутылки", "все крышки" и т.п.

4. Формат ответа

Ответь СТРОГО в формате JSON, без пояснений, без markdown-разметки, без текста до или после JSON-объекта, без комментариев внутри JSON.

Структура ответа:
{
  "params": {
    "<название_компонента_1>": "<категория_материала>",
    "<название_компонента_2>": "<категория_материала>",
    ...
  },
  "steps": {
    "1": "<шаг 1 — конкретное действие>",
    "2": "<шаг 2 — конкретное действие>",
    ...
  }
}

Требования:
- Названия компонентов пиши максимально конкретно, но кратко (например: "пластиковая бутылка", "металлическая крышка", "бумажная этикетка", "остатки кофе").
- В значениях "params" используй ТОЛЬКО указанные категории: "Пищевые отходы", "Стекло", "Металл", "Бумага", "Пластик", "Смешанные отходы".
- В "steps" используй нумерацию ключей строками: "1", "2", "3" и т.д.
- Не добавляй никаких других полей, кроме "params" и "steps".

Пример формата (это только шаблон, не привязывайся к нему при анализе фото):
{
  "params": {
    "бутылка": "Пластик",
    "крышка": "Пластик",
    "этикетка": "Бумага",
    "остатки напитка": "Пищевые отходы"
  },
  "steps": {
    "1": "Вылей остатки напитка в раковину или в раковину/туалет.",
    "2": "Сполосни бутылку водой из-под крана.",
    "3": "Открути крышку и отложи отдельно.",
    "4": "Сними бумажную этикетку с бутылки.",
    "5": "Сомни бутылку для экономии места.",
    "6": "Бутылку и крышку положи в контейнер для пластика.",
    "7": "Этикетку положи в контейнер для бумаги."
  }
}
"""

# Промпт для распознавания штрихкода
BARCODE_DETECTION_PROMPT = """Ты система сверхточного распознавания цифр на изображении. Требуется находить штрихкод и вытаскивать цифры под ним.
Важно:
- На каждом изображении штрихкод ЕСТЬ (EAN-13 или EAN-8).
- Твоя задача — максимальными усилиями извлечь ЦИФРЫ этого штрихкода.
- NOT_FOUND допустим только как крайний случай, если достоверно прочитать код невозможно.

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
        detail: str = "high",
        max_tokens: int = 1024,
        temperature: float = 0.1,
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
            detail="high",
            max_tokens=64,
            temperature=0.0,
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
            max_tokens=1536,
            temperature=0.0,
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
