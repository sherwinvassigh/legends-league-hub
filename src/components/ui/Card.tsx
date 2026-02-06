import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  glass?: boolean;
}

const paddingMap = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-7",
};

export function Card({
  children,
  className = "",
  padding = "md",
  hover = false,
  glass = false,
}: CardProps) {
  const base = glass
    ? "rounded-2xl border border-white/20 bg-white/60 backdrop-blur-sm shadow-sm"
    : "rounded-2xl border border-border bg-white shadow-sm";

  const hoverClass = hover ? "card-hover cursor-pointer" : "";

  return (
    <div
      className={`${base} ${paddingMap[padding]} ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}
