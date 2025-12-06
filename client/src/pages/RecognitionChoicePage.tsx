import { useState } from "react";
import { useNavigate } from "react-router-dom";

const options = [
  { id: "voice", label: "Голосовой ввод", icon: "keyboard_voice" },
  { id: "barcode", label: "Сканер штрихкода", icon: "barcode_scanner" },
  { id: "photo", label: "Анализ фотографии", icon: "photo_camera" },
];

const RecognitionChoicePage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const handleNext = () => {
    if (!selected) return;
    if (selected === "barcode") navigate("/barcode-scan");
    else if (selected === "photo") navigate("/barcode");
    else navigate("/"); // TODO
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light text-[#111813] overflow-hidden font-display">
      <div className="flex h-full grow flex-col">
        <main className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col w-full max-w-2xl">
            <div className="flex flex-wrap justify-center gap-3 p-4">
              <h1 className="text-[#111813] text-4xl sm:text-5xl font-black leading-tight tracking-[-0.033em] text-center">
                Выберите способ распознавания
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4">
              {options.map((option) => {
                const isSelected = selected === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelected(option.id)}
                    data-state={isSelected ? "selected" : undefined}
                    className="group/item relative cursor-pointer flex flex-col items-center justify-center gap-3 p-6 bg-transparent rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 data-[state=selected]:border-transparent data-[state=selected]:bg-gradient-to-br data-[state=selected]:from-green-100/70 data-[state=selected]:to-green-200/50"
                  >
                    <span className="material-symbols-outlined text-4xl text-gray-600 group-data-[state=selected]/item:text-green-800 transition-colors">
                      {option.icon}
                    </span>
                    <p className="text-[#111813] text-lg font-semibold leading-normal group-data-[state=selected]/item:font-bold group-data-[state=selected]/item:text-green-900 transition-all">
                      {option.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
        <footer className="w-full bg-background-light border-t border-gray-200 p-4">
          <div className="flex justify-center w-full">
            <div className="flex flex-col sm:flex-row flex-1 gap-3 px-4 py-3 justify-center max-w-sm">
              <button
                type="button"
                onClick={handleNext}
                disabled={!selected}
                className="flex w-full sm:w-auto flex-1 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 bg-primary text-[#111813] text-lg font-bold leading-normal tracking-[0.015em] hover:bg-opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="truncate">Далее</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex w-full sm:w-auto flex-1 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 bg-[#f0f4f1] text-[#111813] text-lg font-bold leading-normal tracking-[0.015em] hover:bg-opacity-80 transition-opacity"
              >
                <span className="truncate">Назад</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default RecognitionChoicePage;
