import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Home, PlusSquare, User, Radio, Tv } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
  const liveActive = location.startsWith("/live");

  const { data: liveSessions = [] } = useQuery<any[]>({
    queryKey: ["/api/live/active"],
    refetchInterval: 30000,
  });
  const hasLive = liveSessions.length > 0;

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
        onClick={() => window.location.href = "/live"}
        className={`nav-item transition-colors relative ${liveActive ? "active" : ""}`}
        data-testid="nav-live"
      >
        <span className="relative inline-block">
          <Radio size={20} />
          {hasLive && (
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ff2b2b] animate-pulse border border-black"
              style={{ display: "block" }}
            />
          )}
        </span>
        <span className="nav-label">Live</span>
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
        onClick={() => window.open("https://zito.tv/", "_blank", "noopener,noreferrer")}
        className="nav-item transition-colors"
        data-testid="nav-zito-tv"
      >
        <Tv size={20} />
        <span className="nav-label">Zito TV</span>
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
