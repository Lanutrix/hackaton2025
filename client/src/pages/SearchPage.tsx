const SearchPage = () => {
  return (
    <div className="min-h-screen bg-background-light text-[#111813] flex justify-center px-4 py-6 font-public">
      <div className="w-full max-w-5xl flex flex-col gap-4">
        <header className="flex items-center justify-between px-4 sm:px-6 md:px-8">
          <button className="flex items-center justify-center rounded-full h-14 w-14 bg-white text-slate-900 hover:bg-slate-100 shadow-sm transition-colors">
            <span className="material-symbols-outlined text-3xl">arrow_back</span>
          </button>
          <button className="flex items-center justify-center rounded-full h-10 w-10 bg-black/5 text-slate-900 hover:bg-black/10 transition-colors">
            <span className="material-symbols-outlined text-xl">home</span>
          </button>
        </header>

        <main className="flex-1 px-4 sm:px-6 md:px-8 pb-10">
          <div className="text-center flex flex-col gap-2 py-4">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Что вы хотите выбросить?
            </h1>
            <p className="text-slate-600 text-base">
              Начните вводить название мусора для сортировки
            </p>
          </div>

          <div className="sticky top-4 z-10 bg-background-light/90 backdrop-blur rounded-xl px-1 py-2">
            <label className="flex items-center h-14 w-full rounded-xl shadow-lg shadow-primary/10 bg-white overflow-hidden ring-1 ring-slate-200">
              <span className="material-symbols-outlined text-2xl text-slate-500 px-4">search</span>
              <input
                className="flex-1 h-full border-none outline-none text-base text-slate-900 placeholder:text-slate-500"
                placeholder="бутылка"
                defaultValue="бутылка"
              />
              <button className="px-4 text-slate-500 hover:text-slate-700 transition-colors">
                <span className="material-symbols-outlined text-2xl">cancel</span>
              </button>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {[
              { title: "Пластиковая бутылка", subtitle: "Пластик / PET 1" },
              { title: "Стеклянная бутылка", subtitle: "Стекло / GL 70" },
              { title: "Газета", subtitle: "Макулатура / PAP 22" },
              { title: "Батарейка AA", subtitle: "Опасные отходы" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-4 min-h-[72px] hover:bg-primary/5 transition-colors"
              >
                <div className="flex flex-col">
                  <p className="text-base font-medium text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.subtitle}</p>
                </div>
                <span className="material-symbols-outlined text-2xl text-slate-500">arrow_forward</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SearchPage;
