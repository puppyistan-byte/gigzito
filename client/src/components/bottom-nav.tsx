import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Home, Zap, User, MessageSquare, PlaySquare } from "lucide-react";

export function BottomNav({ activeVertical, onVerticalChange }: { activeVertical: string, onVerticalChange: (v: string) => void }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const tabs = [
    { key: "ALL", label: "Feed", icon: Home },
    { key: "MARKETING", label: "Marketing", icon: Zap },
    { key: "COACHING", label: "Coaching", icon: MessageSquare },
    { key: "COURSES", label: "Courses", icon: PlaySquare },
    { key: "PROFILE", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/10 safe-area-bottom">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === "PROFILE" 
            ? location.startsWith("/provider") || location === "/auth"
            : location === "/" && activeVertical === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === "PROFILE") {
                  window.location.href = user ? "/provider/me" : "/auth";
                } else {
                  if (location !== "/") window.location.href = "/";
                  onVerticalChange(tab.key);
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 flex-1 transition-colors ${
                isActive ? "text-primary" : "text-white/40 hover:text-white/60"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
