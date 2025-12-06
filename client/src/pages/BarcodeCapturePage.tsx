import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDetectBarcode } from "../api";

const BarcodeCapturePage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setError(null);
    setDetected(null);
  };

  const handleDetect = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDetected(null);
    try {
      const { barcode } = await apiDetectBarcode(file);
      setDetected(barcode);
      navigate(`/barcode-scan?barcode=${encodeURIComponent(barcode)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось определить штрих-код");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-[#111813] flex flex-col items-center px-4 py-8 font-display">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-11 px-4 rounded-lg border border-gray-300 bg-white font-bold text-[#111813] hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Назад
          </button>
          <button
            onClick={() => navigate("/search")}
            className="h-11 px-4 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
          >
            Поиск вручную
          </button>
        </header>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black">Сканирование штрих-кода</h1>
            <p className="text-slate-600 text-base">
              Загрузите фото штрих-кода или сделайте снимок с камеры телефона, чтобы мы определили код и нашли
              информацию о товаре.
            </p>
          </div>

          <label className="block rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-primary/70 transition-colors cursor-pointer p-4">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-slate-500">photo_camera</span>
              <div className="text-center">
                <p className="font-semibold text-slate-800">Выберите файл или сделайте фото</p>
                <p className="text-sm text-slate-500">Поддерживаются JPG, PNG, GIF, WEBP</p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              {file && <p className="text-sm text-slate-700">Файл: {file.name}</p>}
            </div>
          </label>

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src={previewUrl} alt="Предпросмотр" className="w-full object-contain max-h-[360px] bg-black/5" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDetect}
              disabled={!canSubmit}
              className="h-12 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Определяем штрих-код..." : "Отправить фото"}
            </button>
            {detected && (
              <p className="text-sm text-slate-700">
                Найден штрих-код: <span className="font-bold">{detected}</span>. Переходим к деталям...
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeCapturePage;
