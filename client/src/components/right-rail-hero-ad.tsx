import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SponsorAd } from "@shared/schema";

const ROTATION_MS = 25_000;

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #1a0a0a 0%, #3d0000 50%, #1a0a0a 100%)",
  "linear-gradient(135deg, #0a0a1a 0%, #00003d 50%, #0a0a1a 100%)",
  "linear-gradient(135deg, #0a1a0a 0%, #003d00 50%, #0a1a0a 100%)",
];

export function RightRailHeroAd() {
  const { data: ads = [] } = useQuery<SponsorAd[]>({
    queryKey: ["/api/sponsor-ads"],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const [idx, setIdx] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
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

  const handleDotClick = (i: number) => {
    setIdx(i);
    startTimer(ads.length);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        right: "11%",
        transform: "translateY(-50%)",
        width: "380px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0px",
      }}
      className="gigzito-sponsor-zone"
      data-testid="right-rail-ad"
    >
      <a
        href={ad.targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.6), 0 2px 12px rgba(255,43,43,0.08)",
          background: "#111",
          textDecoration: "none",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 56px rgba(0,0,0,0.7), 0 4px 16px rgba(255,43,43,0.15)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 48px rgba(0,0,0,0.6), 0 2px 12px rgba(255,43,43,0.08)";
        }}
        data-testid={`right-rail-ad-link-${ad.id}`}
      >
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
            style={{ display: "inline-block", background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: "13px", padding: "10px 22px", borderRadius: "999px", letterSpacing: "0.02em", boxShadow: "0 4px 16px rgba(255,43,43,0.35)" }}
            data-testid={`right-rail-ad-cta-${ad.id}`}
          >
            {ad.cta}
          </div>
        </div>
      </a>

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
  );
}
