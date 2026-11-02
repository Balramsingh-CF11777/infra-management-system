import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  open,
  title,
  children,
  onClose,
  size = "md",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[2200] flex items-end justify-center bg-[#1f2547]/45 sm:items-stretch sm:justify-end"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:max-h-none sm:rounded-none ${
          size === "lg" ? "sm:w-[min(40rem,100vw)]" : "sm:w-[420px]"
        }`}
      >
        <div className="flex items-center justify-between gap-3 bg-ims-drawer px-5 py-4">
          <h2 id="dialog-title" className="text-lg font-medium text-ims-ink">
            {title}
          </h2>
          <button type="button" className="rounded-lg p-1 text-ims-ink hover:bg-white/60" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
