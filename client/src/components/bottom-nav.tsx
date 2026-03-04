import { type ElementType } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Home, Zap, User, MessageSquare, Plus } from "lucide-react";

export function BottomNav({ activeVertical, onVerticalChange }: { activeVertical: string, onVerticalChange: (v: string) => void }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const leftTabs = [
    { key: "ALL", label: "Feed", icon: Home },
    { key: "MARKETING", label: "Marketing", icon: Zap },
  ];

  const rightTabs = [
    { key: "COACHING", label: "Coaching", icon: MessageSquare },
    { key: "PROFILE", label: "Profile", icon: User },
  ];

  const handleTab = (key: string) => {
    if (key === "PROFILE") {
      window.location.href = user ? "/provider/me" : "/auth";
    } else {
      if (location !== "/") window.location.href = "/";
      onVerticalChange(key);
    }
  };

  const isTabActive = (key: string) => {
    if (key === "PROFILE") return location.startsWith("/provider") || location === "/auth";
    return location === "/" && activeVertical === key;
  };

  const renderTab = (tab: { key: string; label: string; icon: ElementType }) => {
    const Icon = tab.icon;
    return (
      <button
        key={tab.key}
        onClick={() => handleTab(tab.key)}
        className={`nav-item transition-colors ${isTabActive(tab.key) ? "active" : ""}`}
        data-testid={`nav-${tab.key.toLowerCase()}`}
      >
        <Icon />
        <span className="nav-label">{tab.label}</span>
      </button>
    );
  };

  return (
    <nav className="bottom-nav">
      {leftTabs.map(renderTab)}

      {/* Center Post Button */}
      <button
        onClick={() => window.location.href = user ? "/provider/new" : "/auth"}
        className="nav-item post-btn relative flex flex-col items-center justify-center"
        data-testid="nav-post"
        style={{ marginTop: "-18px" }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "#c41414",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(196,20,20,0.5)",
            border: "3px solid rgba(255,255,255,0.35)",
          }}
        >
          <Plus style={{ width: 26, height: 26, strokeWidth: 3 }} />
        </div>
        <span className="nav-label mt-1">Post</span>
      </button>

      {rightTabs.map(renderTab)}
    </nav>
  );
}
