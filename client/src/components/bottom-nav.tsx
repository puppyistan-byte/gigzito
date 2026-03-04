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
    <nav className="bottom-nav">
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
            className={`nav-item transition-colors ${
              isActive ? "active" : ""
            }`}
          >
            <Icon />
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
