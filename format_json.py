#!/usr/bin/env python3
"""
Скрипт для форматирования JSON файла с красивыми отступами.
"""
import json
import sys
from pathlib import Path


def format_json_file(file_path: str, indent: int = 2):
    """
    Форматирует JSON файл с отступами.
    
    Args:
        file_path: Путь к JSON файлу
        indent: Количество пробелов для отступа (по умолчанию 2)
    """
    file_path_obj = Path(file_path)
    
    if not file_path_obj.exists():
        print(f"Ошибка: Файл '{file_path}' не найден.")
        sys.exit(1)
    
    try:
        # Читаем файл
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Записываем обратно с форматированием
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)
        
        print(f"✓ Файл '{file_path}' успешно отформатирован!")
        
    except json.JSONDecodeError as e:
        print(f"Ошибка: Неверный формат JSON в файле '{file_path}': {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Ошибка при обработке файла: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Путь к файлу по умолчанию
    default_file = r"c:\Users\Lanutrix\Downloads\openapi.json"
    
    # Если передан аргумент командной строки, используем его
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = default_file
    
    # Опционально можно указать размер отступа вторым аргументом
    indent = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    
    format_json_file(file_path, indent)

