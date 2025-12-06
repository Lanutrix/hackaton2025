import json
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Dict
from src.utils.barcode.parse_barcode import parse_barcode
from src.utils.barcode.barcode_llm import parse_barcode_llm
from src.utils.barcode.product_waste_analyzer import parse_waste_with_web_search
from src.utils.barcode.disposal_instructions import generate_disposal_instructions
from src.utils.client_ip import get_client_ip

router = APIRouter(
    tags=["barcode"]
)

# Кэш для инструкций по утилизации
_disposal_cache: Dict[str, dict] = {}


class ProductDescRequest(BaseModel):
    product_desc: str


class DisposalRequest(BaseModel):
    name: str
    params: Dict[str, str]


@router.get("/parse_barcode/{barcode}")
async def parse_barcode_route(barcode: int):
    return await parse_barcode(barcode)


@router.get("/parse_barcode_llm/{barcode}")
async def parse_barcode_llm_route(barcode: int, request: Request):
    """Альтернативный поиск названия товара по штрих-коду через LLM с веб-поиском"""
    client_ip = get_client_ip(request)
    return await parse_barcode_llm(barcode, client_ip)


@router.post("/parse_waste")
async def parse_waste_route(request_body: ProductDescRequest, request: Request):
    client_ip = get_client_ip(request)
    result = await parse_waste_with_web_search(request_body.product_desc, client_ip)
    return result


@router.post("/disposal_instructions")
async def disposal_instructions_route(request_body: DisposalRequest, request: Request):
    client_ip = get_client_ip(request)
    
    # Формируем ключ кэша
    cache_key = f"{request_body.name}:{json.dumps(request_body.params, sort_keys=True, ensure_ascii=False)}"
    
    # Проверяем кэш
    if cache_key in _disposal_cache:
        return _disposal_cache[cache_key]
    
    # Если нет в кэше - запрашиваем у LLM
    result = await generate_disposal_instructions(request_body.name, request_body.params, client_ip)
    
    # Сохраняем в кэш
    _disposal_cache[cache_key] = result
    return result
