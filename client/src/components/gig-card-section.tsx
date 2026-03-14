import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, CreditCard, Users, Edit3, Printer, QrCode, Lock } from "lucide-react";
import type { ProviderProfile } from "@shared/schema";

interface GigCardSectionProps {
  profile: ProviderProfile;
}

const TIER_COLORS: Record<string, string> = {
  GZLurker: "#555",
  GZ2: "#a78bfa",
  GZ_PLUS: "#f59e0b",
  GZ_PRO: "#10b981",
};

const TIER_LABELS: Record<string, string> = {
  GZLurker: "GZ Lurker",
  GZ2: "GZ2",
  GZ_PLUS: "GZ Plus",
  GZ_PRO: "GZ Pro",
};

function GeeZeeCardPreview({ card }: { card: any }) {
  const tier = card?.userId ? "GZ2" : "GZLurker";
  const tierColor = TIER_COLORS[tier] ?? "#555";
  const qrUrl = card?.qrUuid
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/geezees?card=${card.qrUuid}`)}`
    : null;

  return (
    <div style={{
      width: "100%",
      background: "linear-gradient(135deg, #0d0d14 0%, #12101a 100%)",
      borderRadius: 12,
      border: "1px solid rgba(139,92,246,0.2)",
      padding: "16px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)",
      }} />

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 26,
          background: card?.profilePic ? "transparent" : "rgba(139,92,246,0.2)",
          border: "2px solid rgba(139,92,246,0.4)",
          overflow: "hidden", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {card?.profilePic
            ? <img src={card.profilePic} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <Sparkles style={{ width: 22, height: 22, color: "#a78bfa" }} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: tierColor,
              border: `1px solid ${tierColor}40`,
              borderRadius: 4, padding: "1px 6px",
            }}>
              {TIER_LABELS[tier] ?? tier}
            </span>
            {card?.intent && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: "#888",
                background: "#1a1a1a", borderRadius: 4, padding: "1px 6px",
                textTransform: "capitalize",
              }}>
                {card.intent}
              </span>
            )}
          </div>

          <p style={{
            fontSize: 12, color: "#ccc", fontStyle: card?.slogan ? "normal" : "italic",
            lineHeight: 1.4, margin: 0,
          }}>
            {card?.slogan || "No slogan yet — add yours in the card editor"}
          </p>

          {(card?.ageBracket || card?.gender) && (
            <p style={{ fontSize: 10, color: "#555", marginTop: 4, margin: "4px 0 0" }}>
              {[card.ageBracket, card.gender].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {qrUrl && (
          <div style={{
            width: 48, height: 48, background: "#fff",
            borderRadius: 6, overflow: "hidden", flexShrink: 0,
          }}>
            <img src={qrUrl} alt="QR" style={{ width: "100%", height: "100%" }} />
          </div>
        )}
      </div>

      {card?.gallery?.filter(Boolean).length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
          {card.gallery.filter(Boolean).slice(0, 4).map((url: string, i: number) => (
            <div key={i} style={{
              flex: 1, aspectRatio: "1", borderRadius: 6,
              overflow: "hidden", background: "#1a1a1a",
            }}>
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrintVistaTab() {
  return (
    <div style={{
      background: "#0b0b0b", borderRadius: 12,
      border: "1px solid #1e1e1e", padding: 16,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Printer style={{ width: 16, height: 16, color: "#555" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>
          Physical GeeZee Cards via PrintVista
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: "#f59e0b",
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 4, padding: "2px 6px", marginLeft: "auto",
        }}>
          COMING SOON
        </span>
      </div>

      <div style={{
        background: "#0d0d0d", borderRadius: 8,
        border: "1px dashed #2a2a2a",
        padding: 20, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        <QrCode style={{ width: 32, height: 32, color: "#2a2a2a" }} />
        <p style={{ fontSize: 11, color: "#444", margin: 0, lineHeight: 1.5 }}>
          Print premium business-style GeeZee Cards with your QR code, photo, slogan, and tier badge.
          Fulfilled via PrintVista — 3.5 × 2 in, double-sided, shipped to your door.
        </p>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {["50 cards", "100 cards", "250 cards"].map((q) => (
            <span key={q} style={{
              fontSize: 10, color: "#333",
              border: "1px solid #222", borderRadius: 4, padding: "3px 8px",
            }}>
              {q}
            </span>
          ))}
        </div>
      </div>

      <Button
        disabled
        className="w-full h-9 text-xs font-bold rounded-xl cursor-not-allowed"
        style={{ background: "rgba(245,158,11,0.08)", color: "#6b5a2a", border: "1px solid rgba(245,158,11,0.15)" }}
        data-testid="button-printvista-order"
      >
        <Printer style={{ width: 13, height: 13, marginRight: 6 }} />
        Order Physical Cards
        <span style={{
          marginLeft: 8, fontSize: 9, background: "rgba(245,158,11,0.2)",
          color: "#f59e0b", padding: "2px 5px", borderRadius: 3,
        }}>
          Soon
        </span>
      </Button>
    </div>
  );
}

export function GigCardSection({ profile }: GigCardSectionProps) {
  const [tab, setTab] = useState<"digital" | "print">("digital");
  const [, navigate] = useLocation();

  const { data: card } = useQuery<any>({
    queryKey: ["/api/gigness-cards/mine"],
  });

  const hasCard = card && (card.slogan || card.profilePic);

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles style={{ width: 14, height: 14, color: "#a78bfa" }} />
          <h2 className="text-sm font-semibold text-white" data-testid="text-gig-cards-title">
            GeeZee Card
          </h2>
        </div>
        <span className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">
          Social Identity
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
        <button
          onClick={() => setTab("digital")}
          style={{
            fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999,
            background: tab === "digital" ? "rgba(139,92,246,0.15)" : "#0d0d0d",
            color: tab === "digital" ? "#a78bfa" : "#555",
            border: tab === "digital" ? "1px solid rgba(139,92,246,0.35)" : "1px solid #1e1e1e",
            cursor: "pointer",
          }}
          data-testid="tab-geezee-digital"
        >
          <Sparkles style={{ width: 10, height: 10, marginRight: 4, display: "inline" }} />
          Digital Card
        </button>
        <button
          onClick={() => setTab("print")}
          style={{
            fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999,
            background: tab === "print" ? "rgba(245,158,11,0.1)" : "#0d0d0d",
            color: tab === "print" ? "#f59e0b" : "#555",
            border: tab === "print" ? "1px solid rgba(245,158,11,0.25)" : "1px solid #1e1e1e",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}
          data-testid="tab-geezee-print"
        >
          <Printer style={{ width: 10, height: 10 }} />
          Print Vista
          <span style={{
            fontSize: 8, background: "rgba(245,158,11,0.2)",
            color: "#f59e0b", padding: "1px 4px", borderRadius: 3,
          }}>
            Soon
          </span>
        </button>
      </div>

      {tab === "digital" && (
        <div className="space-y-3">
          <GeeZeeCardPreview card={card} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Button
              size="sm"
              onClick={() => navigate("/card-editor")}
              className="h-9 text-xs font-bold rounded-xl"
              style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
              data-testid="button-edit-geezee-card"
            >
              <Edit3 style={{ width: 12, height: 12, marginRight: 5 }} />
              {hasCard ? "Edit My Card" : "Create My Card"}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/geezees")}
              variant="ghost"
              className="h-9 text-xs font-bold rounded-xl border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444]"
              data-testid="button-view-rolodex"
            >
              <Users style={{ width: 12, height: 12, marginRight: 5 }} />
              View Rolodex
            </Button>
          </div>

          {!hasCard && (
            <p style={{ fontSize: 10, color: "#444", textAlign: "center", margin: 0 }}>
              Your GeeZee Card is your social identity on the platform — create it to appear in the Rolodex and connect with others.
            </p>
          )}

          {card?.isPublic === false && hasCard && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 10, color: "#666", background: "#111",
              borderRadius: 8, padding: "6px 10px",
              border: "1px solid #2a2a2a",
            }}>
              <Lock style={{ width: 10, height: 10, color: "#444" }} />
              Your card is set to private — toggle it public in the editor to appear in the Rolodex.
            </div>
          )}
        </div>
      )}

      {tab === "print" && <PrintVistaTab />}
    </div>
  );
}
