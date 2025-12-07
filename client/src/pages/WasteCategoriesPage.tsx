import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

type Category = {
  id: string;
  label: string;
  icon: string;
};

const categories: Category[] = [
  { id: "food", label: "Пищевые отходы", icon: "restaurant" },
  { id: "glass", label: "Стекло", icon: "wine_bar" },
  { id: "metal", label: "Металл", icon: "propane_tank" },
  { id: "paper", label: "Бумага", icon: "description" },
  { id: "plastic", label: "Пластик", icon: "water_bottle" },
  { id: "mixed", label: "Смешанное", icon: "recycling" }
];

const WasteCategoriesPage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const hasSelection = selected.size > 0;

  const handleSubmit = () => {
    if (!hasSelection) return;
    
    // Создаём объект waste из выбранных категорий
    const selectedCategories = categories.filter(c => selected.has(c.id));
    const waste: Record<string, string> = {};
    selectedCategories.forEach(c => {
      waste[c.id] = c.label;
    });

    navigate("/qr-result", {
      state: {
        waste,
        productName: "Выбранные категории отходов"
      }
    });
  };

  return (
    <div className="relative flex h-screen min-h-screen w-full flex-col bg-white text-black overflow-hidden font-display page-enter">
      <div className="flex h-full grow flex-col">
        <main className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col w-full max-w-2xl">
            <div className="flex flex-wrap justify-center gap-3 p-4">
              <h1 className="text-[#111813] text-4xl sm:text-5xl font-black leading-tight tracking-[-0.033em] text-center">
                Выберите категории мусора
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4">
              {categories.map((category) => {
                const isSelected = selected.has(category.id);
                return (
                  <Button
                    type="button"
                    key={category.id}
                    onClick={() => toggleSelection(category.id)}
                    size="lg"
                    variant="outline"
                    className={`h-auto min-h-0 group/item relative cursor-pointer flex flex-col items-center justify-center gap-3 p-6 border hover:border-gray-300 transition-all duration-200 fade-bg
                      ${isSelected ? "!bg-[#E0FAE9] !border-green-300 selected-pop" : "bg-transparent border-gray-200"}`}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <span
                      className="material-symbols-outlined text-4xl text-gray-600 group-data-[state=selected]/item:text-green-800 transition-colors"
                      aria-hidden="true"
                    >
                      {category.icon}
                    </span>
                    <p className="text-[#111813] text-base font-semibold leading-normal group-data-[state=selected]/item:font-bold group-data-[state=selected]/item:text-green-900 transition-all">
                      {category.label}
                    </p>
                  </Button>
                );
              })}
            </div>
          </div>
        </main>
        <footer className="w-full bg-white border-t border-gray-200 p-4">
          <div className="flex justify-center w-full">
            <div className="flex flex-col sm:flex-row flex-1 gap-3 px-4 py-3 justify-center max-w-sm">
              <Button
                className="w-full sm:w-auto flex-1 min-w-[84px] h-14 px-5 bg-primary text-[#111813] text-lg tracking-[0.015em] hover:bg-opacity-90"
                type="button"
                onClick={handleSubmit}
                disabled={!hasSelection}
                size="xl"
              >
                <span className="truncate">Добавить</span>
              </Button>
              <Button
                className="w-full sm:w-auto flex-1 min-w-[84px] h-14 px-5 bg-[#f0f4f1] text-[#111813] text-lg tracking-[0.015em] hover:bg-opacity-80"
                type="button"
                onClick={() => navigate("/landing-forest")}
                size="xl"
                variant="secondary"
              >
                <span className="truncate">Отмена</span>
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default WasteCategoriesPage;
