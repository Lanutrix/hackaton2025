"""
Генератор инструкций по утилизации товаров.

Single Responsibility: Только логика генерации инструкций
Dependency Inversion: Зависит от абстракции OpenAIClientInterface
"""
import asyncio
import json
import re
from typing import Any, Dict, Optional

from src.utils.api import get_openai_client


# Системный промпт с инструкциями (легко редактировать)
SYSTEM_PROMPT = """Ты эксперт по сортировке и утилизации бытовых отходов в России с доступом к интернету.

Важно: даже при наличии доступа к интернету, не запрашивай информацию о конкретном товаре по его названию. Для построения инструкции используй ТОЛЬКО данные, переданные во входном JSON. Интернет можно использовать только как фоновое знание о типичных способах подготовки отходов (ополоснуть, высушить и т.п.), но не для добавления новых компонентов или изменения материалов.

Тебе на вход приходит JSON с названием товара и его компонентами с указанием материала:

{
  "name": "<название товара>",
  "params": {
    "<компонент_1>": "<материал>",
    "<компонент_2>": "<материал>",
    ...
  }
}

Допустимые категории материала для КАЖДОГО компонента строго ограничены:
- "Пищевые отходы"
- "Стекло"
- "Металл"
- "Бумага"
- "Пластик"
- "Смешанные отходы" (используй только если материал нельзя однозначно отнести к другим категориям)

Если во входных данных встречаются синонимы (например, "органика" вместо "Пищевые отходы"), исходи из того, что это уже было нормализовано до одной из категорий выше на стороне системы, и не меняй значения "params".

Твоя задача: по этим данным сформировать пошаговую инструкцию по утилизации товара.

Требования к инструкции:
- Каждый шаг — одно конкретное действие.
- Инструкция должна быть короткой и понятной.
- Учитывай, что человек выполняет все действия дома.
- Шаги должны идти в логичном порядке:
  1) подготовка (например, вылить/высыпать содержимое, убрать пищевые остатки),
  2) разделение на компоненты (отделить крышку, этикетку и т.п.),
  3) утилизация каждого компонента по его категории материала.
- ОБЯЗАТЕЛЬНО учитывай все указанные компоненты и их материалы из "params".
- Не придумывай новые компоненты, которых нет в "params".
- Если несколько компонентов относятся к одной и той же категории материала, их можно объединить в одном шаге.
- В шагах явно ссылайся на категорию материала (например: "утилизируй как металл", "утилизируй как бумагу").
- Не упоминай конкретные баки, цвета контейнеров, номера контейнеров и т.п. — только действия и категории материалов.

Формат ответа:
- Ответь ТОЛЬКО в формате JSON.
- Не используй markdown-разметку.
- Не добавляй никакого текста до или после JSON.
- В корне JSON должны быть только пронумерованные шаги:

{
  "1": "<шаг 1 — конкретное действие>",
  "2": "<шаг 2 — конкретное действие>",
  ...
}

Пример входных данных:
{
  "name": "АДРЕНАЛИН 0.449Л НАПИТОК БЕЗАЛКОГОЛЬНЫЙ ТОНИЗИРУЮЩИЙ ГАЗИРОВАННЫЙ «ADRENALINE RUSH SPICY ENERGY»",
  "params": {
    "жестяная банка": "Металл",
    "напиток": "Пищевые отходы",
    "этикетка": "Пластик",
    "крышка": "Металл"
  }
}

Пример выходных данных (только как шаблон формата):
{
  "1": "Вылей остатки напитка в раковину или в туалет, утилизируя их как пищевые отходы.",
  "2": "При необходимости сполосни банку водой, чтобы удалить остатки напитка.",
  "3": "Сними металлическую крышку с банки и отложи отдельно.",
  "4": "Отдели бумажную этикетку от банки.",
  "5": "Сомни жестяную банку для компактности.",
  "6": "Жестяную банку и крышку утилизируй как металл.",
  "7": "Бумажную этикетку утилизируй как бумагу."
}
"""

# Пользовательский промпт с данными товара
USER_PROMPT = """Товар: {name}
Компоненты: {params}"""


class DisposalInstructionsGenerator:
    """Генератор инструкций по утилизации"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_lock = asyncio.Lock()
    
    async def generate_instructions(
        self, 
        name: str, 
        params: Dict[str, str],
        client_ip: str
    ) -> Dict[str, Any]:
        """
        Генерирует пошаговую инструкцию по утилизации товара.
        
        Args:
            name: Название товара
            params: Компоненты товара с типами материалов
            client_ip: IP адрес клиента для rate limiting
            
        Returns:
            Словарь с пошаговыми инструкциями
        """
        # Создаём ключ кэша
        cache_key = f"{name}:{json.dumps(params, sort_keys=True, ensure_ascii=False)}"
        
        # Проверяем кэш
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        async with self._cache_lock:
            # Double-check после получения лока
            if cache_key in self._cache:
                return self._cache[cache_key]
            
            try:
                # Форматируем params для user prompt
                params_str = ", ".join([f"{k}: {v}" for k, v in params.items()])
                user_message = USER_PROMPT.format(name=name, params=params_str)
                
                client = get_openai_client()
                response_text = await client.chat_completion(
                    client_ip=client_ip,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=0.3
                )
                
                # Парсим JSON из ответа
                try:
                    result = json.loads(response_text)
                except json.JSONDecodeError:
                    # Если не удалось распарсить, пытаемся извлечь JSON из текста
                    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text)
                    if json_match:
                        result = json.loads(json_match.group())
                    else:
                        result = {"error": "Не удалось распарсить JSON из ответа", "raw_response": response_text}
                        
            except Exception as e:
                result = {"error": f"Ошибка генерации инструкций: {str(e)}"}
            
            # Сохраняем в кэш
            self._cache[cache_key] = result
            return result
    
    def clear_cache(self) -> None:
        """Очистка кэша"""
        self._cache.clear()


# Singleton экземпляр (ленивая инициализация)
_disposal_instructions: Optional[DisposalInstructionsGenerator] = None


def _get_generator() -> DisposalInstructionsGenerator:
    """Получение или создание генератора"""
    global _disposal_instructions
    if _disposal_instructions is None:
        _disposal_instructions = DisposalInstructionsGenerator()
    return _disposal_instructions


async def generate_disposal_instructions(
    name: str, 
    params: Dict[str, str],
    client_ip: str = "default"
) -> Dict[str, Any]:
    """
    Генерация инструкций по утилизации.
    
    Args:
        name: Название товара
        params: Компоненты товара с типами материалов
        client_ip: IP адрес клиента (по умолчанию "default")
    """
    return await _get_generator().generate_instructions(name, params, client_ip)
