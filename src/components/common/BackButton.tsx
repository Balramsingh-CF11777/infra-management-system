import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** Returns to the screen the user opened this page from. */
export function BackButton({ className = "", iconClassName = "h-4 w-4" }: { className?: string; iconClassName?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={className}
      aria-label="Back"
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className={iconClassName} />
    </button>
  );
}
