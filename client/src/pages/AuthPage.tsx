const AuthPage = () => {
  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl flex flex-col items-center text-center gap-6">
        <span className="material-symbols-outlined text-5xl text-primary">qr_code_scanner</span>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl sm:text-[32px] font-bold leading-tight tracking-tight text-[#111813]">
            Авторизуйтесь, чтобы получить Эко-Баллы
          </h1>
          <p className="text-slate-600 text-base max-w-xl">
            Пропуская авторизацию, вы потеряете 100 бонусных баллов за эту сессию.
          </p>
        </div>

        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-card p-6">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBm72lMYVItHchmK4dT5ZwNyoCf5W90vP80ID1B6k35h_In2KBj5g9wsSCSOL1M4Idukep00FhVOlpyoSlhqmfzip8PMfmQQXm9WwMLzSJgcR06JqjHSptvA8ku3QF-DRZU7OeCu6a2ZRcRzfksMmM0EuOwUxDpru9Bcskr4z1xUnN2ThtUkEh-QbTll7RPMeGqKHrNBRjATvio7KYuOTPo-5_jQ9DalLVIwFX5ldKaMCYkppubZSSwi3vznDoHqZoVQc6sXf9amdsq")',
              }}
              role="img"
              aria-label="QR-код для авторизации"
            />
          </div>
        </div>

        <p className="text-primary text-sm">
          Наведите камеру вашего телефона, чтобы войти в профиль.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-md">
          <button className="h-14 rounded-xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-colors">
            Продолжить без авторизации
          </button>
          <button className="h-14 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/10 transition-colors">
            Авторизоваться по номеру телефона
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
