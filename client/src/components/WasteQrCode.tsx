import QRCode from "react-qr-code";

interface WasteQrCodeProps {
  waste: Record<string, unknown> | null;
  size?: number;
}

/**
 * Кодирует строку в Base64 с поддержкой UTF-8 (кириллица)
 */
const encodeToBase64 = (str: string): string => {
  // Преобразуем строку в UTF-8 байты, затем в Base64
  const utf8Bytes = new TextEncoder().encode(str);
  const binaryString = Array.from(utf8Bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binaryString);
};

/**
 * Компонент отображает QR-код со списком категорий отходов.
 * Из объекта { "кружка": "Смешанные отходы", "этикетка": "Бумага" }
 * извлекаются только значения: ["Смешанные отходы", "Бумага"]
 * 
 * QR-код содержит Base64-закодированный JSON для корректной передачи кириллицы.
 * Для декодирования: atob(qrData) -> JSON.parse -> массив категорий
 */
const WasteQrCode: React.FC<WasteQrCodeProps> = ({ waste, size = 200 }) => {
  if (!waste || typeof waste !== "object") {
    return null;
  }

  // Извлекаем только значения (категории отходов) в массив
  const categories = Object.values(waste).filter(
    (value): value is string => typeof value === "string"
  );

  if (categories.length === 0) {
    return null;
  }

  // Кодируем массив категорий в JSON, затем в Base64 для корректной кириллицы
  const jsonString = JSON.stringify(categories);
  const qrValue = `data:application/json;base64,${encodeToBase64(jsonString)}`;

  return (
    <div className="flex flex-col items-center">
      <div className="p-4 bg-white rounded-xl">
        <QRCode value={qrValue} size={size} />
      </div>
    </div>
  );
};

export default WasteQrCode;

