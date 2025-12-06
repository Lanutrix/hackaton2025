import type { ReactNode } from "react";
import Button from "./Button";

type CameraScreenProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightButtonLabel: string;
  onRightClick: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const CameraScreen = ({
  title,
  subtitle,
  onBack,
  rightButtonLabel,
  onRightClick,
  children,
  footer,
}: CameraScreenProps) => {
  return (
    <div className="min-h-screen bg-white text-[#111813] flex flex-col items-center px-4 py-8 font-display page-enter">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            size="md"
            leftIcon={<span className="material-symbols-outlined">arrow_back</span>}
          >
            Назад
          </Button>
          <Button onClick={onRightClick} size="md">
            {rightButtonLabel}
          </Button>
        </header>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-600">
                {subtitle}
              </p>
            )}
          </div>

          {children}

          {footer && (
            <div className="flex flex-col gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraScreen;
