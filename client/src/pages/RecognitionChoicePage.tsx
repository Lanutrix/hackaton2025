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

  const handleSelect = (id: string) => {
    setSelected((prev) => (prev === id ? null : id));
    if (id === "barcode") navigate("/barcode-scan");
    else if (id === "photo") navigate("/barcode");
    else navigate("/");
  };

  return (
    <div className="relative flex h-screen min-h-screen w-full flex-col bg-background-light overflow-hidden font-display">
      <div className="flex h-full grow flex-col">
        <div className="px-4 sm:px-8 md:px-20 lg:px-40 flex flex-1 justify-center py-5">
          <div className="flex flex-col max-w-[960px] flex-1 w-full">
            <header className="flex items-center justify-between whitespace-nowrap px-4 sm:px-6 md:px-10 py-3">
              <div className="flex items-center gap-4 text-slate-900">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center rounded-full h-14 w-14 bg-white text-slate-900 hover:bg-slate-100 transition-colors duration-200"
                >
                  <span className="material-symbols-outlined text-3xl">arrow_back</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-black/5 text-slate-900 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0"
              >
                <span className="material-symbols-outlined text-xl">home</span>
              </button>
            </header>

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
                        onClick={() => handleSelect(option.id)}
                        data-state={isSelected ? "selected" : undefined}
                        className="group/item relative cursor-pointer flex flex-col items-center justify-center gap-3 p-6 bg-transparent rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 data-[state=selected]:bg-[#ddf9e7]"
                      >
                        <span className="material-symbols-outlined text-4xl text-gray-600 transition-colors duration-200 group-data-[state=selected]/item:text-[#166534]">
                          {option.icon}
                        </span>
                        <p className="text-[#111813] text-lg font-semibold leading-normal transition-all duration-200 group-data-[state=selected]/item:text-[#166534]">
                          {option.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecognitionChoicePage;
