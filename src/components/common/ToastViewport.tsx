import { useToasts } from "@/stores/session";

export function ToastViewport() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-[22rem]"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={`rounded-2xl px-4 py-3 text-left text-sm shadow-lg ${
            toast.tone === "error"
              ? "bg-rose-700 text-white"
              : toast.tone === "success"
                ? "bg-emerald-700 text-white"
                : "bg-ims-ink text-white"
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
