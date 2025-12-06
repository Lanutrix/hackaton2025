import base64
from fastapi import APIRouter, UploadFile, File, HTTPException
from src.utils.image_processing import analyze_waste, detect_barcode

router = APIRouter(
    tags=["image"]
)


@router.post("/analyze_waste")
async def analyze_waste_route(file: UploadFile = File(...)):
    """
    Анализирует фото мусора и возвращает компоненты + инструкцию по утилизации.
    
    Принимает изображение (jpeg, png, gif, webp).
    Возвращает:
    - params: компоненты и их типы отходов
    - steps: пошаговая инструкция по утилизации
    """
    # Проверяем тип файла
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый тип файла: {file.content_type}. Разрешены: {', '.join(allowed_types)}"
        )
    
    # Читаем файл и конвертируем в base64
    contents = await file.read()
    image_base64 = base64.b64encode(contents).decode("utf-8")
    
    # Анализируем изображение
    result = await analyze_waste(image_base64)
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Ошибка анализа изображения")
        )
    
    return result["data"]


@router.post("/detect_barcode")
async def detect_barcode_route(file: UploadFile = File(...)):
    """
    Распознаёт штрихкод на фото и возвращает его номер.
    
    Принимает изображение (jpeg, png, gif, webp).
    Возвращает:
    - barcode: номер штрихкода (строка цифр)
    
    Коды ошибок:
    - 400: Неподдерживаемый тип файла
    - 404: Штрихкод не найден (BARCODE_NOT_FOUND)
    - 500: Ошибка обработки изображения
    """
    # Проверяем тип файла
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_FILE_TYPE",
                "message": f"Неподдерживаемый тип файла: {file.content_type}. Разрешены: {', '.join(allowed_types)}"
            }
        )
    
    # Читаем файл и конвертируем в base64
    contents = await file.read()
    image_base64 = base64.b64encode(contents).decode("utf-8")
    
    # Распознаём штрихкод
    result = await detect_barcode(image_base64)
    
    if not result["success"]:
        # Штрихкод не найден — 404
        raise HTTPException(
            status_code=404,
            detail={
                "code": "BARCODE_NOT_FOUND",
                "message": result.get("error", "Штрихкод не найден на изображении")
            }
        )
    
    return {"barcode": result["barcode"]}

