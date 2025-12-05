from fastapi import APIRouter, Depends
from pydantic import BaseModel
from src.utils.barcode.parse_barcode import parse_barcode
from src.utils.barcode.product_waste_analyzer import parse_waste_with_web_search

router = APIRouter(
    tags=["barcode"]
)

class ProductDescRequest(BaseModel):
    product_desc: str

@router.get("/parse_barcode/{barcode}")
async def parse_barcode_route(barcode: int):
    return await parse_barcode(barcode)

@router.post("/parse_waste")
async def parse_waste_route(request: ProductDescRequest):
    result = await parse_waste_with_web_search(request.product_desc)
    return result