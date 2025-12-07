import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDetectBarcode, apiParseBarcode } from "../api";
import Button from "../components/Button";
import CameraScreen from "../components/CameraScreen";

type ParsedData = Record<string, unknown> | string | null;

const BarcodeCapturePage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

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
    const frame = frameRef.current;
    if (!video || !cameraReady) return null;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, vw, vh);

    let sx = 0;
    let sy = 0;
    let cw = vw;
    let ch = vh;

    if (frame) {
      const videoRect = video.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();

      const scaleX = vw / videoRect.width;
      const scaleY = vh / videoRect.height;

      sx = Math.max(0, Math.round((frameRect.left - videoRect.left) * scaleX));
      sy = Math.max(0, Math.round((frameRect.top - videoRect.top) * scaleY));
      cw = Math.min(vw - sx, Math.round(frameRect.width * scaleX));
      ch = Math.min(vh - sy, Math.round(frameRect.height * scaleY));
    }

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cw;
    cropCanvas.height = ch;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return null;

    cropCtx.drawImage(canvas, sx, sy, cw, ch, 0, 0, cw, ch);

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

      let parsedData: ParsedData = null;
      try {
        parsedData = (await apiParseBarcode(barcode)) as ParsedData;
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
      fullScreenCamera
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
              <p className="text-sm">Запускаем камеру...</p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 bg-black/45" />
              <div className="relative h-[200px] mx-4">
                <div className="absolute -left-4 top-0 bottom-0 w-4 bg-black/45" />
                <div className="absolute -right-4 top-0 bottom-0 w-4 bg-black/45" />
                <div
                  ref={frameRef}
                  className="relative h-full border-2 border-green-400/70 overflow-hidden bg-black/10 scan-frame"
                >
                  <div className="absolute left-2 right-2 h-[4px] bg-green-400 scan-line" />
                </div>
              </div>
              <div className="flex-1 bg-black/45" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-6 flex justify-center">
            <Button
              type="button"
              onClick={handleDetect}
              disabled={!canSubmit}
              size="lg"
              loading={loading}
              loadingText="Снимаем..."
              leftIcon={<span className="material-symbols-outlined">photo_camera</span>}
            >
              Сделать фото
            </Button>
          </div>

          {detected && !error && (
            <div className="absolute left-4 right-4 top-4 rounded-lg bg-black/60 text-white text-sm px-3 py-2">
              Найден штрих-код: {detected}
            </div>
          )}
        </div>
      </div>
    </CameraScreen>
  );
};

export default BarcodeCapturePage;
