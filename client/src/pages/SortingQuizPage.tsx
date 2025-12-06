import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

const SortingQuizPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden font-display text-black bg-white page-enter">
      <div className="flex h-full grow flex-col">
        <div className="px-4 flex flex-1 justify-center items-center py-5">
          <div className="flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-col justify-center items-center gap-12 p-4 text-center">
              <p className="text-[#111813] text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-[-0.033em] max-w-2xl">
                Вы знаете, как сортировать свой мусор?
              </p>
              <div className="flex justify-center w-full">
                <div className="flex flex-col sm:flex-row flex-1 gap-4 px-4 py-3 max-w-lg justify-center">
                  <Button
                    className="min-w-[84px] h-16 px-6 bg-primary text-[#111813] text-lg tracking-[0.015em] grow transition-transform hover:scale-105 active:scale-100 opacity-75"
                    type="button"
                    onClick={() => navigate("/waste-categories")}
                    size="xl"
                  >
                    <span className="truncate">Да</span>
                  </Button>
                  <Button
                    className="min-w-[84px] h-16 px-6 bg-[#f0f4f1] text-[#111813] text-lg tracking-[0.015em] grow transition-transform hover:scale-105 active:scale-100"
                    type="button"
                    onClick={() => navigate("/recognition-choice")}
                    size="xl"
                    variant="secondary"
                  >
                    <span className="truncate">Нет</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SortingQuizPage;
