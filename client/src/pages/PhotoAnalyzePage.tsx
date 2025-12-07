import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiAnalyzeWaste } from "../api";
import Button from "../components/Button";
import CameraScreen from "../components/CameraScreen";

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
          productName: "Анализ фотографии",
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
    <CameraScreen
      title="Сфотографируйте предмет для анализа"
      subtitle="Мы отправим кадр на сервер для определения вида отхода."
      onBack={() => navigate(-1)}
      rightButtonLabel="Главная"
      onRightClick={() => navigate("/landing-forest")}
      fullScreenCamera
      footer={
        hasResult && !error && (
          <div className="mt-2 bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-900">
            {typeof result === "string" ? (
              <p>{result}</p>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-xs sm:text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        )
      }
    >
      <div className="flex-1 flex w-full p-[4px]">
        <div className="relative w-full">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
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

          <div className="absolute inset-x-0 bottom-6 flex justify-center">
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={!cameraReady || loading}
              size="lg"
              loading={loading}
              loadingText="Отправляем..."
              leftIcon={<span className="material-symbols-outlined">photo_camera</span>}
            >
              Проанализировать
            </Button>
          </div>
        </div>
      </div>

    </CameraScreen>
  );
};

export default PhotoAnalyzePage;
