"""
Анализатор товаров для сортировки мусора.

Single Responsibility: Только логика анализа товара на компоненты
Dependency Inversion: Зависит от абстракции OpenAIClientInterface
"""
import asyncio
import json
import re
from typing import Any, Dict, Optional

from src.utils.api import get_openai_client


class ProductWasteAnalyzer:
    """Анализатор товаров для сортировки мусора"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_lock = asyncio.Lock()
    
    async def parse_waste_with_web_search(
        self, 
        product_desc: str,
        client_ip: str
    ) -> Dict[str, Any]:
        """
        Анализирует товар для сортировки мусора с использованием веб-поиска.
        
        Args:
            product_desc: Описание товара
            client_ip: IP адрес клиента для rate limiting
            
        Returns:
            Словарь с компонентами и их типами отходов
        """
        # Проверяем кэш
        if product_desc in self._cache:
            return self._cache[product_desc]
        
        async with self._cache_lock:
            # Double-check после получения лока
            if product_desc in self._cache:
                return self._cache[product_desc]
            
            try:
                client = get_openai_client()
                response_text = await client.web_search(
                    client_ip=client_ip,
                    prompt=f"Проанализируй товар `{product_desc}` для сортировки мусора. Разбери на компоненты и укажи типы отходов: стекло, пластик, металл, бумага, картон, фольга, тетрапак, органика, опасные отходы. Ответь кратко в формате JSON: {{\"элемент\": \"тип отхода\", ...}}",
                    temperature=0.1
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
                result = {"error": f"Ошибка анализа: {str(e)}"}
            
            # Сохраняем в кэш
            self._cache[product_desc] = result
            return result
    
    def clear_cache(self) -> None:
        """Очистка кэша"""
        self._cache.clear()


# Singleton экземпляр (ленивая инициализация)
_product_waste_analyzer: Optional[ProductWasteAnalyzer] = None


def _get_analyzer() -> ProductWasteAnalyzer:
    """Получение или создание анализатора"""
    global _product_waste_analyzer
    if _product_waste_analyzer is None:
        _product_waste_analyzer = ProductWasteAnalyzer()
    return _product_waste_analyzer


async def parse_waste_with_web_search(
    product_desc: str,
    client_ip: str = "default"
) -> Dict[str, Any]:
    """
    Анализ товара для сортировки.
    
    Args:
        product_desc: Описание товара
        client_ip: IP адрес клиента (по умолчанию "default")
    """
    return await _get_analyzer().parse_waste_with_web_search(product_desc, client_ip)
