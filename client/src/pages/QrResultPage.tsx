import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import WasteQrCode from "../components/WasteQrCode";

type NavState = {
  waste?: Record<string, unknown> | null;
  productName?: string | null;
};

const QrResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as NavState | null) ?? null;

  const waste = navState?.waste ?? null;
  const productName = navState?.productName ?? "Результат анализа";

  // Извлекаем категории для отображения
  const categories = waste
    ? Object.values(waste).filter((v): v is string => typeof v === "string")
    : [];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10 page-enter">
      <div className="w-full max-w-3xl flex flex-col items-center text-center gap-6">
        <span className="material-symbols-outlined text-5xl text-primary">
          check_circle
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl sm:text-[32px] font-bold leading-tight tracking-tight text-[#111813]">
            {productName}
          </h1>
          <p className="text-slate-600 text-base max-w-xl">
            Отсканируйте QR-код для сохранения в историю 
          </p>
        </div>

        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-card p-6">
          <div className="w-full flex items-center justify-center py-4">
            {waste ? (
              <WasteQrCode waste={waste} size={240} />
            ) : (
              <div className="text-slate-400 py-12">
                <span className="material-symbols-outlined text-6xl">
                  qr_code_2
                </span>
                <p className="mt-2">Нет данных для QR-кода</p>
              </div>
            )}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {categories.map((category, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-primary/5 text-primary border border-primary/20 rounded-full text-sm font-medium"
              >
                {category}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-md">
          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={() => navigate("/landing-forest")}
            className="bg-primary text-white hover:bg-primary/90"
          >
            На главную
          </Button>
          <Button
            variant="outline"
            size="xl"
            fullWidth
            onClick={() => navigate("/recognition-choice")}
            className="border-2 border-primary text-primary hover:bg-primary/10"
          >
            Распознать ещё
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QrResultPage;

