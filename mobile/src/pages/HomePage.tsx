import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../api";

type NavItem = {
  id: string;
  label: string;
  icon: string;
  href: string;
};

const navItems: NavItem[] = [
  { id: "home", label: "Главная", icon: "home", href: "#" },
  { id: "scan", label: "Сканировать", icon: "qr_code_scanner", href: "#" },
  { id: "awards", label: "Награды", icon: "emoji_events", href: "#" },
  { id: "profile", label: "Профиль", icon: "person", href: "#" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<string>("home");
  const [historyData, setHistoryData] = useState<unknown>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const { savesCount, points } = useMemo(() => {
    if (historyData && typeof historyData === "object") {
      const obj = historyData as Record<string, unknown>;
      const saves = typeof obj.saves_count === "number" ? obj.saves_count : 0;
      const total = typeof obj.total === "number" ? obj.total : 0;
      if (saves || total) {
        return { savesCount: saves, points: total };
      }
    }
    if (Array.isArray(historyData)) {
      return { savesCount: historyData.length, points: historyData.length * 100 };
    }
    return { savesCount: 0, points: 0 };
  }, [historyData]);

  const totalPoints = points;
  const totalKg = (totalPoints / 13).toFixed(2);
  const levelTarget = 600;
  const levelPercent = Math.min(100, Math.round((totalPoints / levelTarget) * 100));

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item.id);
    if (item.id === "scan") {
      navigate("/scan");
      return;
    }
    if (item.id === "profile") {
      navigate("/login"); // placeholder action
    }
  };

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const data = await getHistory();
        setHistoryData(data);
      } catch (err) {
        setHistoryError(err instanceof Error ? err.message : "Не удалось загрузить историю");
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, []);

  return (
    <div className="font-display bg-[#f8faf8] text-[#111813] min-h-screen max-w-md mx-auto relative">
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5ece7] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#13ec49]/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#13ec49] text-2xl">recycling</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">ЭкоСортировка</h1>
              <p className="text-[#5a7a63] text-xs">Добро пожаловать!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-white border border-[#e5ece7] flex items-center justify-center">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-white border border-[#e5ece7] flex items-center justify-center">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-24 pt-4 space-y-6">
        <section className="bg-gradient-to-r from-[#13ec49]/10 to-[#10b83a]/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold">Добрый день, Иван!</h2>
              <p className="text-[#5a7a63] text-sm mt-1">Ваш экологический вклад имеет значение</p>
            </div>
            <div className="w-12 h-12 bg-[#13ec49]/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#13ec49] text-2xl">person</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 mt-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#13ec49]/20 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#13ec49] text-2xl">qr_code_scanner</span>
              </div>
              <div>
                <p className="font-semibold">Сканировать QR</p>
                <p className="text-[#5a7a63] text-sm">Для сдачи отходов</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/scan")}
              className="w-10 h-10 rounded-full bg-[#13ec49] flex items-center justify-center shadow-button"
            >
              <span className="material-symbols-outlined text-white">arrow_forward</span>
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[#13ec49]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
              >
                eco
              </span>
              <span className="font-bold">Уровень 1</span>
            </div>
            <span className="text-[#5a7a63] text-sm">
              {totalPoints}/{levelTarget} баллов
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Эко-Энтузиаст</span>
              <span className="font-semibold">{levelPercent}%</span>
            </div>
            <div className="w-full h-3 bg-[#e5ece7] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#13ec49] to-[#10b83a] rounded-full"
                style={{ width: `${levelPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="text-center p-2">
              <div className="text-2xl font-bold text-[#13ec49]">{savesCount}</div>
              <div className="text-xs text-[#5a7a63]">Сдач</div>
            </div>
            <div className="text-center p-2">
              <div className="text-2xl font-bold text-[#13ec49]">{totalKg} кг</div>
              <div className="text-xs text-[#5a7a63]">Отходов</div>
            </div>
            <div className="text-center p-2">
              <div className="text-2xl font-bold text-[#13ec49]">{totalPoints}</div>
              <div className="text-xs text-[#5a7a63]">Баллов</div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Мои награды</h3>
            <a href="#" className="text-[#13ec49] text-sm font-semibold flex items-center gap-1">
              Все <span className="material-symbols-outlined text-sm">chevron_right</span>
            </a>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <button className="flex items-center gap-1 px-4 py-2 bg-[#13ec49] text-white rounded-full text-sm font-medium whitespace-nowrap">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Все
            </button>
            <button className="flex items-center gap-1 px-4 py-2 bg-[#e5ece7] rounded-full text-sm font-medium whitespace-nowrap">
              <span className="material-symbols-outlined text-sm">verified</span>
              Полученные
            </button>
            <button className="flex items-center gap-1 px-4 py-2 bg-[#e5ece7] rounded-full text-sm font-medium whitespace-nowrap">
              <span className="material-symbols-outlined text-sm">lock</span>
              Заблокированы
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 mb-3">
                  <img
                    className="w-full h-full object-contain"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0Qt0poXDmpwdkcxq9HRHuNgpvDntpsCYz-YnjHD2z7tbqqGSjPm_f9l34oMJ4Twh3GqaKIQ_8J4QF9KtDzenO30pI7CzADpndvTO5tWNLejg5spR__Ey9qxP73mmQVW6VDvUUyS0ElabLjWly_klAyUJMFUYuuzcRd08jQRYAhd9f0HfzNb7qAjMFe9FNYw5vCrYnJkjsOz0pVrFaI68aAHJzqrE4qXsfkifQC8T7tTlSLYbn22sKvXq05QxarbMplIRymbPfVqzx"
                    alt="Первый шаг"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#13ec49] rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-sm">check</span>
                  </div>
                </div>
                <p className="font-semibold text-sm text-center mb-1">Первый шаг</p>
                <p className="text-[#5a7a63] text-xs text-center mb-2">Первая сдача отходов</p>
                <span className="text-[#13ec49] text-xs font-semibold">Получено</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 mb-3">
                  <img
                    className="w-full h-full object-contain"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvmubICnv12nn4iIq4o7U8c6epNZMVyX-1li9VHsV4KE9LMyfNXZS6jCfvadaoSvN1WUS_1VqddaVznNrv-MVGqTXij-0RM0a4elpva7a8mc0NnlQYhUhOYXxDLLHwQ-uGS4goT4EX2v81tETdzw4p6LJ2xoNRWODksNgeR0ddVUPXjftrtn66kh0aQ5CB5FIiG7mc7xpax4-hByb5AN1essZV5aURqKoe4abx1j7UzgDoTuTs1LridNHAGVa-8l7rcDj3yd0nde-9"
                    alt="Эко-герой"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#13ec49] rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-sm">check</span>
                  </div>
                </div>
                <p className="font-semibold text-sm text-center mb-1">Эко-герой</p>
                <p className="text-[#5a7a63] text-xs text-center mb-2">3 типа за неделю</p>
                <span className="text-[#13ec49] text-xs font-semibold">Получено</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm relative">
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 mb-3">
                  <img
                    className="w-full h-full object-contain grayscale opacity-50"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAc4GhNPpCAYgaDe1cxQVwiYbBfF69C0z4kP4nz_i5QvIvB2mWq2EYR3lb9o5zaG56ZKPhjIzMEtYta1lZoTGVY2CUScyGisDja-Ihoot9TgRyhdnRpC8OGCEg8EF8oT1JZ2v9phLJVIkynAU84KlWsTb95_7CUS1slF72VNxUA2sHPxwbWXAg69G0eJkYnUbgRc5gGMf5NLU6XOlXNumg03nn2YyOvJ6Rz2Yzm0HXYANhCauGUKOMMnceD5-Peoj_39K2ePg6cc-cp"
                    alt="Пластик"
                  />
                  <div className="absolute bottom-0 right-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-lg">
                    70%
                  </div>
                </div>
                <p className="font-semibold text-sm text-center mb-1">Пластик</p>
                <p className="text-[#5a7a63] text-xs text-center mb-2">10 кг пластика</p>
                <span className="text-orange-500 text-xs font-semibold">В процессе</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm relative opacity-70">
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 mb-3">
                  <img
                    className="w-full h-full object-contain grayscale opacity-50"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIQ6nxYmbEusVWmhHIrDF1N2MnEhAqDldnVFxYM9bjIcUnVGeoiNgSzQ5pgGFNGUGMfwCpk4dCyyxLRho6cyeGmroCMnEELmAGGjiwu5J2Hw3F_iG5kLKfiPkLeqwt6dXxSJMAZrtp1Mh46ENnfshytJQBgRwRtQfInlX0pLGSphBsoXvYw4wBlRwGMZUPqINrmsvnLlmCAsmvbx1OZJveqZqMdbNrKOER1wg_9Zmodwzf2G0W4Fq79Kj2Vbf8q19hrEW_qAoeI330"
                    alt="Бумага"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-sm">lock</span>
                  </div>
                </div>
                <p className="font-semibold text-sm text-center mb-1">Бумага</p>
                <p className="text-[#5a7a63] text-xs text-center mb-2">20 кг макулатуры</p>
                <span className="text-[#5a7a63] text-xs font-semibold">Заблокировано</span>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-white rounded-2xl p-5 shadow-card">
          <h3 className="text-xl font-bold mb-4">Быстрые действия</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="#" className="bg-gradient-to-r from-[#13ec49]/10 to-[#10b83a]/10 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#13ec49] text-3xl mb-2">history</span>
              <span className="font-semibold text-sm">История</span>
            </a>
            <a href="#" className="bg-gradient-to-r from-[#13ec49]/10 to-[#10b83a]/10 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#13ec49] text-3xl mb-2">map</span>
              <span className="font-semibold text-sm">Пункты приёма</span>
            </a>
            <a href="#" className="bg-gradient-to-r from-[#13ec49]/10 to-[#10b83a]/10 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#13ec49] text-3xl mb-2">school</span>
              <span className="font-semibold text-sm">Обучение</span>
            </a>
            <a href="#" className="bg-gradient-to-r from-[#13ec49]/10 to-[#10b83a]/10 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#13ec49] text-3xl mb-2">leaderboard</span>
              <span className="font-semibold text-sm">Рейтинг</span>
            </a>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-[#e5ece7] px-4 py-3 z-50">
        <div className="flex justify-between items-center">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center transition-colors ${
                  isActive ? "text-[#13ec49]" : "text-[#5a7a63]"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default HomePage;
