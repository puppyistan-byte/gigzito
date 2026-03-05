import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Home, PlusSquare, User } from "lucide-react";

export function BottomNav({ activeVertical, onVerticalChange }: {
  activeVertical: string;
  onVerticalChange: (v: string) => void;
}) {
  const { user } = useAuth();
  const [location] = useLocation();

  const goFeed = () => {
    if (location !== "/") window.location.href = "/";
    else onVerticalChange("ALL");
  };

  const goCreate = () => {
    window.location.href = user ? "/provider/me" : "/auth";
  };

  const goProfile = () => {
    window.location.href = user ? "/provider/me" : "/auth";
  };

  const feedActive = location === "/";

  return (
    <nav className="bottom-nav">
      <button
        onClick={goFeed}
        className={`nav-item transition-colors ${feedActive && activeVertical === "ALL" ? "active" : ""}`}
        data-testid="nav-feed"
      >
        <Home size={20} />
        <span className="nav-label">Feed</span>
      </button>

      <button
        onClick={goCreate}
        className="nav-item transition-colors"
        data-testid="nav-create"
      >
        <PlusSquare size={22} />
        <span className="nav-label">Create Post</span>
      </button>

      <button
        onClick={goProfile}
        className={`nav-item transition-colors ${location.startsWith("/provider") ? "active" : ""}`}
        data-testid="nav-profile"
      >
        <User size={20} />
        <span className="nav-label">Profile</span>
      </button>
    </nav>
  );
}
