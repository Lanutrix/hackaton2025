import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiAnalyzeWaste } from "../api";

const PhotoAnalyzePage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      setError(null);
      setCameraReady(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera is not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось включить камеру.");
      }
    };

    void startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  const captureFrame = async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !cameraReady) return null;

    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, width, height);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
    });
  };

  const extractWasteParams = (data: unknown): Record<string, unknown> | null => {
    if (!data || typeof data !== "object") return null;
    const params = (data as { params?: unknown }).params;
    if (!params || typeof params !== "object") return null;
    return params as Record<string, unknown>;
  };

  const extractSteps = (data: unknown): Record<string, string> | null => {
    if (!data || typeof data !== "object") return null;
    const steps = (data as { steps?: unknown }).steps;
    if (!steps || typeof steps !== "object") return null;
    return Object.fromEntries(
      Object.entries(steps as Record<string, unknown>).filter(
        ([, value]) => typeof value === "string",
      ) as [string, string][],
    );
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const blob = await captureFrame();
      if (!blob) {
        throw new Error("Камера не готова, попробуйте еще раз.");
      }
      const file = new File([blob], "waste-photo.jpg", { type: blob.type || "image/jpeg" });

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const nextPreview = URL.createObjectURL(blob);
      setPreviewUrl(nextPreview);

      const data = await apiAnalyzeWaste(file);
      setResult(data);
      const params = extractWasteParams(data);
      const steps = extractSteps(data);

      navigate("/barcode-scan", {
        state: {
          productName: "Photo analysis result",
          result: data,
          waste: params,
          instructions: steps,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось проанализировать фото.");
    } finally {
      setLoading(false);
    }
  };

  const hasResult = result !== null && result !== undefined;

  return (
    <div className="min-h-screen bg-white text-[#111813] flex flex-col items-center px-4 py-8 font-display">
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
            onClick={() => navigate("/landing-forest")}
            className="h-11 px-4 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
          >
            Главная
          </button>
        </header>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black">Сфотографируйте предмет для анализа</h1>
            <p className="text-sm text-slate-600">Мы отправим кадр на сервер для определения вида отхода.</p>
          </div>

          <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-900/80 aspect-[4/3] flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
                <span className="material-symbols-outlined text-4xl">hourglass_top</span>
                <p className="text-sm">Включаем камеру...</p>
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img
                src={previewUrl}
                alt="Предпросмотр кадра"
                className="w-full object-contain max-h-[360px] bg-black/5"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!cameraReady || loading}
              className="h-12 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Отправляем..." : "Проанализировать"}
            </button>
            {hasResult && !error && (
              <div className="mt-2 bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-900">
                {typeof result === "string" ? (
                  <p>{result}</p>
                ) : (
                  <pre className="whitespace-pre-wrap break-words text-xs sm:text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoAnalyzePage;
