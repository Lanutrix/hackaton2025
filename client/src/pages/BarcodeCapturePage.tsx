import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDetectBarcode, apiParseBarcode } from "../api";
import Button from "../components/Button";
import CameraScreen from "../components/CameraScreen";

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

    const overlayHeightRatio = 0.46;
    const sideMarginRatio = 0.05;
    const cropWidth = Math.round(width * (1 - sideMarginRatio * 2));
    const cropHeight = Math.round(height * overlayHeightRatio);
    const sx = Math.max(0, Math.round((width - cropWidth) / 2));
    const sy = Math.max(0, Math.round((height - cropHeight) / 2));

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return null;

    cropCtx.drawImage(canvas, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return new Promise((resolve) => {
      cropCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
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

      let parsedData: unknown | null = null;
      try {
        parsedData = await apiParseBarcode(barcode);
      } catch (parseErr) {
        parsedData = null;
        console.error(parseErr);
      }

      navigate(`/barcode-scan?barcode=${encodeURIComponent(barcode)}`, {
        state: parsedData ? { barcode, result: parsedData } : { barcode },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить снимок.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CameraScreen
      title="Сканирование штрих-кода с камеры"
      onBack={() => navigate(-1)}
      rightButtonLabel="Главная"
      onRightClick={() => navigate("/landing-forest")}
      footer={
        <>
          <Button
            type="button"
            onClick={handleDetect}
            disabled={!canSubmit}
            size="lg"
            loading={loading}
            loadingText="Отправляем снимок..."
          >
            Сделать фото и отправить
          </Button>
        </>
      }
    >
      <div
        className={`relative rounded-xl overflow-hidden bg-slate-900/80 aspect-[4/3] flex items-center justify-center border-4 transition-all
    ${loading ? "camera-loading border-emerald-400" : "border-emerald-400"}`}
      >
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
    </CameraScreen>
  );
};

export default BarcodeCapturePage;
