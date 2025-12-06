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
SYSTEM_PROMPT = """Ты эксперт по сортировке и утилизации отходов. 
Тебе дано название товара и его компоненты с указанием материалов.

Сформируй пошаговую инструкцию по утилизации этого товара.
Инструкция должна быть:
- Короткой и понятной (каждый шаг - одно действие)
- Практичной (учитывай что человек делает это дома)
- Последовательной (сначала подготовка, потом разделение, потом утилизация)
- Учитывать все указанные компоненты и их материалы

Ответь ТОЛЬКО в формате JSON без markdown-разметки.

Пример входных данных:
{
    "name": "АДРЕНАЛИН 0.449Л НАПИТОК БЕЗАЛКОГОЛЬНЫЙ ТОНИЗИРУЮЩИЙ ГАЗИРОВАННЫЙ «ADRENALINE RUSH SPICY ENERGY» («АДРЕНАЛИН РАШ ОСТРАЯ ЭНЕРГИЯ»). ПАСТЕРИЗОВАННЫЙ.НАПИТОК Б/А ТОНИЗ. ГАЗ. АДРЕНАЛИН РАШ ОСТРАЯ ЭНЕРГИЯ 0,449Л Ж/БНАПИТОК Б/А ЭНЕРГ. \"АДРЕНАЛИН РАШ ОСТРАЯ ЭНЕРГИЯ\" ПЕРЕЦ ТАБАСКО/ГРАН/КЛЮК ГАЗ Ж/Б 0,449Л",
    "params": {
        "ж/б": "металл",
        "напиток": "органика",
        "этикетка": "бумага",
        "крышка": "металл"
    }
}

Пример выходных данных:
{
    "1": "Вылей остатки напитка в раковину.",
    "2": "Сполосни банку водой, чтобы удалить липкость.",
    "3": "Сними металлическую крышку и отложи отдельно.",
    "4": "Отдели бумажную этикетку от банки.",
    "5": "Сложи или сомни металлическую банку для компактности.",
    "6": "Банку и крышку положи в бак для металла.",
    "7": "Бумажную этикетку положи в бак для бумаги."
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
