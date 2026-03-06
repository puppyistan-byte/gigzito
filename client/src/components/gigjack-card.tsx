import { useState, useEffect } from "react";
import { ExternalLink, Clock, Tag, Users, AlertTriangle, CheckCircle, XCircle, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GigJackWithProvider } from "@shared/schema";

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: "Pending Review", color: "#f59e0b", icon: Clock },
  APPROVED:       { label: "Approved",       color: "#22c55e", icon: CheckCircle },
  REJECTED:       { label: "Rejected",        color: "#ef4444", icon: XCircle },
  NEEDS_IMPROVEMENT: { label: "Needs Improvement", color: "#3b82f6", icon: Wrench },
};

function useCountdown(minutes: number) {
  const total = minutes * 60;
  const [secs, setSecs] = useState(total);

  useEffect(() => {
    setSecs(total);
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [total]);

  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface GigJackCardProps {
  gigJack: GigJackWithProvider;
  showStatus?: boolean;
  showAdminActions?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onNeedsImprovement?: (id: number) => void;
  isPending?: boolean;
}

export function GigJackCard({
  gigJack,
  showStatus = false,
  showAdminActions = false,
  onApprove,
  onReject,
  onNeedsImprovement,
  isPending = false,
}: GigJackCardProps) {
  const countdown = useCountdown(gigJack.countdownMinutes);
  const statusCfg = STATUS_CONFIG[gigJack.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div
      data-testid={`card-gigjack-${gigJack.id}`}
      style={{
        background: "#0b0b0b",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {gigJack.botWarning && (
        <div
          style={{
            background: "rgba(245,158,11,0.12)",
            borderBottom: "1px solid rgba(245,158,11,0.3)",
            padding: "8px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}
          data-testid={`alert-bot-warning-${gigJack.id}`}
        >
          <AlertTriangle size={14} style={{ color: "#f59e0b", marginTop: "2px", flexShrink: 0 }} />
          <p style={{ fontSize: "12px", color: "#f59e0b", lineHeight: "1.4" }}>
            {gigJack.botWarningMessage}
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: "0" }}>
        {gigJack.artworkUrl && (
          <div style={{ width: "110px", flexShrink: 0 }}>
            <img
              src={gigJack.artworkUrl}
              alt={gigJack.offerTitle}
              style={{ width: "110px", height: "110px", objectFit: "cover", display: "block" }}
              data-testid={`img-gigjack-artwork-${gigJack.id}`}
            />
          </div>
        )}

        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
            <p
              style={{ fontSize: "14px", fontWeight: "600", color: "#fff", lineHeight: "1.3" }}
              data-testid={`text-gigjack-title-${gigJack.id}`}
            >
              {gigJack.offerTitle}
            </p>
            {showStatus && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: "500",
                  color: statusCfg.color,
                  background: `${statusCfg.color}18`,
                  border: `1px solid ${statusCfg.color}44`,
                  borderRadius: "999px",
                  padding: "2px 8px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                data-testid={`badge-gigjack-status-${gigJack.id}`}
              >
                <StatusIcon size={10} />
                {statusCfg.label}
              </span>
            )}
          </div>

          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "8px", lineHeight: "1.4" }}>
            {gigJack.description.length > 80 ? gigJack.description.slice(0, 80) + "…" : gigJack.description}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#ff2b2b",
                background: "rgba(255,43,43,0.12)",
                border: "1px solid rgba(255,43,43,0.3)",
                borderRadius: "999px",
                padding: "2px 8px",
              }}
              data-testid={`text-gigjack-countdown-${gigJack.id}`}
            >
              <Clock size={10} />
              {countdown}
            </span>

            {gigJack.couponCode && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: "500",
                  color: "#22c55e",
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: "4px",
                  padding: "2px 7px",
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
                data-testid={`text-gigjack-coupon-${gigJack.id}`}
              >
                <Tag size={9} />
                {gigJack.couponCode}
              </span>
            )}

            {gigJack.quantityLimit && (
              <span
                style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "3px" }}
                data-testid={`text-gigjack-qty-${gigJack.id}`}
              >
                <Users size={10} />
                {gigJack.quantityLimit} slots
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {gigJack.provider?.avatarUrl && (
            <img
              src={gigJack.provider.avatarUrl}
              alt={gigJack.provider.displayName}
              style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }}
            />
          )}
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
            {gigJack.provider?.displayName ?? "Unknown"}
          </span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>·</span>
          <a
            href={gigJack.companyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}
            data-testid={`link-gigjack-company-${gigJack.id}`}
          >
            {new URL(gigJack.companyUrl).hostname}
          </a>
        </div>

        <a
          href={gigJack.ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#ff2b2b",
            background: "rgba(255,43,43,0.12)",
            border: "1px solid rgba(255,43,43,0.3)",
            borderRadius: "6px",
            padding: "4px 10px",
            textDecoration: "none",
          }}
          data-testid={`link-gigjack-cta-${gigJack.id}`}
        >
          Claim Offer <ExternalLink size={10} />
        </a>
      </div>

      {showAdminActions && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            onClick={() => onApprove?.(gigJack.id)}
            disabled={isPending || gigJack.status === "APPROVED"}
            data-testid={`button-admin-approve-gj-${gigJack.id}`}
            style={{
              flex: 1,
              padding: "6px",
              fontSize: "12px",
              fontWeight: "600",
              background: gigJack.status === "APPROVED" ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: "6px",
              color: "#22c55e",
              cursor: gigJack.status === "APPROVED" ? "default" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onNeedsImprovement?.(gigJack.id)}
            disabled={isPending}
            data-testid={`button-admin-improve-gj-${gigJack.id}`}
            style={{
              flex: 1,
              padding: "6px",
              fontSize: "12px",
              fontWeight: "600",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.4)",
              borderRadius: "6px",
              color: "#3b82f6",
              cursor: "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Improve
          </button>
          <button
            onClick={() => onReject?.(gigJack.id)}
            disabled={isPending || gigJack.status === "REJECTED"}
            data-testid={`button-admin-reject-gj-${gigJack.id}`}
            style={{
              flex: 1,
              padding: "6px",
              fontSize: "12px",
              fontWeight: "600",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "6px",
              color: "#ef4444",
              cursor: gigJack.status === "REJECTED" ? "default" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
