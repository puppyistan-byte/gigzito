import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import geezeeBtn from "@assets/geezee_button_circle.png";
import mostlovedBtn from "@assets/mostloved_button_circle.png";
import gzflashBtn from "@assets/gzflash_button_circle.png";
import gzgroupsBtn from "@assets/gzgroups_button_circle.png";
import gzmusicBtn from "@assets/gzmusic_button_circle.png";
import gzbusinessBtn from "@assets/gzbusiness_button_circle.png";

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
    bg: "transparent",
    path: "/gz-music",
  },
  {
    id: "gz-flash",
    label: "GZFlash Sales",
    tagline: "⚡ FLASH DEALS · Limited Slots — Act Fast!",
    color: "#1d4ed8",
    glow: "rgba(29,78,216,0.65)",
    bg: "transparent",
    path: "/offer-center",
  },
  {
    id: "geezee-cards",
    label: "GZCards",
    tagline: "💎 Your Digital Identity · Stand Out Now",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.75)",
    bg: "transparent",
    path: "/geezees",
  },
  {
    id: "gz-groups",
    label: "GZGroups",
    tagline: "👥 Find Your Tribe · Join the Movement",
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.65)",
    bg: "transparent",
    path: "/groups",
  },
  {
    id: "gz-business",
    label: "GZBusiness",
    tagline: "🏢 Business Directory · Get Found Locally",
    color: "#10b981",
    glow: "rgba(16,185,129,0.65)",
    bg: "transparent",
    path: "/gz-business",
  },
  {
    id: "most-loved",
    label: "Most Loved",
    tagline: "❤️ What's HOTTEST Right Now · Top Picks",
    color: "#ff2b2b",
    glow: "rgba(255,43,43,0.65)",
    bg: "transparent",
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
                background: btn.bg,
                border: "none",
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
                src={
                  btn.id === "geezee-cards" ? geezeeBtn
                  : btn.id === "most-loved" ? mostlovedBtn
                  : btn.id === "gz-flash" ? gzflashBtn
                  : btn.id === "gz-groups" ? gzgroupsBtn
                  : btn.id === "gz-music" ? gzmusicBtn
                  : gzbusinessBtn
                }
                alt={btn.label}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "50%",
                  pointerEvents: "none",
                  flexShrink: 0,
                }}
              />
              {/* Lock badge — only when business tier is required */}
              {isBusinessLocked && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.82)",
                    border: "1.5px solid rgba(255,255,255,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    lineHeight: 1,
                    pointerEvents: "none",
                  }}
                >
                  🔒
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
