"""Утилита для получения IP адреса клиента."""
from fastapi import Request


def get_client_ip(request: Request) -> str:
    """
    Получение IP адреса клиента.
    
    Проверяет заголовки прокси (X-Forwarded-For, X-Real-IP),
    затем fallback на request.client.host.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    if request.client:
        return request.client.host
    
    return "unknown"

