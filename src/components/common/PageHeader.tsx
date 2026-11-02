import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 hidden text-sm lg:block">
      <Link to="/dashboard" className="text-slate-500 no-underline hover:text-ims-primary">
        Dashboard
      </Link>
      <span className="mx-2 text-slate-400">/</span>
      <span className="font-medium text-ims-ink">{current}</span>
    </nav>
  );
}

export function CardHeader({
  title,
  subtitle,
  subtitleClassName = "mt-0.5 text-sm text-slate-500",
  children,
}: {
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <h1 className="text-[15px] font-semibold text-ims-ink md:text-[17px]">{title}</h1>
        {subtitle && <p className={subtitleClassName}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
