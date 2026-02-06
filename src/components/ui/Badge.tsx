import { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "danger" | "warning" | "position";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface text-text-secondary",
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  position: "text-white",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

const positionColors: Record<string, string> = {
  QB: "bg-pos-qb",
  RB: "bg-pos-rb",
  WR: "bg-pos-wr",
  TE: "bg-pos-te",
  K: "bg-pos-k",
  DEF: "bg-pos-def",
};

export function PositionBadge({ position }: { position: string }) {
  return (
    <Badge variant="position" className={positionColors[position] || "bg-gray-500"}>
      {position}
    </Badge>
  );
}
