import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** True when React Router has an in-app history entry to pop. */
export function canGoBackInApp() {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" && idx > 0;
}

/** Go to the previous interacted screen; only use fallback when there is no in-app history. */
export function useSmartBack(fallback = "/chola360/leads") {
  const navigate = useNavigate();
  return () => {
    if (canGoBackInApp()) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  };
}

/** Returns to the screen the user opened this page from. */
export function BackButton({
  className = "",
  iconClassName = "h-4 w-4",
  fallback = "/chola360/leads",
  children,
}: {
  className?: string;
  iconClassName?: string;
  fallback?: string;
  children?: ReactNode;
}) {
  const goBack = useSmartBack(fallback);
  return (
    <button type="button" className={className} aria-label="Back" onClick={goBack}>
      <ArrowLeft className={iconClassName} />
      {children}
    </button>
  );
}
