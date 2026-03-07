import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, X, ExternalLink } from "lucide-react";
import type { GigJackWithProvider } from "@shared/schema";

const shownIds = new Set<number>();

export function GigJackFlashOverlay() {
  const [current, setCurrent] = useState<GigJackWithProvider | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [shaking, setShaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: active } = useQuery<GigJackWithProvider | null>({
    queryKey: ["/api/gigjacks/active"],
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!active || shownIds.has(active.id)) return;
    shownIds.add(active.id);
    const duration = active.flashDurationSeconds ?? 7;
    setCurrent(active);
    setDismissed(false);
    setCountdown(duration);
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  }, [active?.id]);

  useEffect(() => {
    if (!current || dismissed) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setDismissed(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current?.id, dismissed]);

  if (!current || dismissed) return null;

  return (
    <>
      {shaking && <div className="gigjack-shake-bg" />}
      <div className="gigjack-flash-overlay" data-testid="overlay-gigjack-flash">
        <div className="gigjack-flash-header">
          <div className="gigjack-flash-badge" data-testid="text-gigjack-badge">
            <Zap className="gigjack-flash-zap" />
            <span>GIG JACK</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="gigjack-flash-timer" data-testid="text-gigjack-countdown">{countdown}s</span>
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
          href={current.ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="gigjack-flash-body"
          data-testid="link-gigjack-offer"
        >
          {current.artworkUrl && (
            <img
              src={current.artworkUrl}
              alt={current.offerTitle}
              className="gigjack-flash-artwork"
              data-testid="img-gigjack-flash-artwork"
            />
          )}
          <div className="gigjack-flash-info">
            {current.provider?.displayName && (
              <p className="gigjack-flash-provider">{current.provider.displayName}</p>
            )}
            <h2 className="gigjack-flash-title" data-testid="text-gigjack-flash-title">{current.offerTitle}</h2>
            {current.tagline && (
              <p className="gigjack-flash-tagline" data-testid="text-gigjack-flash-tagline">{current.tagline}</p>
            )}
            <span className="gigjack-flash-cta">
              Tap to claim <ExternalLink size={11} style={{ display: "inline" }} />
            </span>
          </div>
        </a>
      </div>
    </>
  );
}
