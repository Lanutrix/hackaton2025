const items = [
  {
    label: "Бутылка",
    category: "Стекло",
    categoryColor: "text-blue-600",
    icon: "liquor",
    bg: "bg-[#f0f4f1]",
  },
  {
    label: "Крышка",
    category: "Металл",
    categoryColor: "text-yellow-600",
    icon: "circle",
    bg: "bg-[#f0f4f1]",
  },
  {
    label: "Этикетка",
    category: "Пластик",
    categoryColor: "text-orange-600",
    icon: "label",
    bg: "bg-[#f0f4f1]",
  },
];

const steps = [
  "Снимите крышку. Её нужно выбросить в контейнер для металла.",
  "Промойте бутылку от остатков содержимого. Это важно для качественной переработки.",
  "Отделите этикетку, если это возможно. Её следует выбросить в контейнер для пластика.",
];

const GlassBottlePage = () => {
  return (
    <div className="min-h-screen bg-background-light text-[#111813] flex justify-center px-4 py-8">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span className="material-symbols-outlined">arrow_back</span>
          Назад
        </div>

        <div className="flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl font-black leading-tight">
            Стеклянная бутылка с металлической крышкой
          </h1>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold">Куда выбрасывать</h2>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`material-symbols-outlined ${item.bg} rounded-lg size-10 flex items-center justify-center text-[#111813]`}
                  >
                    {item.icon}
                  </span>
                  <p className="text-base">{item.label}</p>
                </div>
                <div className={`flex items-center gap-2 font-bold ${item.categoryColor}`}>
                  <span className="material-symbols-outlined">recycling</span>
                  {item.category}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold">Что нужно сделать</h2>
          <div className="flex flex-col gap-4">
            {steps.map((step, idx) => (
              <div key={step} className="flex items-start gap-4">
                <div className="size-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <p className="text-lg leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default GlassBottlePage;
