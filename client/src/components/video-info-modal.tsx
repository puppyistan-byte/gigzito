import { X, Mail, Phone, Globe, MessageCircle, Instagram, Youtube, Tag, Timer, ShoppingCart, ExternalLink } from "lucide-react";
import type { ListingWithProvider } from "@shared/schema";

const BADGE_LABEL: Record<string, string> = {
  INFLUENCER: "Influencer", MARKETING: "Marketing", COACHING: "Coaching",
  COURSES: "Courses", PRODUCTS: "Products", FLASH_SALE: "Flash Sale",
  FLASH_COUPON: "Flash Coupon", MUSIC_GIGS: "Music Gigs", MUSIC: "Music",
  EVENTS: "Events", CRYPTO: "Crypto", CORPORATE_DEALS: "Corporate Deals",
};

function Row({ icon, label, value, href }: { icon: any; label: string; value: string; href?: string }) {
  const Icon = icon;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <Icon size={14} style={{ color: "rgba(255,255,255,0.4)", marginTop: "2px", flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "#ff2b2b", textDecoration: "none", wordBreak: "break-all" }}>{value}</a>
        ) : (
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", wordBreak: "break-all" }}>{value}</p>
        )}
      </div>
    </div>
  );
}

interface VideoInfoModalProps {
  listing: ListingWithProvider;
  onClose: () => void;
  onInquire: () => void;
}

export function VideoInfoModal({ listing, onClose, onInquire }: VideoInfoModalProps) {
  const p = listing.provider;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-info"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#111",
          borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {p.avatarUrl && (
              <img src={p.avatarUrl} alt={p.displayName} style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.15)" }} />
            )}
            <div>
              <p style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>{p.displayName}</p>
              <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: "999px", padding: "1px 8px" }}>
                {BADGE_LABEL[listing.vertical] ?? listing.vertical}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0 }}
            data-testid="button-close-info-modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "0 20px 16px" }}>
          {/* Offer */}
          <div style={{ margin: "14px 0", padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "6px", lineHeight: "1.3" }}>{listing.title}</p>
            {listing.description && (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.55" }}>{listing.description}</p>
            )}
          </div>

          {/* Special extras */}
          {listing.vertical === "FLASH_COUPON" && listing.couponCode && (
            <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "8px 12px" }}>
              <Tag size={13} style={{ color: "#10b981" }} />
              <span style={{ fontFamily: "monospace", fontWeight: "700", letterSpacing: "0.08em", color: "#6ee7b7", fontSize: "14px" }}>{listing.couponCode}</span>
            </div>
          )}
          {listing.vertical === "PRODUCTS" && (
            <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {listing.productPrice && <span style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.4)", color: "#fdba74", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: "700" }}>{listing.productPrice}</span>}
              {listing.productStock && <span style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", padding: "4px 10px", borderRadius: "6px", fontSize: "12px" }}>{listing.productStock}</span>}
            </div>
          )}

          {/* Details rows */}
          {listing.ctaUrl && <Row icon={ExternalLink} label="Destination" value={listing.ctaUrl} href={listing.ctaUrl} />}
          {p.bio && <Row icon={MessageCircle} label="About" value={p.bio} />}
          {p.contactEmail && <Row icon={Mail} label="Email" value={p.contactEmail} href={`mailto:${p.contactEmail}`} />}
          {p.contactPhone && (p as any).showPhone && <Row icon={Phone} label="Phone" value={p.contactPhone} href={`tel:${p.contactPhone}`} />}
          {p.websiteUrl && <Row icon={Globe} label="Website" value={p.websiteUrl} href={p.websiteUrl} />}
          {p.instagramUrl && <Row icon={Instagram} label="Instagram" value={p.instagramUrl} href={p.instagramUrl} />}
          {p.youtubeUrl && <Row icon={Youtube} label="YouTube" value={p.youtubeUrl} href={p.youtubeUrl} />}
          {p.contactTelegram && <Row icon={MessageCircle} label="Telegram" value={p.contactTelegram} />}

          {listing.tags && listing.tags.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
              {listing.tags.map((t) => (
                <span key={t} style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)", borderRadius: "999px", padding: "2px 8px" }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
            <button
              onClick={() => { onClose(); onInquire(); }}
              data-testid="button-info-to-inquire"
              style={{
                flex: 1,
                background: "#c41414",
                color: "#fff",
                border: "none",
                borderRadius: "999px",
                padding: "11px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Inquire
            </button>
            {listing.ctaUrl && (
              <a
                href={listing.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-info-visit"
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "999px",
                  padding: "11px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
              >
                <ExternalLink size={13} /> Visit
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
