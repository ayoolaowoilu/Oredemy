import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  label?: string;
  fallback?: string;
  className?: string;
}

export function BackButton({
  label = "Back",
  fallback = "/",
  className = "",
}: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate(fallback);
      }}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-[#2501FF] transition hover:bg-[#2501FF]/[0.07] ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
