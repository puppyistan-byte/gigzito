import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, User, Mail, MessageSquare, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { SponsorAd } from "@shared/schema";
 
const ROTATION_MS = 5_000;
const AD_VISIBLE = true; // desktop-only — hidden on mobile/tablet via className

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #1a0a0a 0%, #3d0000 50%, #1a0a0a 100%)",
  "linear-gradient(135deg, #0a0a1a 0%, #00003d 50%, #0a0a1a 100%)",
  "linear-gradient(135deg, #0a1a0a 0%, #003d00 50%, #0a1a0a 100%)",
];

const todayDate = new Date().toISOString().slice(0, 10);

function AdInquiryModal({ ad, onClose }: { ad: SponsorAd; onClose: () => void }) {
  const { user } = useAuth();
  const viewerUsername = user?.profile?.username ?? undefined;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nameErr, setNameErr] = useState(false);
  const [msgErr, setMsgErr] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/ad-inquiries", {
        adId: ad.id,
        advertiserUsername: ad.contactUsername ?? undefined,
        viewerName: name,
        viewerEmail: email || undefined,
        viewerMessage: message,
        viewerUsername,
      }),
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = () => {
    const ne = !name.trim();
    const me = !message.trim();
    setNameErr(ne);
    setMsgErr(me);
    if (ne || me) return;
    mutation.mutate();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-ad-inquiry"
    >
      <div style={{ width: "100%", maxWidth: "480px", background: "#111", borderRadius: "20px 20px 0 0", padding: "24px 20px calc(24px + env(safe-area-inset-bottom, 0px))", border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>
            {submitted ? "Inquiry Sent!" : `Contact ${ad.contactUsername ? `@${ad.contactUsername}` : "Advertiser"}`}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "4px" }} data-testid="button-close-ad-inquiry">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <CheckCircle2 size={44} style={{ color: "#22c55e", margin: "0 auto 12px" }} />
            <p style={{ color: "#fff", fontSize: "15px", fontWeight: 600, marginBottom: 6 }}>Thanks, {name}!</p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginBottom: 20 }}>
              Your message has been sent to {ad.contactUsername ? `@${ad.contactUsername}` : "the advertiser"}.
            </p>
            <button onClick={onClose} style={{ width: "100%", padding: "12px", background: "#222", color: "#fff", border: "1px solid #333", borderRadius: "999px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Close
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Ad context */}
            <div style={{ background: "rgba(255,43,43,0.06)", border: "1px solid rgba(255,43,43,0.2)", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#ff2b2b", marginBottom: 2 }}>{ad.title}</p>
              {ad.contactMessage && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: 0 }}>{ad.contactMessage}</p>
              )}
              {ad.contactEmail && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                  <Mail size={10} style={{ display: "inline", marginRight: 4 }} />
                  {ad.contactEmail}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 5 }}>
                <User size={11} style={{ display: "inline", marginRight: 5 }} />Your Name *
              </label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameErr(false); }}
                placeholder="First name"
                style={{ width: "100%", background: "#1a1a1a", border: `1px solid ${nameErr ? "#ef4444" : "#2a2a2a"}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                data-testid="input-inquiry-name"
              />
              {nameErr && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 3 }}>Name is required</p>}
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 5 }}>
                <Mail size={11} style={{ display: "inline", marginRight: 5 }} />Your Email <span style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                data-testid="input-inquiry-email"
              />
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 5 }}>
                <MessageSquare size={11} style={{ display: "inline", marginRight: 5 }} />Message * <span style={{ color: "rgba(255,255,255,0.25)" }}>max 120 chars</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value.slice(0, 120)); setMsgErr(false); }}
                placeholder="What would you like to know?"
                rows={3}
                style={{ width: "100%", background: "#1a1a1a", border: `1px solid ${msgErr ? "#ef4444" : "#2a2a2a"}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                data-testid="input-inquiry-message"
              />
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 2 }}>{message.length}/120</p>
              {msgErr && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 0 }}>Message is required</p>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              style={{ padding: "12px", background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", border: "none", borderRadius: "999px", fontWeight: 700, fontSize: 14, cursor: mutation.isPending ? "not-allowed" : "pointer", opacity: mutation.isPending ? 0.7 : 1 }}
              data-testid="button-submit-ad-inquiry"
            >
              {mutation.isPending ? "Sending…" : "Send Inquiry"}
            </button>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", margin: 0 }}>Your message goes directly to the advertiser.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function RightRailHeroAd() {
  const { data: rawAds = [] } = useQuery<SponsorAd[]>({
    queryKey: ["/api/sponsor-ads", todayDate],
    queryFn: () => fetch(`/api/sponsor-ads?date=${todayDate}`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const ads = rawAds.slice(0, 5);

  const [idx, setIdx] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  const [inquiryAd, setInquiryAd] = useState<SponsorAd | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (len: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (len <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((prev) => (prev + 1) % len);
    }, ROTATION_MS);
  };

  useEffect(() => {
    setIdx(0);
    startTimer(ads.length);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ads.length]);

  if (ads.length === 0) return null;

  const ad = ads[idx % ads.length];
  const hasImgError = imgError[ad.id];
  const fallbackGradient = FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length];
  const isProfileMode = (ad as any).ctaMode === "profile";

  const handleDotClick = (i: number) => {
    setIdx(i);
    startTimer(ads.length);
  };

  const adInner = (
    <>
      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "10px 16px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.4)" }}>
        Sponsored
      </div>

      <div style={{ width: "100%", height: "260px", background: hasImgError ? fallbackGradient : "#1a1a1a", position: "relative", overflow: "hidden" }}>
        {!hasImgError && (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            onError={() => setImgError((prev) => ({ ...prev, [ad.id]: true }))}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {hasImgError && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: fallbackGradient }}>
            <span style={{ fontSize: "48px", opacity: 0.15 }}>📢</span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px", background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }} />
      </div>

      <div style={{ padding: "18px 20px 20px" }}>
        <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#fff", lineHeight: 1.3, marginBottom: "10px", letterSpacing: "-0.01em" }} data-testid={`right-rail-ad-title-${ad.id}`}>
          {ad.title}
        </h3>
        {ad.body && (
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "18px" }} data-testid={`right-rail-ad-body-${ad.id}`}>
            {ad.body}
          </p>
        )}
        <div
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isProfileMode ? "linear-gradient(135deg, #065f46, #047857)" : "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: "13px", padding: "10px 22px", borderRadius: "999px", letterSpacing: "0.02em", boxShadow: isProfileMode ? "0 4px 16px rgba(16,185,129,0.3)" : "0 4px 16px rgba(255,43,43,0.35)" }}
          data-testid={`right-rail-ad-cta-${ad.id}`}
        >
          {isProfileMode && <MessageSquare size={13} />}
          {isProfileMode ? (ad.cta !== "Learn More" ? ad.cta : "Send Inquiry") : ad.cta}
        </div>
        {isProfileMode && (ad as any).contactUsername && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
            @{(ad as any).contactUsername}
          </p>
        )}
      </div>
    </>
  );

  const containerStyle: React.CSSProperties = {
    display: "block",
    borderRadius: "18px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 8px 48px rgba(0,0,0,0.6), 0 2px 12px rgba(255,43,43,0.08)",
    background: "#111",
    textDecoration: "none",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "pointer",
  };

  if (!AD_VISIBLE) return null;

  return (
    <>
      <div
        style={{ position: "fixed", top: "50%", right: "16px", transform: "translateY(-50%)", width: "285px", zIndex: 9999, flexDirection: "column", gap: "0px" }}
        className="gigzito-sponsor-zone hidden xl:flex"
        data-testid="right-rail-ad"
      >
        {isProfileMode ? (
          <div
            style={containerStyle}
            onClick={() => setInquiryAd(ad)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 56px rgba(0,0,0,0.7), 0 4px 16px rgba(16,185,129,0.2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 48px rgba(0,0,0,0.6), 0 2px 12px rgba(255,43,43,0.08)"; }}
            data-testid={`right-rail-ad-link-${ad.id}`}
          >
            {adInner}
          </div>
        ) : (
          <a
            href={ad.targetUrl ?? "#"}
            target={ad.targetUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            style={containerStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 56px rgba(0,0,0,0.7), 0 4px 16px rgba(255,43,43,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 48px rgba(0,0,0,0.6), 0 2px 12px rgba(255,43,43,0.08)"; }}
            data-testid={`right-rail-ad-link-${ad.id}`}
          >
            {adInner}
          </a>
        )}

        {ads.length > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", paddingTop: "12px" }}>
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                style={{ width: i === idx ? "24px" : "8px", height: "8px", borderRadius: "999px", background: i === idx ? "#ff2b2b" : "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s ease" }}
                data-testid={`right-rail-ad-dot-${i}`}
                aria-label={`Switch to ad ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {inquiryAd && (
        <AdInquiryModal ad={inquiryAd} onClose={() => setInquiryAd(null)} />
      )}
    </>
  );
}
