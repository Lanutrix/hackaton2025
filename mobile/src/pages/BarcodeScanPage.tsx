import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { saveHistory } from "../api";

type BarcodeDetectorResult = { rawValue?: string; format?: string };
type BarcodeDetectorOptions = { formats?: string[] };
// Minimal typing for browsers with BarcodeDetector support
type BarcodeDetectorClass = {
  new (options?: BarcodeDetectorOptions): { detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]> };
  getSupportedFormats?: () => Promise<string[]>;
};

const BarcodeScanPage = () => {
  const navigate = useNavigate();
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastScanAt, setLastScanAt] = useState("2 мин назад");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [scanText, setScanText] = useState("Контейнер для пластика №045");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorClass | null>(
    typeof window !== "undefined" && "BarcodeDetector" in window ? (window as unknown as { BarcodeDetector: BarcodeDetectorClass }).BarcodeDetector : null,
  );
  const rafRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loggedNoDetectorRef = useRef(false);

  const decodeBase64Utf8 = (base64: string) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return null;
    }
  };

  const decodeQrValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { display: "QR без данных" as const };

    // support data:...;base64,<payload>
    const base64Payload = trimmed.startsWith("data:") && trimmed.includes(";base64,")
      ? trimmed.slice(trimmed.indexOf(";base64,") + ";base64,".length)
      : trimmed;

    try {
      const decodedUtf8 = decodeBase64Utf8(base64Payload);
      if (decodedUtf8) {
        try {
          const parsed = JSON.parse(decodedUtf8);
          if (Array.isArray(parsed)) {
            console.log("[scan] QR decoded array:", parsed);
            return { display: parsed.join(", "), array: parsed };
          }
        } catch {
          // not JSON array, continue
        }
        console.log("[scan] QR base64 decoded:", decodedUtf8);
        return { display: decodedUtf8 };
      }
    } catch {
      // not base64, fallback to raw
    }
    return { display: trimmed };
  };

  const sendHistory = useCallback(async (payload: string[]) => {
    try {
      await saveHistory(payload);
      console.log("[scan] history saved");
    } catch (err) {
      console.warn("[scan] save history failed", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (fallbackTimeoutRef.current) {
      window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Камера недоступна в браузере");
      return;
    }

    setCameraError(null);
    setTorchAvailable(false);
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      const [track] = stream.getVideoTracks();
      const caps = track?.getCapabilities?.();
      setTorchAvailable(Boolean(caps && "torch" in caps && (caps as MediaTrackCapabilities).torch));

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Не удалось запустить камеру");
      stopCamera();
    }
  }, [stopCamera]);

  const handleFlashToggle = useCallback(async () => {
    const next = !isFlashOn;
    setIsFlashOn(next);

    const track = streamRef.current?.getVideoTracks()[0];
    const caps = track?.getCapabilities?.();
    const supportsTorch = Boolean(caps && "torch" in caps && (caps as MediaTrackCapabilities).torch);

    if (track && supportsTorch) {
      try {
        await track.applyConstraints({ advanced: [{ torch: next }] });
      } catch {
        setIsFlashOn(false);
      }
    }
  }, [isFlashOn]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const startScan = () => {
    if (isScanning) return;
    setShowResult(false);
    setIsScanning(true);
    setScanText("Поиск QR-кода...");
    if (!streamRef.current) {
      void startCamera();
    }
  };

  useEffect(() => {
    if (!isScanning) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (fallbackTimeoutRef.current) {
        window.clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const DetectorCtor = detectorRef.current;
    const detector = DetectorCtor ? new DetectorCtor({ formats: ["qr_code"] }) : null;

    const detectFrame = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      try {
        if (detector) {
          const barcodes = await detector.detect(video);
          const found = barcodes?.find((b) => (b.rawValue ?? "").trim().length > 0) || barcodes?.[0];
          if (found) {
            const raw = (found.rawValue ?? "").trim() || "QR без данных";
            const decoded = decodeQrValue(raw);
            if (decoded.array) {
              console.log("[scan] QR decoded array:", decoded.array);
            } else {
              console.log("[scan] QR text:", decoded.display);
            }
            if (decoded.array && decoded.array.length) {
              void sendHistory(decoded.array);
            } else if (decoded.display) {
              void sendHistory([decoded.display]);
            }
            setScanText(decoded.display);
            setIsScanning(false);
            setShowResult(true);
            setLastScanAt("только что");
            if (fallbackTimeoutRef.current) {
              window.clearTimeout(fallbackTimeoutRef.current);
              fallbackTimeoutRef.current = null;
            }
            return;
          }
        } else {
          if (!loggedNoDetectorRef.current) {
            console.warn("[scan] BarcodeDetector не поддерживается, используем jsQR");
            loggedNoDetectorRef.current = true;
          }
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imageData.data, imageData.width, imageData.height);
              if (qr?.data) {
                const raw = qr.data.trim() || "QR без данных";
                const decoded = decodeQrValue(raw);
                if (decoded.array) {
                  console.log("[scan] QR decoded array:", decoded.array);
                } else {
                  console.log("[scan] QR text (jsQR):", decoded.display);
                }
                if (decoded.array && decoded.array.length) {
                  void sendHistory(decoded.array);
                } else if (decoded.display) {
                  void sendHistory([decoded.display]);
                }
                setScanText(decoded.display);
                setIsScanning(false);
                setShowResult(true);
                setLastScanAt("только что");
                if (fallbackTimeoutRef.current) {
                  window.clearTimeout(fallbackTimeoutRef.current);
                  fallbackTimeoutRef.current = null;
                }
                return;
              }
            }
          }
        }
      } catch (err) {
        console.warn("[scan] detect error", err);
      }

      rafRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();

    fallbackTimeoutRef.current = window.setTimeout(() => {
      if (cancelled) return;
      setScanText("Не удалось распознать QR");
      setIsScanning(false);
      setShowResult(true);
      setLastScanAt("только что");
    }, 4000);

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (fallbackTimeoutRef.current) {
        window.clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [isScanning]);

  const closeResult = () => setShowResult(false);

  return (
    <div className="font-display bg-[#050505] text-white min-h-screen max-w-md mx-auto relative overflow-hidden">
      <header className="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#121212]/80 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/5 flex items-center justify-center active:scale-95 transition"
            aria-label="Назад"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>

          <div className="flex flex-col items-center">
            <h1 className="font-bold text-lg leading-tight">Сканирование QR</h1>
            <p className="text-white/60 text-xs">ЭкоСортировка</p>
          </div>

          <button
            type="button"
            onClick={handleFlashToggle}
            disabled={!torchAvailable && !streamRef.current}
            className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center active:scale-95 transition ${
              isFlashOn ? "bg-[#1f291f]" : "bg-[#1a1a1a]"
            } ${!torchAvailable ? "opacity-70" : ""}`}
            aria-label="Включить фонарик"
          >
            <span className="material-symbols-outlined text-2xl" style={{ color: isFlashOn ? "#ffd700" : undefined }}>
              {isFlashOn ? "flashlight_on" : "flashlight_off"}
            </span>
          </button>
        </div>
      </header>

      <main className="pt-16 pb-32 h-screen relative">
        <div className="absolute inset-0 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover opacity-80 transition duration-300 ${
              isFlashOn ? "brightness-125" : "brightness-100"
            } ${cameraError ? "hidden" : ""}`}
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden />
          {cameraError && (
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-[#0a0a0a] flex items-center justify-center px-6 text-center">
              <div className="space-y-3">
                <p className="text-sm text-white/80">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-[#13ec49] text-black font-semibold active:scale-95 transition"
                >
                  Повторить
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <div className="relative w-72 h-72 mb-8">
            <div className="absolute inset-0">
              <div className="absolute w-8 h-8 border-4 border-[#13ec49] rounded-lg border-r-0 border-b-0" />
              <div className="absolute w-8 h-8 border-4 border-[#13ec49] rounded-lg border-l-0 border-b-0 top-0 right-0" />
              <div className="absolute w-8 h-8 border-4 border-[#13ec49] rounded-lg border-r-0 border-t-0 bottom-0 left-0" />
              <div className="absolute w-8 h-8 border-4 border-[#13ec49] rounded-lg border-l-0 border-t-0 bottom-0 right-0" />
            </div>

            <div className="absolute inset-4 overflow-hidden rounded-xl">
              <div
                className={`w-full h-[2px] bg-[#13ec49]/80 shadow-[0_0_15px_rgba(19,236,73,0.9)] ${
                  isScanning ? "animate-scan-line" : "opacity-0"
                } transition-opacity`}
              />
            </div>

            <div className="absolute inset-0 border-2 border-white/15 rounded-2xl" />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-3 h-3 bg-[#13ec49] rounded-full animate-pulse-dot" />
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#101010]/95 backdrop-blur-xl px-4 py-4 border-t border-white/10">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={startScan}
            className="w-20 h-20 rounded-full border-4 border-white/15 bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 active:scale-95 transition-transform"
            aria-label="Начать сканирование"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-[#13ec49] to-[#10b83a] rounded-full flex items-center justify-center shadow-lg shadow-[#13ec49]/30">
              <span className="material-symbols-outlined text-white text-3xl">qr_code_scanner</span>
            </div>
          </button>

          <div className="flex items-center gap-6 mb-4 text-white/70">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#13ec49] rounded-full" />
              <span className="text-xs">Камера активна</span>
            </div>
          </div>

          <div className="w-full bg-[#161616] rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#13ec49]">info</span>
                <span className="font-medium text-sm">Последнее сканирование</span>
              </div>
              <span className="text-white/50 text-xs">{lastScanAt}</span>
            </div>
            <p className="text-white/60 text-xs">{scanText}</p>
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-[#121212]/95 rounded-2xl p-6 shadow-2xl border border-[#13ec49]/20 pointer-events-auto">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-r from-[#13ec49]/20 to-[#10b83a]/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#13ec49] text-3xl">search</span>
              </div>
              <h3 className="font-bold text-lg">Сканирование...</h3>
              <p className="text-white/60 text-sm text-center">Распознаем QR-код</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanPage;
