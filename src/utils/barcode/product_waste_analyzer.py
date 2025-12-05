import os
import asyncio
import json
import re
from typing import Any, Dict
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = "https://api.proxyapi.ru/openai/v1"

if API_KEY is None:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment")


class ProductWasteAnalyzer:
    def __init__(self):
        self.client = None
        self._semaphore = asyncio.Semaphore(1)  # Limit: no more than 1 concurrent request
        self._mapping = {}  # Cache for parsing results

    async def _ensure_client(self):
        if self.client is None:
            self.client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL)

    async def close(self):
        if self.client:
            await self.client.close()
            self.client = None

    async def parse_waste_with_web_search(self, product_desc: str) -> Dict[str, Any]:
        """Работает с endpoint /responses и type: web_search"""
        
        # Check cache before request
        if product_desc in self._mapping:
            return self._mapping[product_desc]
        
        # If not in cache, execute request with semaphore limit
        async with self._semaphore:  # Limit concurrent requests
            await self._ensure_client()
            
            try:
                # Используем responses endpoint вместо chat/completions
                response = await self.client.responses.create(
                    model="gpt-4o-mini-2024-07-18",  # или gpt-4o-2024-11-20
                    temperature=0.1,  # Низкая температура для более детерминированных ответов
                    tools=[{
                        "type": "web_search",
                        "search_context_size": "high"  # low, medium, high
                    }],
                    input=f"Проанализируй товар `{product_desc}` для сортировки мусора. Разбери на компоненты и укажи типы отходов: стекло, пластик, металл, бумага, картон, фольга, тетрапак, органика, опасные отходы. Ответь кратко в формате JSON: {{\"элемент\": \"тип отхода\", ...}}"
                )
                response_text = response.output_text.strip()
                
                # Парсим JSON из ответа
                try:
                    result = json.loads(response_text)
                except json.JSONDecodeError:
                    # Если не удалось распарсить, пытаемся извлечь JSON из текста
                    # Ищем JSON блок в тексте
                    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text)
                    if json_match:
                        result = json.loads(json_match.group())
                    else:
                        # Если JSON не найден, возвращаем ошибку в формате JSON
                        result = {"error": "Не удалось распарсить JSON из ответа", "raw_response": response_text}
            except Exception as e:
                result = {"error": f"Ошибка анализа: {str(e)}"}
            
            await asyncio.sleep(0.1)  # Delay between requests
            # Save result to cache
            self._mapping[product_desc] = result
            return result


_product_waste_analyzer = None

async def init_product_waste_analyzer():
    global _product_waste_analyzer
    _product_waste_analyzer = ProductWasteAnalyzer()

async def shutdown_product_waste_analyzer():
    global _product_waste_analyzer
    if _product_waste_analyzer:
        await _product_waste_analyzer.close()
    _product_waste_analyzer = None

async def parse_waste_with_web_search(product_desc: str) -> Dict[str, Any]:
    return await _product_waste_analyzer.parse_waste_with_web_search(product_desc)


# Пример использования
if __name__ == "__main__":
    async def main():
        await init_product_waste_analyzer()
        try:
            products = [
                "ПЕЧЕНЬЕ ОВСЯНОЕ \"ЗЛАКОВОЕ АССОРТИ\"",
                "ПРОДУКТ ПИТЬЕВОЙ J7 0.3Л ПЕРСИК/ЯБЛОКО/МАНГО"
            ]
            
            # Доступные модели:
            # - gpt-4o-mini-search-preview-2025-03-11 (дешевле, ~36.72₽ запрос)
            # - gpt-4o-search-preview-2025-03-11 (дороже, точнее)
            
            for product in products:
                print(f"📦 {product}")
                result = await parse_waste_with_web_search(product)
                print(f"   {result}\n")
        finally:
            await shutdown_product_waste_analyzer()
    
    asyncio.run(main())
