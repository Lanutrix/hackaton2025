import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "soft" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
  shape?: "rounded" | "pill" | "circle";
  className?: string;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-2",
  secondary:
    "bg-gray-100 text-[#111813] hover:bg-gray-200 focus-visible:ring-gray-200 focus-visible:ring-offset-2 focus-visible:ring-2",
  outline:
    "border border-gray-300 bg-white text-[#111813] hover:bg-gray-100 focus-visible:ring-gray-200 focus-visible:ring-offset-2 focus-visible:ring-2",
  ghost:
    "bg-transparent text-[#111813] hover:bg-black/5 focus-visible:ring-gray-200 focus-visible:ring-offset-2 focus-visible:ring-2",
  soft:
    "bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-2",
  danger:
    "bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-2",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-base rounded-lg",
  lg: "h-12 px-5 text-base rounded-xl",
  xl: "h-14 px-6 text-lg rounded-xl",
  icon: "h-10 w-10 p-0 rounded-full",
};

const baseClasses =
  "inline-flex select-none items-center justify-center font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none";

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth,
    loading,
    loadingText,
    leftIcon,
    rightIcon,
    iconOnly,
    shape = "rounded",
    className,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const shapeClass =
    shape === "circle"
      ? "rounded-full"
      : shape === "pill"
      ? "rounded-full"
      : "";

  const hasIconOnly = iconOnly || (!children && (leftIcon || rightIcon));

  const content = (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        hasIconOnly ? "" : "gap-2",
        size === "icon" && "w-full h-full",
      )}
    >
      {hasIconOnly ? (
        leftIcon ?? rightIcon ?? children
      ) : (
        <>
          {leftIcon}
          <span className="truncate">{children}</span>
          {rightIcon}
        </>
      )}
    </span>
  );

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        shapeClass,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {loadingText ?? children ?? "Loading..."}
        </span>
      ) : (
        content
      )}
    </button>
  );
});

export default Button;
