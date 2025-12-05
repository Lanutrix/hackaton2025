const LandingForestPage = () => {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative text-white"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuCEFNncadcOBAzYCvCTJp1G-m89sZilSqWazvONkf5fJe8eiKt1KKbVl3JqYZewkLo-4aC6SyuxrnZyLpW1XZYXNHRUOt-g6GgvHe4Wd0L3yNTBTYKy2ZHQ3wtokEgkGwgz7a7sn5hyR9HHSUkCNe6YpuZV9elW6lsiB_eLRnSm7hek2cb8s-IdcLk513_PLWwn5aOIYTB50-0I1xO0ednHfAbv8eUub76YemlKNurNULID7sXXriP000RZgyQkOJfrKJn1zTJVtTdI")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0" aria-hidden />
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 md:px-10 py-5">
        <div className="flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-3xl">eco</span>
          <span className="text-xl font-bold">EcoSort</span>
        </div>
        <button className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
          <span className="material-symbols-outlined">dark_mode</span>
        </button>
      </div>

      <div className="relative z-10 flex flex-col gap-6 text-center items-center px-4 pb-16">
        <div className="flex flex-col gap-2 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-black leading-tight tracking-tight">
            Чистый Мир
            <br />
            Начинается с Тебя
          </h1>
          <p className="text-base md:text-lg text-white/90">
            Веб-приложение для сортировки мусора в стиле кассы самообслуживания.
          </p>
        </div>
        <button className="h-12 px-6 rounded-xl bg-primary text-background-dark font-bold tracking-wide hover:bg-primary/90 transition-colors min-w-[180px]">
          Начать
        </button>
      </div>
    </div>
  );
};

export default LandingForestPage;
