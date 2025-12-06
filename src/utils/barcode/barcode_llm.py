import os
import asyncio
import json
import re
from typing import Any, Dict, Optional
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = "https://api.proxyapi.ru/openai/v1"

if API_KEY is None:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment")


class BarcodeLLMParser:
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

    async def parse_barcode(self, barcode: int) -> Optional[str]:
        """Ищет название товара по штрих-коду через LLM с веб-поиском"""
        
        # Check cache before request
        if barcode in self._mapping:
            return self._mapping[barcode]
        
        # If not in cache, execute request with semaphore limit
        async with self._semaphore:  # Limit concurrent requests
            await self._ensure_client()
            
            try:
                # Используем responses endpoint с web_search
                response = await self.client.responses.create(
                    model="gpt-4o-mini-2024-07-18",
                    temperature=0.1,  # Низкая температура для более детерминированных ответов
                    tools=[{
                        "type": "web_search",
                        "search_context_size": "high"  # low, medium, high
                    }],
                    input=f"Найди название товара по штрих-коду (EAN): {barcode}. Ответь ТОЛЬКО названием товара, без пояснений. Если не найдено - ответь null."
                )
                response_text = response.output_text.strip()
                
                # Проверяем на null/не найден
                if response_text.lower() in ['null', 'не найден', 'не найдено', 'not found', 'none']:
                    result = None
                else:
                    result = response_text
                    
            except Exception as e:
                # В случае ошибки возвращаем None
                result = None
            
            await asyncio.sleep(0.1)  # Delay between requests
            # Save result to cache
            self._mapping[barcode] = result
            return result


_barcode_llm = None

async def init_barcode_llm():
    global _barcode_llm
    _barcode_llm = BarcodeLLMParser()

async def shutdown_barcode_llm():
    global _barcode_llm
    if _barcode_llm:
        await _barcode_llm.close()
    _barcode_llm = None

async def parse_barcode_llm(barcode: int) -> Optional[str]:
    return await _barcode_llm.parse_barcode(barcode)


# Пример использования
if __name__ == "__main__":
    async def main():
        await init_barcode_llm()
        try:
            barcodes = [
                4690228106217,
                5449000000996,  # Coca-Cola
                4607062760420
            ]
            
            for barcode in barcodes:
                print(f"🔍 Штрих-код: {barcode}")
                result = await parse_barcode_llm(barcode)
                print(f"   📦 Товар: {result}\n")
        finally:
            await shutdown_barcode_llm()
    
    asyncio.run(main())

