import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDetectBarcode } from "../api";

const BarcodeCapturePage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const canSubmit = useMemo(() => cameraReady && !loading, [cameraReady, loading]);

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
        setError(err instanceof Error ? err.message : "Не удалось получить доступ к камере.");
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

  const handleDetect = async () => {
    setLoading(true);
    setError(null);
    setDetected(null);
    try {
      const blob = await captureFrame();
      if (!blob) {
        throw new Error("Не удалось сделать снимок с камеры.");
      }
      const file = new File([blob], "barcode.jpg", { type: blob.type || "image/jpeg" });

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const nextPreview = URL.createObjectURL(blob);
      setPreviewUrl(nextPreview);

      const { barcode } = await apiDetectBarcode(file);
      setDetected(barcode);
      navigate(`/barcode-scan?barcode=${encodeURIComponent(barcode)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить снимок.");
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
            <h1 className="text-3xl font-black">Сканирование штрих-кода с камеры</h1>
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
                <p className="text-sm">Запускаем камеру...</p>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 bg-black/45" />
                <div className="relative h-[46%] mx-4">
                  <div className="absolute -left-4 top-0 bottom-0 w-4 bg-black/45" />
                  <div className="absolute -right-4 top-0 bottom-0 w-4 bg-black/45" />
                  <div className="relative h-full border-2 border-green-400/70 overflow-hidden bg-black/10 scan-frame">
                    <div className="absolute left-2 right-2 h-[4px] bg-green-400 scan-line" />
                  </div>
                </div>
                <div className="flex-1 bg-black/45" />
              </div>
            </div>

          </div>


          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src={previewUrl} alt="Последний снимок" className="w-full object-contain max-h-[360px] bg-black/5" />
              <img
                src={previewUrl}
                alt="Последний снимок"
                className="w-full object-contain max-h-[360px] bg-black/5"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDetect}
              disabled={!canSubmit}
              className="h-12 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Отправляем снимок..." : "Сделать фото и отправить"}
            </button>
            {detected && (
              <p className="text-sm text-slate-700">
                Найден штрих-код: <span className="font-bold">{detected}</span>. Открываем детали...
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
