"""
Поиск названия товара по штрих-коду через LLM с веб-поиском.

Single Responsibility: Только логика поиска товара по штрих-коду
Dependency Inversion: Зависит от абстракции OpenAIClientInterface
"""
import asyncio
from typing import Dict, Optional

from src.utils.api import get_openai_client


class BarcodeLLMParser:
    """Парсер штрих-кодов через LLM с веб-поиском"""
    
    def __init__(self):
        self._cache: Dict[int, Optional[str]] = {}
        self._cache_lock = asyncio.Lock()
    
    async def parse_barcode(self, barcode: int, client_ip: str) -> Optional[str]:
        """
        Ищет название товара по штрих-коду через LLM с веб-поиском.
        
        Args:
            barcode: Штрих-код товара
            client_ip: IP адрес клиента для rate limiting
            
        Returns:
            Название товара или None если не найден
        """
        # Проверяем кэш
        if barcode in self._cache:
            return self._cache[barcode]
        
        async with self._cache_lock:
            # Double-check после получения лока
            if barcode in self._cache:
                return self._cache[barcode]
            
            try:
                client = get_openai_client()
                response_text = await client.web_search(
                    client_ip=client_ip,
                    prompt=f"Найди название товара по штрих-коду (EAN): {barcode}. Ответь ТОЛЬКО названием товара, без пояснений. Если не найдено - ответь null.",
                    temperature=0.1
                )
                
                # Проверяем на null/не найден
                if response_text.lower() in ['null', 'не найден', 'не найдено', 'not found', 'none']:
                    result = None
                else:
                    result = response_text
                    
            except Exception:
                result = None
            
            # Сохраняем в кэш
            self._cache[barcode] = result
            return result
    
    def clear_cache(self) -> None:
        """Очистка кэша"""
        self._cache.clear()


# Singleton экземпляр (ленивая инициализация)
_barcode_llm: Optional[BarcodeLLMParser] = None


def _get_parser() -> BarcodeLLMParser:
    """Получение или создание парсера"""
    global _barcode_llm
    if _barcode_llm is None:
        _barcode_llm = BarcodeLLMParser()
    return _barcode_llm


async def parse_barcode_llm(barcode: int, client_ip: str = "default") -> Optional[str]:
    """
    Поиск названия товара по штрих-коду.
    
    Args:
        barcode: Штрих-код товара
        client_ip: IP адрес клиента (по умолчанию "default")
    """
    return await _get_parser().parse_barcode(barcode, client_ip)
