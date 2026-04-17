import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import gzLogo from "@assets/gz_purple_1776386269790.png";

interface GzBtn {
  id: string;
  label: string;
  tagline: string;
  color: string;
  glow: string;
  bg: string;
  path: string;
  businessOnly?: boolean;
}

const GZ_BUTTONS: GzBtn[] = [
  {
    id: "gz-music",
    label: "GZMusic",
    tagline: "DROP YOUR TRACK · GZ100 Chart is LIVE 🔥",
    color: "#ff7a00",
    glow: "rgba(255,122,0,0.65)",
    bg: "linear-gradient(135deg, #ff7a00 0%, #cc5200 100%)",
    path: "/gz-music",
  },
  {
    id: "gz-flash",
    label: "GZFlash Sales",
    tagline: "⚡ FLASH DEALS · Limited Slots — Act Fast!",
    color: "#1d4ed8",
    glow: "rgba(29,78,216,0.65)",
    bg: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
    path: "/offer-center",
  },
  {
    id: "geezee-cards",
    label: "GeeZee Cards",
    tagline: "💎 Your Digital Identity · Stand Out Now",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.65)",
    bg: "linear-gradient(135deg, #7c3aed 0%, #4f1eb8 100%)",
    path: "/geezees",
  },
  {
    id: "gz-groups",
    label: "GZGroups",
    tagline: "👥 Find Your Tribe · Join the Movement",
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.65)",
    bg: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
    path: "/groups",
  },
  {
    id: "gz-business",
    label: "GZBusiness",
    tagline: "🏢 Your Storefront · Get Found Locally",
    color: "#10b981",
    glow: "rgba(16,185,129,0.65)",
    bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    path: "/business-profile/setup",
    businessOnly: true,
  },
  {
    id: "most-loved",
    label: "Most Loved",
    tagline: "❤️ What's HOTTEST Right Now · Top Picks",
    color: "#ff2b2b",
    glow: "rgba(255,43,43,0.65)",
    bg: "linear-gradient(135deg, #ff2b2b 0%, #cc0000 100%)",
    path: "/most-loved",
  },
];

export function SideRail() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const tier = user?.user?.subscriptionTier ?? "";

  const handleClick = (btn: GzBtn) => {
    if (btn.id === "gz-business" && tier !== "GZBusiness") {
      navigate("/pricing");
    } else {
      navigate(btn.path);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 9990,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 9,
      }}
      data-testid="side-rail-gz"
    >
      {GZ_BUTTONS.map((btn) => {
        const hovered = hoveredId === btn.id;
        const isBusinessLocked = btn.businessOnly && tier !== "GZBusiness";

        return (
          <div
            key={btn.id}
            style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end" }}
          >
            {/* Flash marketing tooltip — pops left */}
            {hovered && (
              <div
                style={{
                  position: "absolute",
                  right: "calc(100% + 10px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(5,5,5,0.95)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: `1px solid ${btn.color}55`,
                  borderRadius: 10,
                  padding: "8px 12px",
                  whiteSpace: "nowrap",
                  boxShadow: `0 4px 24px ${btn.glow}, 0 2px 8px rgba(0,0,0,0.7)`,
                  pointerEvents: "none",
                }}
                data-testid={`tooltip-side-rail-${btn.id}`}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: btn.color,
                    margin: 0,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {btn.label}
                  {isBusinessLocked && (
                    <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginLeft: 6, textTransform: "none", letterSpacing: "0.02em" }}>
                      · Upgrade to unlock
                    </span>
                  )}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.65)",
                    margin: "3px 0 0",
                    letterSpacing: "0.015em",
                    fontWeight: 600,
                  }}
                >
                  {isBusinessLocked ? "🔒 GZBusiness members only" : btn.tagline}
                </p>
              </div>
            )}

            {/* Round GZ button */}
            <button
              onClick={() => handleClick(btn)}
              onMouseEnter={() => setHoveredId(btn.id)}
              onMouseLeave={() => setHoveredId(null)}
              data-testid={`btn-side-rail-${btn.id}`}
              aria-label={btn.label}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: isBusinessLocked
                  ? "rgba(30,30,30,0.8)"
                  : btn.bg,
                border: `2px solid ${btn.color}${isBusinessLocked ? "55" : "cc"}`,
                boxShadow: hovered
                  ? `0 0 20px ${btn.glow}, 0 4px 20px rgba(0,0,0,0.6)`
                  : `0 2px 10px rgba(0,0,0,0.5)`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.15s cubic-bezier(.34,1.56,.64,1), box-shadow 0.15s ease",
                transform: hovered ? "scale(1.18)" : "scale(1)",
                padding: 0,
                overflow: "hidden",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <img
                src={gzLogo}
                alt={btn.label}
                style={{
                  width: "76%",
                  height: "76%",
                  objectFit: "contain",
                  filter: isBusinessLocked
                    ? "brightness(0) invert(1) opacity(0.3)"
                    : "brightness(0) invert(1)",
                  opacity: isBusinessLocked ? 0.4 : 0.95,
                  pointerEvents: "none",
                  flexShrink: 0,
                }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
