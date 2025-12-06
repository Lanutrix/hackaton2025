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

    async def generate_instructions(self, name: str, params: Dict[str, str]) -> Dict[str, Any]:
        """Генерирует пошаговую инструкцию по утилизации товара"""
        
        # Create cache key from name and params
        cache_key = f"{name}:{json.dumps(params, sort_keys=True, ensure_ascii=False)}"
        
        # Check cache before request
        if cache_key in self._mapping:
            return self._mapping[cache_key]
        
        # If not in cache, execute request with semaphore limit
        async with self._semaphore:  # Limit concurrent requests
            await self._ensure_client()
            
            try:
                # Format params for user prompt
                params_str = ", ".join([f"{k}: {v}" for k, v in params.items()])
                user_message = USER_PROMPT.format(name=name, params=params_str)
                
                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini-2024-07-18",
                    temperature=0.3,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message}
                    ]
                )
                response_text = response.choices[0].message.content.strip()
                
                # Parse JSON from response
                try:
                    result = json.loads(response_text)
                except json.JSONDecodeError:
                    # If failed to parse, try to extract JSON from text
                    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text)
                    if json_match:
                        result = json.loads(json_match.group())
                    else:
                        # If JSON not found, return error in JSON format
                        result = {"error": "Не удалось распарсить JSON из ответа", "raw_response": response_text}
            except Exception as e:
                result = {"error": f"Ошибка генерации инструкций: {str(e)}"}
            
            await asyncio.sleep(0.1)  # Delay between requests
            # Save result to cache
            self._mapping[cache_key] = result
            return result


_disposal_instructions = None

async def init_disposal_instructions():
    global _disposal_instructions
    _disposal_instructions = DisposalInstructionsGenerator()

async def shutdown_disposal_instructions():
    global _disposal_instructions
    if _disposal_instructions:
        await _disposal_instructions.close()
    _disposal_instructions = None

async def generate_disposal_instructions(name: str, params: Dict[str, str]) -> Dict[str, Any]:
    return await _disposal_instructions.generate_instructions(name, params)


# Пример использования
if __name__ == "__main__":
    async def main():
        await init_disposal_instructions()
        try:
            name = "АДРЕНАЛИН 0.449Л НАПИТОК БЕЗАЛКОГОЛЬНЫЙ ТОНИЗИРУЮЩИЙ ГАЗИРОВАННЫЙ"
            params = {
                "ж/б": "металл",
                "напиток": "органика",
                "этикетка": "бумага",
                "крышка": "металл"
            }
            
            print(f"📦 {name}")
            print(f"🔧 Компоненты: {params}")
            result = await generate_disposal_instructions(name, params)
            print(f"📋 Инструкция:")
            for step, action in result.items():
                print(f"   {step}. {action}")
        finally:
            await shutdown_disposal_instructions()
    
    asyncio.run(main())

