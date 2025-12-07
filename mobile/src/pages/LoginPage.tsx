import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginApi } from "../api";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const username = phone.trim();
    if (!username) {
      setError("Введите номер телефона");
      return;
    }

    setLoading(true);
    try {
      const token = await loginApi({ username, password });
      await login(token);
      const redirectTo =
        (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f6f8f6] text-[#111813] min-h-screen flex flex-col font-display">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#dbe6de] bg-white/90 backdrop-blur-md px-6 py-4 md:px-10 lg:px-40">
        <div className="flex items-center gap-4">
          <div className="size-8 text-primary">
            <span className="material-symbols-outlined text-3xl" aria-hidden="true">
              recycling
            </span>
          </div>
          <h2 className="text-xl font-bold leading-tight tracking-tight">ЭкоСортировка</h2>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-white border border-[#dbe6de] hover:bg-gray-100 transition-colors text-sm font-bold leading-normal"
          >
            <span className="truncate">Помощь</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="hidden md:flex items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-primary text-black text-sm font-bold leading-normal hover:bg-opacity-90 transition-opacity"
          >
            <span className="truncate">Регистрация</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 w-full">
        <div className="w-full max-w-[520px] flex flex-col gap-8">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h1 className="text-[#111813] text-4xl md:text-5xl font-black leading-tight tracking-tight">
              Вход в систему
            </h1>
            <p className="text-[#61896b] text-lg font-normal leading-normal">
              Введите свои данные для авторизации
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-[#dbe6de]"
          >
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <label className="flex flex-col gap-2 group">
              <span className="text-base font-medium leading-normal">Номер телефона</span>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-[#61896b] z-10" aria-hidden="true">
                  call
                </span>
                <input
                  className="form-input flex w-full min-w-0 resize-none overflow-hidden rounded-xl text-[#111813] bg-[#f6f8f6] border border-[#dbe6de] focus:border-primary focus:ring-1 focus:ring-primary h-14 md:h-16 pl-12 pr-4 text-lg font-normal placeholder:text-[#61896b]/60 transition-all outline-none"
                  placeholder="+7 (999) 000-00-00"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 group">
              <span className="text-base font-medium leading-normal">Пароль</span>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-[#61896b] z-10" aria-hidden="true">
                  lock
                </span>
                <input
                  className="form-input flex w-full min-w-0 resize-none overflow-hidden rounded-xl text-[#111813] bg-[#f6f8f6] border border-[#dbe6de] focus:border-primary focus:ring-1 focus:ring-primary h-14 md:h-16 pl-12 pr-14 text-lg font-normal placeholder:text-[#61896b]/60 transition-all outline-none"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center text-[#61896b] hover:text-primary transition-colors focus:outline-none"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </label>

            <div className="flex flex-col gap-4 mt-4">
              <button
                className="w-full flex items-center justify-center rounded-xl h-16 bg-primary hover:bg-[#0fd642] active:scale-[0.99] transition-all text-[#102215] text-xl font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? "Входим..." : "Войти"}
              </button>
              <a
                className="text-center text-[#61896b] hover:text-primary transition-colors text-base font-medium py-2"
                href="#"
              >
                Забыли пароль?
              </a>
            </div>
          </form>

          <div className="md:hidden text-center">
            <span className="text-[#61896b]">Нет аккаунта? </span>
            <Link className="text-primary font-bold hover:underline" to="/register">
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40" aria-hidden />
    </div>
  );
};

export default LoginPage;
