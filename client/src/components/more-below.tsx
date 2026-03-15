import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function MoreBelow() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const scrollBottom = window.scrollY + window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;
      const nearBottom = pageHeight - scrollBottom < 80;
      const hasScrollRoom = pageHeight > window.innerHeight + 120;
      setVisible(hasScrollRoom && !nearBottom);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      aria-hidden="true"
      data-testid="more-below-indicator"
    >
      <div className="flex flex-col items-center gap-1 animate-bounce-slow">
        <span className="bg-black/70 backdrop-blur-sm border border-white/10 text-white/70 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg">
          More Below
        </span>
        <ChevronDown className="h-4 w-4 text-white/40" />
      </div>
    </div>
  );
}
