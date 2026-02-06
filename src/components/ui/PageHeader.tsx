import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-8 sm:mb-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm font-medium text-text-muted">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="mt-3 sm:mt-0">{children}</div>}
      </div>
      <div className="mt-4 h-px bg-gradient-to-r from-border via-border to-transparent" />
    </div>
  );
}
