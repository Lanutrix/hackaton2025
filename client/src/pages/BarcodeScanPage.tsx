const BarcodeScanPage = () => {
  return (
    <div className="min-h-screen bg-background-light text-[#111813] flex flex-col items-center px-4 py-8 font-display">
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-4xl md:text-5xl font-black leading-tight">
          Сканируйте штрих-код упаковки
        </h1>
        <p className="text-[#61896b] text-base">
          Расположите штрих-код в рамке для сканирования
        </p>
      </div>

      <div className="w-full max-w-4xl mt-8 bg-transparent p-4">
        <div className="relative w-full aspect-[4/3] bg-black/80 rounded-xl overflow-hidden shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center blur-sm"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCrwR-Rv_nLqKkDCLrse7vhsk5twOyYloOo4t6Ma_i3mWnd39y-HUIiCvH9NQ0L4iTDS8f9kEUuTcroo70qbE7NuzMyKDuDrHa_erO0wpIpmfGCzZ1Kg4-BI8gfUV3RG87aIDEnekWS0z3HtdZL25ItxTzzfGdoglCpMmHhDlB7U2sIWQMvnVdkkZ04QVs4-Z_xq66gdY6_fjwmEax2re8JI4Ppy6pAKsh7ZRfCK5KrIesZd-3UxdIwl293xzfExdm9m37mPNBZLu3n")',
              filter: "blur(6px) brightness(0.4)",
            }}
            aria-hidden
          />
          <div className="absolute inset-4 rounded-lg scan-frame" />
          <div className="absolute left-4 right-4 h-[3px] bg-primary scan-line" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/80 text-lg bg-black/40 px-4 py-2 rounded-lg">
              Наведите камеру на штрих-код
            </span>
          </div>
        </div>
      </div>

      <p className="text-[#61896b] underline mt-4 cursor-pointer hover:text-primary">
        Не удается отсканировать?
      </p>

      <div className="w-full max-w-sm mt-4">
        <button className="w-full h-12 rounded-lg border border-gray-300 text-[#111813] font-bold flex items-center justify-center gap-2 bg-white hover:bg-gray-100 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          Назад
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanPage;
