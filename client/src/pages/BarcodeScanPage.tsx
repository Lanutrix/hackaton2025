import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  apiDisposalInstructions,
  apiParseBarcode,
  apiParseBarcodeLLM,
  apiParseWaste,
} from "../api";

type ParsedData = Record<string, unknown> | string | null;

const BarcodeScanPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<ParsedData>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [waste, setWaste] = useState<ParsedData>(null);
  const [wasteLoading, setWasteLoading] = useState(false);

  const [instructions, setInstructions] = useState<Record<string, string> | null>(null);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [instructionsError, setInstructionsError] = useState<string | null>(null);

  const [fallbackUsed, setFallbackUsed] = useState(false);

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
        const wasteData = (await apiParseWaste(productName)) as ParsedData;
        setWaste(wasteData);
      } catch (err) {
        setWaste(null);
        setError(err instanceof Error ? err.message : "Ошибка получения отходов");
      } finally {
        setWasteLoading(false);
      }
    };
    void fetchWaste();
  }, [productName]);

  useEffect(() => {
    if (!productName) return;
    if (!wasteEntries || !wasteEntries.length) return;
    if (instructions || instructionsLoading) return;
    const fetchInstructions = async () => {
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
    };
    void fetchInstructions();
  }, [productName, wasteEntries, instructions, instructionsLoading]);

  useEffect(() => {
    const initialBarcode = searchParams.get("barcode");
    if (!initialBarcode) return;
    if (initialBarcode !== barcode) {
      setBarcode(initialBarcode);
    }
    if (initialBarcode.trim().length >= 6) {
      void processBarcode(initialBarcode);
    }
  }, [searchParams]);

  const deriveName = (data: ParsedData) => {
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

  const processBarcode = async (code: string) => {
    if (!code.trim() || code.trim().length < 6) return;
    setLoading(true);
    setError(null);
    setWaste(null);
    setInstructions(null);
    setFallbackUsed(false);
    let usedFallback = false;
    try {
      let data = (await apiParseBarcode(code.trim())) as ParsedData;

      if (data === null) {
        usedFallback = true;
        setFallbackUsed(true);
        data = (await apiParseBarcodeLLM(code.trim())) as ParsedData;
      }

      if (data === null) {
        throw new Error("Не удалось распознать штрихкод");
      }

      setResult(data);
      const name = deriveName(data);
      if (name) {
        setProductName(name);
      } else {
        setProductName(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка разбора штрихкода");
      setResult(null);
      setProductName(null);
      setFallbackUsed(usedFallback);
    } finally {
      setLoading(false);
    }
  };

  const hasWaste = !!wasteEntries && !wasteLoading;
  const hasInstructions = !!instructionSteps && !instructionsError;

  const currentTitle = productName || (barcode ? `Товар по штрихкоду ${barcode}` : "Товар");

  const showStep1 = !error && (loading || (!productName && !result));
  const showStep2 = !error && !!productName && !hasWaste;
  const showStep3 = !error && !!productName && hasWaste && !hasInstructions;
  const showStep4 = !error && !!productName && hasWaste && hasInstructions;

  return (
    <div className="font-display text-[#111813] min-h-screen bg-white">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <div className="flex h-full grow flex-col">
          <div className="px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-5">
            <div className="flex flex-col max-w-[960px] flex-1">
              <div className="flex justify-end gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="p-2 text-[#111813] flex items-center gap-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                  <span className="font-bold hidden sm:inline">Отмена</span>
                </button>
              </div>

              <div className="flex-grow flex flex-col justify-center items-center p-4 space-y-12">
                {showStep1 && (
                  <>
                    <div className="flex flex-col items-center justify-center text-center space-y-4" id="step-1">
                      <div className="w-16 h-16 border-4 border-dashed border-primary/80 rounded-full animate-spin" />
                      <p className="text-xl text-gray-600">
                        Ищем название...
                      </p>
                      {fallbackUsed && (
                        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Используем интеллектуальный парсер штрихкодов.
                        </p>
                      )}
                    </div>
                    <div className="w-full border-t border-dashed border-gray-300 my-8" />
                  </>
                )}

                {showStep2 && (
                  <>
                    <div
                      className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6"
                      id="step-2"
                    >
                      <h1 className="text-[#111813] text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                        {currentTitle}
                      </h1>
                      <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
                        <div className="w-16 h-16 border-4 border-dashed border-primary/80 rounded-full animate-spin" />
                        <p className="text-xl text-gray-600">
                          Определяем компоненты...
                        </p>
                      </div>
                    </div>
                    <div className="w-full border-t border-dashed border-gray-300 my-8" />
                  </>
                )}

                {showStep3 && (
                  <>
                    <div
                      className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6"
                      id="step-3"
                    >
                      <h1 className="text-[#111813] text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                        {currentTitle}
                      </h1>
                      <div className="w-full flex flex-col gap-3 mt-4">
                        {wasteEntries?.map(([part, type]) => (
                          <div
                            key={part}
                            className="flex items-center gap-4 bg-white p-4 min-h-14 justify-between rounded-xl border border-gray-200"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-[#111813] flex items-center justify-center rounded-lg bg-[#f0f4f1] shrink-0 size-10">
                                <span className="material-symbols-outlined">recycling</span>
                              </div>
                              <p className="text-[#111813] text-base font-normal leading-normal flex-1">
                                {part}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2 text-blue-600">
                              <span className="material-symbols-outlined">category</span>
                              <p className="text-base font-bold leading-normal">
                                {String(type)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {instructionsLoading && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
                          <div className="w-16 h-16 border-4 border-dashed border-primary/80 rounded-full animate-spin" />
                          <p className="text-xl text-gray-600">
                            Определяем инструкцию...
                          </p>
                        </div>
                      )}
                    </div>
                    {!instructionsLoading && (
                      <div className="w-full border-t border-dashed border-gray-300 my-8" />
                    )}
                  </>
                )}

                {showStep4 && (
                  <div
                    className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6"
                    id="step-4"
                  >
                    <h1 className="text-[#111813] text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                      {currentTitle}
                    </h1>
                    <div className="w-full flex flex-col gap-3 mt-4">
                      {wasteEntries?.map(([part, type]) => (
                        <div
                          key={part}
                          className="flex items-center gap-4 bg-white p-4 min-h-14 justify-between rounded-xl border border-gray-200"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-[#111813] flex items-center justify-center rounded-lg bg-[#f0f4f1] shrink-0 size-10">
                              <span className="material-symbols-outlined">recycling</span>
                            </div>
                            <p className="text-[#111813] text-base font-normal leading-normal flex-1">
                              {part}
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2 text-blue-600">
                            <span className="material-symbols-outlined">category</span>
                            <p className="text-base font-bold leading-normal">
                              {String(type)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="w-full text-left mt-8">
                      <h2 className="text-[#111813] text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">
                        Инструкция по утилизации
                      </h2>
                      <div className="flex flex-col gap-4">
                        {instructionSteps?.map(([step, text]) => (
                          <div key={step} className="flex items-start gap-4">
                            <div className="flex items-center justify-center size-8 shrink-0 bg-primary/20 text-primary rounded-full font-bold">
                              {step}
                            </div>
                            <p className="text-[#111813] text-lg leading-relaxed pt-0.5">
                              {text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="w-full pt-12">
                      <button
                        type="button"
                        onClick={() => navigate("/landing-forest")}
                        className="w-full text-center text-lg font-bold py-4 px-6 rounded-xl bg-primary/70 text-background-dark hover:bg-primary/90 transition-all"
                      >
                        Готово
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="w-full max-w-2xl mx-auto mt-6">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left">
                      <p className="text-red-700 font-semibold mb-1">
                        Ошибка
                      </p>
                      <p className="text-red-700 text-sm">{error}</p>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(-1)}
                          className="h-10 px-4 rounded-lg border border-gray-300 text-[#111813] bg-white hover:bg-gray-100 transition-colors text-sm font-bold flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-base">arrow_back</span>
                          Назад
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanPage;
