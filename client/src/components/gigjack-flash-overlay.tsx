import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, X, ExternalLink, Clock } from "lucide-react";
import type { GigJackLiveState } from "@shared/schema";

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function triggerSeismicShake() {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  shell.classList.remove("gigjack-seismic-active");
  void (shell as HTMLElement).offsetWidth;
  shell.classList.add("gigjack-seismic-active");
  setTimeout(() => shell.classList.remove("gigjack-seismic-active"), 900);
}

export function GigJackFlashOverlay() {
  const [phase, setPhase] = useState<"hidden" | "flash" | "collapsing" | "siren" | "expired">("hidden");
  const [flashCount, setFlashCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [offerMsLeft, setOfferMsLeft] = useState<number | null>(null);
  const [lastId, setLastId] = useState<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: state } = useQuery<GigJackLiveState>({
    queryKey: ["/api/gigjacks/live-state"],
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!state || state.phase === "hidden" || !state.gj) return;

    const gj = state.gj;

    if (gj.id !== lastId) {
      setLastId(gj.id);
      setDismissed(false);
    }

    if (dismissed) return;

    if (state.phase === "flash") {
      if (phase === "flash" || phase === "collapsing") return;
      const duration = state.flashSecondsRemaining ?? 7;
      setPhase("flash");
      setFlashCount(duration);

      triggerSeismicShake();

      if (flashTimerRef.current) clearInterval(flashTimerRef.current);
      flashTimerRef.current = setInterval(() => {
        setFlashCount((c) => {
          if (c <= 1) {
            if (flashTimerRef.current) clearInterval(flashTimerRef.current);
            setPhase("collapsing");
            setTimeout(() => setPhase("siren"), 650);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }

    if (state.phase === "siren") {
      if (phase !== "siren") setPhase("siren");
      if (state.offerEndsAt) {
        const ms = new Date(state.offerEndsAt).getTime() - Date.now();
        setOfferMsLeft(Math.max(0, ms));
        if (offerTimerRef.current) clearInterval(offerTimerRef.current);
        offerTimerRef.current = setInterval(() => {
          setOfferMsLeft((prev) => {
            if (prev === null) return null;
            if (prev <= 1000) {
              if (offerTimerRef.current) clearInterval(offerTimerRef.current);
              setPhase("expired");
              setTimeout(() => setPhase("hidden"), 3000);
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);
      }
    }

    if (state.phase === "expired") {
      setPhase("expired");
      setTimeout(() => setPhase("hidden"), 3000);
    }
  }, [state?.phase, state?.gj?.id, dismissed]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearInterval(flashTimerRef.current);
      if (offerTimerRef.current) clearInterval(offerTimerRef.current);
    };
  }, []);

  const gj = state?.gj;
  const isIdle = !gj || dismissed || phase === "hidden";

  /* ── Full-page takeover (flash phase) ──────────────────────────────────── */
  if ((phase === "flash" || phase === "collapsing") && gj) {
    return (
      <div
        className={`gigjack-flash-overlay${phase === "collapsing" ? " gigjack-collapsing" : ""}`}
        data-testid="overlay-gigjack-flash"
      >
        <div className="gigjack-flash-card" data-testid="card-gigjack-takeover">

          {/* Header bar */}
          <div className="gigjack-flash-header">
            <div className="gigjack-flash-badge" data-testid="text-gigjack-badge">
              <Zap className="gigjack-flash-zap" />
              <span>GIG JACK</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="gigjack-flash-timer" data-testid="text-gigjack-countdown">{flashCount}s</span>
              <button
                className="gigjack-flash-close"
                onClick={() => setDismissed(true)}
                data-testid="button-gigjack-dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Brand artwork — full width banner */}
          {gj.artworkUrl && (
            <img
              src={gj.artworkUrl}
              alt={gj.offerTitle}
              className="gigjack-flash-artwork"
              data-testid="img-gigjack-flash-artwork"
            />
          )}

          {/* Offer info */}
          <div className="gigjack-flash-info">
            {gj.provider?.displayName && (
              <p className="gigjack-flash-provider">{gj.provider.displayName}</p>
            )}
            <h2 className="gigjack-flash-title" data-testid="text-gigjack-flash-title">{gj.offerTitle}</h2>
            {gj.tagline && (
              <p className="gigjack-flash-tagline" data-testid="text-gigjack-flash-tagline">{gj.tagline}</p>
            )}
          </div>

          {/* Big red CTA */}
          <a
            href={gj.ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="gigjack-flash-cta-btn"
            data-testid="link-gigjack-offer"
          >
            Claim This Offer <ExternalLink size={14} />
          </a>

        </div>
      </div>
    );
  }

  /* ── Siren widget — persistent Live Offer module ────────────────────────── */
  if (phase === "siren" && gj && !dismissed) {
    return (
      <div className="gigjack-siren-widget" data-testid="widget-gigjack-siren">
        <div className="gigjack-siren-pulse" aria-hidden="true" />
        <div className="gigjack-siren-inner">
          <div className="gigjack-siren-header">
            <Zap className="gigjack-siren-zap" size={12} />
            <span className="gigjack-siren-label">LIVE OFFER</span>
            <div className="gigjack-beacon gigjack-beacon-active" aria-hidden="true" />
            <button
              className="gigjack-siren-close"
              onClick={() => setDismissed(true)}
              data-testid="button-gigjack-siren-dismiss"
              style={{ marginLeft: "6px" }}
            >
              <X size={10} />
            </button>
          </div>

          <a
            href={gj.ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="gigjack-siren-body"
            data-testid="link-gigjack-siren-offer"
          >
            {gj.artworkUrl && (
              <img
                src={gj.artworkUrl}
                alt={gj.offerTitle}
                className="gigjack-siren-thumb"
                data-testid="img-gigjack-siren-artwork"
              />
            )}
            <div className="gigjack-siren-info">
              <p className="gigjack-siren-title" data-testid="text-gigjack-siren-title">{gj.offerTitle}</p>
              {gj.provider?.displayName && (
                <p className="gigjack-siren-brand">{gj.provider.displayName}</p>
              )}
            </div>
          </a>

          {offerMsLeft !== null && (
            <div className="gigjack-siren-countdown" data-testid="text-gigjack-siren-countdown">
              <Clock size={10} className="gigjack-siren-clock" />
              <span>{formatCountdown(offerMsLeft)}</span>
            </div>
          )}

          <a
            href={gj.ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="gigjack-siren-cta"
            data-testid="link-gigjack-siren-cta"
          >
            Claim Offer <ExternalLink size={9} style={{ display: "inline" }} />
          </a>
        </div>
      </div>
    );
  }

  /* ── Expired state ──────────────────────────────────────────────────────── */
  if (phase === "expired" && !isIdle) {
    return (
      <div className="gigjack-siren-widget gigjack-siren-expired" data-testid="widget-gigjack-expired">
        <div className="gigjack-siren-inner">
          <div className="gigjack-siren-header">
            <Zap className="gigjack-siren-zap" size={12} />
            <span className="gigjack-siren-label" style={{ color: "rgba(255,43,43,0.45)" }}>OFFER ENDED</span>
          </div>
          <p className="gigjack-expired-msg">This GigJack offer has expired.</p>
        </div>
      </div>
    );
  }

  /* ── Idle / always-visible placeholder ─────────────────────────────────── */
  return (
    <div className="gigjack-siren-widget gigjack-siren-idle" data-testid="widget-gigjack-idle">
      <div className="gigjack-siren-inner">
        <div className="gigjack-siren-header">
          <Zap className="gigjack-siren-zap" size={12} />
          <span className="gigjack-siren-label">GIG JACK</span>
          <div className="gigjack-beacon gigjack-beacon-idle" aria-hidden="true" />
        </div>
        <div className="gigjack-idle-body" data-testid="gigjack-idle-placeholder">
          <div className="gigjack-idle-icon" aria-hidden="true">
            <Zap size={18} style={{ color: "#ff2b2b" }} />
          </div>
          <p className="gigjack-idle-title">No Active Offers</p>
          <p className="gigjack-idle-sub">Next GigJack will appear here</p>
        </div>
      </div>
    </div>
  );
}
