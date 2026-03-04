import { type ElementType } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Home, Zap, User, MessageSquare, BookOpen } from "lucide-react";

export function BottomNav({ activeVertical, onVerticalChange }: { activeVertical: string, onVerticalChange: (v: string) => void }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const leftTabs = [
    { key: "ALL", label: "Feed", icon: Home },
    { key: "MARKETING", label: "Marketing", icon: Zap },
  ];

  const rightTabs = [
    { key: "COACHING", label: "Coaching", icon: MessageSquare },
    { key: "COURSES", label: "Courses", icon: BookOpen },
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

      {/* Center Crypto Button */}
      <button
        onClick={() => window.location.href = user ? "/provider/new" : "/auth"}
        className="nav-item post-btn"
        data-testid="nav-crypto"
      >
        <span className="post-icon" style={{ fontSize: 22, color: "#c41414", background: "none", lineHeight: 1 }}>₿</span>
        <span className="nav-label">Crypto</span>
      </button>

      {rightTabs.map(renderTab)}
    </nav>
  );
}
