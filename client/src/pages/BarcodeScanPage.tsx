import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDisposalInstructions, apiParseBarcode, apiParseWaste } from "../api";

const BarcodeScanPage = () => {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [waste, setWaste] = useState<unknown>(null);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [instructions, setInstructions] = useState<Record<string, string> | null>(null);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [instructionsError, setInstructionsError] = useState<string | null>(null);

  const isBarcodeValid = useMemo(() => barcode.trim().length >= 6, [barcode]);
  const wasteEntries = useMemo(() => {
    if (!waste || typeof waste !== "object") return null;
    const entries = Object.entries(waste as Record<string, unknown>).filter(
      ([, value]) => typeof value === "string" || typeof value === "number",
    );
    return entries.length ? entries : null;
  }, [waste]);
  const instructionSteps = useMemo(() => {
    if (!instructions) return null;
    return Object.entries(instructions).sort(([a], [b]) => Number(a) - Number(b));
  }, [instructions]);

  useEffect(() => {
    if (!productName) return;
    const fetchWaste = async () => {
      setWasteLoading(true);
      setError(null);
      try {
        const wasteData = await apiParseWaste(productName);
        setWaste(wasteData);
      } catch (err) {
        setWaste(null);
        setError(err instanceof Error ? err.message : "Ошибка получения отходов");
      } finally {
        setWasteLoading(false);
      }
    };
    fetchWaste();
  }, [productName]);

  const deriveName = (data: unknown) => {
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      return (
        (typeof obj.name === "string" && obj.name) ||
        (typeof obj.title === "string" && obj.title) ||
        (typeof obj.product === "string" && obj.product) ||
        null
      );
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isBarcodeValid) return;
    setLoading(true);
    setError(null);
    setWaste(null);
    setInstructions(null);
    try {
      const data = await apiParseBarcode(barcode.trim());
      setResult(data);
      const name = deriveName(data);
      if (name) {
        setProductName(name);
      } else {
        setProductName(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запроса");
      setResult(null);
      setProductName(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-[#111813] flex flex-col items-center px-4 py-8 font-display">
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-4xl md:text-5xl font-black leading-tight">Сканирование штрихкода</h1>
        <p className="text-[#61896b] text-base">Введите штрихкод вручную или наведите камеру для поиска</p>
      </div>

      <div className="w-full max-w-4xl mt-8 bg-transparent p-4">
        <div className="relative w-full aspect-[4/3] bg-black/80 rounded-xl overflow-hidden shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center blur-sm"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCrwR-Rv_nLqKkDCLrse7vhsk5twOyYloOo4t6Ma_i3mWnd39y-HUIiCvH9NQ0L4iTDS8f9kEUuTcroo70qbE7NuzMyKDuDrHa_erO0wpIpmfGCzZ1Kg4-BI8gfUV3RG87aIDEnekWS0z3HtdZL25ItxTzzfGdoglCpMmHhDlB7U2sIWQMvnVdkkZ04QVs4-Z_xq66gdY6_fjwmEax2re8JI4Ppy6pAKsh7ZRfCK5KrIesZd-3UxdIwl293xzfExdm9m37mPNBZLu3n")',
              filter: "blur(6px) brightness(0.4)",
            }}
            aria-hidden
          />
          <div className="absolute inset-4 rounded-lg scan-frame" />
          <div className="absolute left-4 right-4 h-[3px] bg-primary scan-line" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/80 text-lg bg-black/40 px-4 py-2 rounded-lg">Наведите камеру на штрихкод</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl mt-6 flex flex-col gap-3">
        <label className="flex items-center h-12 w-full rounded-lg border border-gray-200 bg-white overflow-hidden px-3 gap-3">
          <span className="material-symbols-outlined text-gray-500">qr_code_scanner</span>
          <input
            className="flex-1 h-full border-none outline-none text-base"
            placeholder="Введите штрихкод"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!isBarcodeValid || loading}
            className="flex-1 h-12 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Поиск..." : "Найти товар"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="h-12 px-4 rounded-lg border border-gray-300 text-[#111813] font-bold bg-white hover:bg-gray-100 transition-colors"
          >
            Поиск по описанию
          </button>
        </div>
      </form>

      {error && <p className="text-red-600 mt-3">{error}</p>}
      {result && !error && (
        <div className="w-full max-w-xl mt-4 bg-white border border-gray-200 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-slate-700 mb-2">
            <span className="material-symbols-outlined">inventory_2</span>
            <p className="font-semibold">Найденный товар</p>
          </div>
          {typeof result === "string" ? (
            <p className="text-base text-slate-900">{result}</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-slate-900">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {productName && (
        <div className="w-full max-w-xl mt-4 bg-white border border-gray-200 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-slate-700 mb-1">
            <span className="material-symbols-outlined">sell</span>
            <p className="font-semibold">Название товара</p>
          </div>
          <p className="text-base text-slate-900">{productName}</p>
        </div>
      )}

      {wasteLoading && <p className="text-slate-600 mt-3">Определяем отходы...</p>}
      {waste && wasteEntries && !wasteLoading && (
        <div className="w-full max-w-xl mt-4 bg-white border border-gray-200 rounded-lg p-3 text-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="material-symbols-outlined">recycling</span>
            <p className="font-semibold">Отходы</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {wasteEntries.map(([part, type]) => (
              <div
                key={part}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 bg-primary/5"
              >
                <span className="text-sm font-medium text-slate-800">{part}</span>
                <span className="text-sm font-bold text-primary">{String(type)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={instructionsLoading}
              onClick={async () => {
                if (!productName || !wasteEntries) return;
                setInstructionsLoading(true);
                setInstructionsError(null);
                try {
                  const params = Object.fromEntries(
                    wasteEntries.map(([part, type]) => [part, String(type)]),
                  );
                  const data = await apiDisposalInstructions(productName, params);
                  setInstructions(
                    Object.fromEntries(
                      Object.entries(data).filter(
                        ([, v]) => typeof v === "string",
                      ) as [string, string][],
                    ),
                  );
                } catch (err) {
                  setInstructions(null);
                  setInstructionsError(
                    err instanceof Error ? err.message : "Ошибка получения инструкций",
                  );
                } finally {
                  setInstructionsLoading(false);
                }
              }}
              className="h-10 px-4 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {instructionsLoading ? "Получаем..." : "Получить инструкцию"}
            </button>
          </div>
          {instructionsError && <p className="text-red-600">{instructionsError}</p>}
          {instructionSteps && !instructionsError && (
            <ol className="list-decimal list-inside space-y-2 text-slate-900">
              {instructionSteps.map(([step, text]) => (
                <li key={step} className="text-sm">
                  {text}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="w-full max-w-sm mt-6 flex gap-3">
        <button
          className="w-full h-12 rounded-lg border border-gray-300 text-[#111813] font-bold flex items-center justify-center gap-2 bg-white hover:bg-gray-100 transition-colors"
          onClick={() => navigate(-1)}
          type="button"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Назад
        </button>
        <button
          className="h-12 px-4 rounded-lg bg-black text-white font-bold hover:bg-black/90 transition-colors"
          onClick={() => navigate("/landing-forest")}
          type="button"
        >
          Домой
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanPage;
