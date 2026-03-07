import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { X, Radio, Tv } from "lucide-react";

interface GuestCtaModalProps {
  onClose: () => void;
  reason?: "cta" | "live" | "inquire" | "general";
}

const MESSAGES: Record<string, { icon: React.ReactNode; title: string; body: string }> = {
  cta:     { icon: <Tv className="w-6 h-6 text-[#ff2b2b]" />,    title: "Members Only",        body: "Create a free Gigzito account to unlock offers and live events." },
  live:    { icon: <Radio className="w-6 h-6 text-[#ff2b2b]" />, title: "Join the Broadcast",   body: "Create a free Gigzito account to unlock offers and live events." },
  inquire: { icon: <Tv className="w-6 h-6 text-[#ff2b2b]" />,    title: "Connect with Creators", body: "Create a free Gigzito account to unlock offers and live events." },
  general: { icon: <Tv className="w-6 h-6 text-[#ff2b2b]" />,    title: "Members Only",         body: "Create a free Gigzito account to unlock offers and live events." },
};

export function GuestCtaModal({ onClose, reason = "general" }: GuestCtaModalProps) {
  const [, navigate] = useLocation();
  const msg = MESSAGES[reason];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(6px)",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-guest-cta"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "#111",
          borderRadius: "20px",
          padding: "28px 24px 24px",
          border: "1px solid rgba(255,43,43,0.25)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          data-testid="button-close-guest-modal"
        >
          <X size={14} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,43,43,0.12)", border: "1px solid rgba(255,43,43,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            {msg.icon}
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>{msg.title}</h2>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: "1.6" }}>
            {msg.body}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Button
            onClick={() => { onClose(); navigate("/auth?tab=register"); }}
            style={{ background: "#ff2b2b", color: "#fff", fontWeight: "700", borderRadius: "999px", border: "none" }}
            data-testid="button-guest-register"
          >
            Create Free Account
          </Button>
          <Button
            variant="ghost"
            onClick={() => { onClose(); navigate("/auth"); }}
            style={{ color: "rgba(255,255,255,0.5)", borderRadius: "999px" }}
            data-testid="button-guest-login"
          >
            Already a member? Log in
          </Button>
        </div>
      </div>
    </div>
  );
}
