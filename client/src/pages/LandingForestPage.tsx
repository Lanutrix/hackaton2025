import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

const LandingForestPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative text-white"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45)), url("bg.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0" aria-hidden />
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 md:px-10 py-5 page-enter">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="EcoSort"
            className="h-14 w-auto object-contain"
          />
        </div>

      </div>

      <div className="relative z-10 flex flex-col gap-6 text-center items-center px-4 pb-16 page-enter">
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
        <Button
          className="min-w-[180px] bg-primary text-background-dark tracking-wide hover:bg-primary/90"
          onClick={() => navigate("/sorting-quiz")}
          size="lg"
        >
          Начать
        </Button>
      </div>
    </div>
  );
};

export default LandingForestPage;
