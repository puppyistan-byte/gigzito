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

      if (flashTimerRef.current) clearInterval(flashTimerRef.current);
      flashTimerRef.current = setInterval(() => {
        setFlashCount((c) => {
          if (c <= 1) {
            if (flashTimerRef.current) clearInterval(flashTimerRef.current);
            setPhase("collapsing");
            setTimeout(() => setPhase("siren"), 600);
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
  if (!gj || dismissed || phase === "hidden") return null;

  if (phase === "flash" || phase === "collapsing") {
    return (
      <div
        className={`gigjack-flash-overlay ${phase === "collapsing" ? "gigjack-collapsing" : ""}`}
        data-testid="overlay-gigjack-flash"
      >
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

        <a
          href={gj.ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="gigjack-flash-body"
          data-testid="link-gigjack-offer"
        >
          {gj.artworkUrl && (
            <img
              src={gj.artworkUrl}
              alt={gj.offerTitle}
              className="gigjack-flash-artwork"
              data-testid="img-gigjack-flash-artwork"
            />
          )}
          <div className="gigjack-flash-info">
            {gj.provider?.displayName && (
              <p className="gigjack-flash-provider">{gj.provider.displayName}</p>
            )}
            <h2 className="gigjack-flash-title" data-testid="text-gigjack-flash-title">{gj.offerTitle}</h2>
            {gj.tagline && (
              <p className="gigjack-flash-tagline" data-testid="text-gigjack-flash-tagline">{gj.tagline}</p>
            )}
            <span className="gigjack-flash-cta">
              Tap to claim <ExternalLink size={11} style={{ display: "inline" }} />
            </span>
          </div>
        </a>
      </div>
    );
  }

  if (phase === "siren") {
    return (
      <div className="gigjack-siren-widget" data-testid="widget-gigjack-siren">
        <div className="gigjack-siren-pulse" aria-hidden="true" />
        <div className="gigjack-siren-inner">
          <div className="gigjack-siren-header">
            <Zap className="gigjack-siren-zap" size={12} />
            <span className="gigjack-siren-label">LIVE OFFER</span>
            <button
              className="gigjack-siren-close"
              onClick={() => setDismissed(true)}
              data-testid="button-gigjack-siren-dismiss"
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

  if (phase === "expired") {
    return (
      <div className="gigjack-siren-widget gigjack-siren-expired" data-testid="widget-gigjack-expired">
        <div className="gigjack-siren-inner">
          <div className="gigjack-siren-header">
            <Zap className="gigjack-siren-zap" size={12} />
            <span className="gigjack-siren-label" style={{ color: "#555" }}>OFFER ENDED</span>
          </div>
          <p className="gigjack-expired-msg">This GigJack offer has expired.</p>
        </div>
      </div>
    );
  }

  return null;
}
