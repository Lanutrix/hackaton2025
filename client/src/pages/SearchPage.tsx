import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiParseWaste } from "../api";

const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("пластиковая бутылка воды");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const wasteEntries = useMemo(() => {
    if (!result || typeof result !== "object") return null;
    const entries = Object.entries(result as Record<string, unknown>).filter(
      ([, value]) => typeof value === "string" || typeof value === "number",
    );
    return entries.length ? entries : null;
  }, [result]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiParseWaste(query.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запроса");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-[#111813] flex justify-center px-4 py-6 font-public">
      <div className="w-full max-w-5xl flex flex-col gap-4">
        <header className="flex items-center justify-between px-4 sm:px-6 md:px-8">
          <button
            className="flex items-center justify-center rounded-full h-14 w-14 bg-white text-slate-900 hover:bg-slate-100 shadow-sm transition-colors"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined text-3xl">arrow_back</span>
          </button>
          <div className="flex gap-3">
            <button
              className="flex items-center justify-center rounded-full h-10 w-10 bg-black/5 text-slate-900 hover:bg-black/10 transition-colors"
              onClick={() => navigate("/landing-forest")}
            >
              <span className="material-symbols-outlined text-xl">home</span>
            </button>
            <button
              className="flex items-center justify-center rounded-full h-10 w-10 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              onClick={() => navigate("/barcode-scan")}
            >
              <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 md:px-8 pb-10">
          <div className="text-center flex flex-col gap-2 py-4">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Поиск по описанию</h1>
            <p className="text-slate-600 text-base">
              Опиши товар или упаковку — подскажем тип отходов и как сортировать
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="sticky top-4 z-10 bg-background-light/90 backdrop-blur rounded-xl px-1 py-2 flex flex-col gap-3"
          >
            <label className="flex items-center h-14 w-full rounded-xl shadow-lg shadow-primary/10 bg-white overflow-hidden ring-1 ring-slate-200">
              <span className="material-symbols-outlined text-2xl text-slate-500 px-4">search</span>
              <input
                className="flex-1 h-full border-none outline-none text-base text-slate-900 placeholder:text-slate-500"
                placeholder="Например: картонная упаковка молока"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className="px-4 text-slate-500 hover:text-slate-700 transition-colors"
                  onClick={() => setQuery("")}
                  aria-label="Очистить запрос"
                >
                  <span className="material-symbols-outlined text-2xl">cancel</span>
                </button>
              )}
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="h-12 px-6 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Ищем..." : "Определить отход"}
              </button>
              <button
                type="button"
                onClick={() => setQuery("пластиковая бутылка воды 0.5л")}
                className="h-12 px-6 rounded-lg border border-slate-200 bg-white font-bold text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Пример
              </button>
            </div>
          </form>

          {error && <p className="text-red-600 mt-4">{error}</p>}
          {result && !error && (
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="material-symbols-outlined">recycling</span>
                <p className="font-semibold">Результат сортировки</p>
              </div>

              {wasteEntries ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {wasteEntries.map(([part, waste]) => (
                    <div
                      key={part}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 bg-primary/5"
                    >
                      <span className="text-sm font-medium text-slate-800">{part}</span>
                      <span className="text-sm font-bold text-primary">{String(waste)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-sm">Не удалось извлечь пары отходов. Сырой ответ ниже.</p>
              )}

              <details className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <summary className="cursor-pointer font-semibold">Сырой ответ</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-slate-800">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchPage;
