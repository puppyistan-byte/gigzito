import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { VideoCard } from "@/components/video-card";
import { MiniLivePlayer } from "@/components/mini-live-player";
import { AllEyesBanner } from "@/components/all-eyes-banner";
import { RightRailHeroAd } from "@/components/right-rail-hero-ad";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListingWithProvider } from "@shared/schema";
import { ChevronUp, ChevronDown, Zap, Menu, X, Eye, Layers, Flame, CreditCard, Music, Trophy, Users, Smartphone, Shield, Copy, Check, ExternalLink, Download } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import gzLogo from "@assets/gz_logo_1774147866824.png";

const CATEGORIES = [
  { key: "ALL",           label: "All Videos" },
  { key: "LAIH",         label: "LAIH" },
  { key: "RANDOMNESS",   label: "Randomness" },
  { key: "HEALTH",       label: "Health" },
  { key: "SCIENCE",      label: "Science" },
  { key: "RANTS",        label: "Rants" },
  { key: "MUSIC",        label: "Music" },
  { key: "MUSIC_GIGS",   label: "Music Gigs" },
  { key: "EVENTS",       label: "Events" },
  { key: "INFLUENCERS",  label: "Influencers" },
  { key: "MARKETING",    label: "Marketing" },
  { key: "COURSES",      label: "Courses" },
  { key: "PRODUCTS",     label: "Products" },
  { key: "CRYPTO",       label: "Crypto" },
  { key: "ARTISTS",      label: "Artists/Arts" },
  { key: "BUSINESS",     label: "Business" },
  { key: "FLASH_SALE",   label: "Flash Sale" },
  { key: "FLASH_COUPONS",label: "Flash Coupons" },
];

import logoImg from "@assets/gigzito-logo-tight_1772926617316.png";

function readPersistedMuted(): boolean {
  try { return localStorage.getItem("gz_muted") !== "false"; } catch { return true; }
}
function persistMuted(v: boolean) {
  try { localStorage.setItem("gz_muted", String(v)); } catch {}
}

export default function HomePage() {
  const [activeVertical, setActiveVertical] = useState("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [showApkDialog, setShowApkDialog] = useState(false);
  const [apkHash, setApkHash] = useState<string | null>(null);
  const [hashCopied, setHashCopied] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch APK SHA256 when dialog opens
  useEffect(() => {
    if (!showApkDialog || apkHash) return;
    fetch("https://gigzito.com/ota-dist/android/gigzito.apk.sha256")
      .then(r => { if (!r.ok) throw new Error(); return r.text(); })
      .then(t => setApkHash(t.trim().split(/\s+/)[0]))
      .catch(() => setApkHash("unavailable"));
  }, [showApkDialog, apkHash]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setCatOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Global muted state — persisted in localStorage and shared across all cards
  const [globalMuted, setGlobalMuted] = useState<boolean>(readPersistedMuted);
  const globalMutedRef = useRef(globalMuted);
  const handleMuteChange = useCallback((muted: boolean) => {
    globalMutedRef.current = muted;
    setGlobalMuted(muted);
    persistMuted(muted);
    // When the feed unmutes, tell ZitoTV pop-out to mute itself
    if (!muted) {
      window.dispatchEvent(new CustomEvent("feed-unmuted"));
    }
  }, []);

  // User-controlled pause/play via the GZ logo button
  const [userPaused, setUserPaused] = useState(false);
  // Reset user-pause when they scroll to a new video
  useEffect(() => { setUserPaused(false); }, [currentIndex]);

  // Pauses + mutes the main feed when ZitoTV live audio turns on
  const [feedPaused, setFeedPaused] = useState(false);
  const feedPausedRef = useRef(false);
  useEffect(() => {
    const handleUnmuted = () => {
      feedPausedRef.current = true;
      setFeedPaused(true);
      // Also mute the feed so both sources can't play audio simultaneously
      handleMuteChange(true);
    };
    const handleFocused = () => {
      // ZitoTV popped out — pause the feed video (audio unchanged, ZitoTV starts muted)
      feedPausedRef.current = true;
      setFeedPaused(true);
    };
    const handleClosed = () => {
      // ZitoTV returned to normal — resume the feed
      feedPausedRef.current = false;
      setFeedPaused(false);
    };
    window.addEventListener("zitotv-unmuted", handleUnmuted);
    window.addEventListener("zitotv-focused", handleFocused);
    window.addEventListener("zitotv-closed", handleClosed);
    return () => {
      window.removeEventListener("zitotv-unmuted", handleUnmuted);
      window.removeEventListener("zitotv-focused", handleFocused);
      window.removeEventListener("zitotv-closed", handleClosed);
    };
  }, [handleMuteChange]);

  const feedRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeSplash(true);
      setTimeout(() => setShowSplash(false), 500);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const { data: listings = [], isLoading } = useQuery<ListingWithProvider[]>({
    queryKey: ["/api/listings", activeVertical],
    queryFn: async () => {
      const url = activeVertical === "ALL" ? "/api/listings" : `/api/listings?vertical=${activeVertical}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const listingIds = listings.map((l) => l.id);
  const { data: userCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/stats/user-count"],
    staleTime: 60_000,
  });
  const userCount = userCountData?.count ?? 0;

  const { data: batchLikes = {}, isFetched: batchFetched } = useQuery<Record<number, boolean>>({
    queryKey: ["/api/videos/likes/batch", listingIds.join(",")],
    queryFn: async () => {
      if (listingIds.length === 0) return {};
      const res = await fetch(`/api/videos/likes/batch?ids=${listingIds.join(",")}`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: listingIds.length > 0,
    staleTime: 30_000,
  });

  // Refs that are always current — used inside wheel handler without stale closure
  const wheelCooldown   = useRef(false);
  const currentIdxRef   = useRef(0);
  const listingsLenRef  = useRef(0);
  const isScrollingRef  = useRef(false);

  useEffect(() => { listingsLenRef.current = listings.length; }, [listings]);

  // Programmatic scroll: set scrollTop directly so the snap math is exact
  const scrollToIndex = useCallback((idx: number, opts: { instant?: boolean } = {}) => {
    const container = feedRef.current;
    if (!container) return;
    const h = container.clientHeight;
    if (h === 0) return;
    const clamped = Math.max(0, Math.min(idx, listingsLenRef.current - 1));
    currentIdxRef.current = clamped;
    setCurrentIndex(clamped);
    isScrollingRef.current = true;
    if (opts.instant) {
      container.scrollTop = clamped * h;
      setTimeout(() => { isScrollingRef.current = false; }, 100);
    } else {
      container.scrollTo({ top: clamped * h, behavior: "smooth" });
      setTimeout(() => { isScrollingRef.current = false; }, 600);
    }
    // When user explicitly navigates to a new card, resume the feed
    if (feedPausedRef.current) {
      feedPausedRef.current = false;
      setFeedPaused(false);
      handleMuteChange(false);
    }
  }, []);

  // Wheel handler on window — intercepts before iframes can swallow events
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".category-strip") || target?.closest(".category-track")) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();

      if (wheelCooldown.current) return;
      wheelCooldown.current = true;
      // Cooldown slightly longer than the smooth-scroll animation (~600ms)
      setTimeout(() => { wheelCooldown.current = false; }, 700);

      const cur  = currentIdxRef.current;
      const len  = listingsLenRef.current;
      const next = e.deltaY > 0 ? (cur >= len - 1 ? 0 : cur + 1) : Math.max(cur - 1, 0);
      if (next !== cur || cur >= len - 1) scrollToIndex(next);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [scrollToIndex]);

  // Touch swipe handler for mobile
  useEffect(() => {
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".category-strip") || target?.closest(".category-track")) return;
      const diff = startY - e.changedTouches[0].clientY;
      if (Math.abs(diff) < 40) return; // minimum swipe distance
      if (wheelCooldown.current) return;
      wheelCooldown.current = true;
      setTimeout(() => { wheelCooldown.current = false; }, 700);
      const cur  = currentIdxRef.current;
      const len  = listingsLenRef.current;
      const next = diff > 0 ? (cur >= len - 1 ? 0 : cur + 1) : Math.max(cur - 1, 0);
      if (next !== cur || cur >= len - 1) scrollToIndex(next);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [scrollToIndex]);

  useEffect(() => {
    document.body.classList.add("feed-active");
    return () => document.body.classList.remove("feed-active");
  }, []);

  // Reset to top whenever the vertical changes
  useEffect(() => {
    currentIdxRef.current = 0;
    setCurrentIndex(0);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [activeVertical]);

  const categoryBgClass: Record<string, string> = {
    ALL:             "cat-bg-all",
    MARKETING:       "cat-bg-marketing",
    MUSIC:           "cat-bg-music",
    MUSIC_GIGS:      "cat-bg-music",
    CRYPTO:          "cat-bg-crypto",
    COACHING:        "cat-bg-coaching",
    COURSES:         "cat-bg-courses",
    EVENTS:          "cat-bg-events",
    INFLUENCERS:     "cat-bg-influencers",
    INFLUENCER:      "cat-bg-influencers",
    CORPORATE_DEALS: "cat-bg-corporate",
    ARTISTS:         "cat-bg-music",
    BUSINESS:        "cat-bg-corporate",
    FLASH_SALE:      "cat-bg-flash",
    FLASH_COUPONS:   "cat-bg-flash",
    FLASH_COUPON:    "cat-bg-flash",
    PRODUCTS:        "cat-bg-marketing",
    LAIH:            "cat-bg-influencers",
    RANDOMNESS:      "cat-bg-events",
    HEALTH:          "cat-bg-coaching",
    SCIENCE:         "cat-bg-crypto",
    RANTS:           "cat-bg-flash",
  };
  const activeBgClass = categoryBgClass[activeVertical] ?? "cat-bg-all";

  return (
    <div className="app-shell flex flex-col h-screen overflow-hidden relative">
      <Navbar />

      {/* ── APK Security Dialog ── */}
      {showApkDialog && (
        <div
          onClick={() => setShowApkDialog(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#111", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px", width: "100%", maxWidth: "400px",
              overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg,rgba(74,222,128,0.15),rgba(16,185,129,0.08))",
              borderBottom: "1px solid rgba(74,222,128,0.15)",
              padding: "20px 20px 16px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "10px",
                  background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Shield style={{ width: 20, height: 20, color: "#4ade80" }} />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>Verify Before Installing</div>
                  <div style={{ fontSize: "11px", color: "rgba(74,222,128,0.7)", marginTop: 2 }}>Gigzito Android Beta · APK</div>
                </div>
              </div>
              <button
                onClick={() => setShowApkDialog(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X style={{ width: 18, height: 18, color: "rgba(255,255,255,0.4)" }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px" }}>

              {/* SHA256 section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  SHA-256 Fingerprint
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px", padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <code style={{
                    flex: 1, fontSize: "10px", color: apkHash === "unavailable" ? "#f87171" : "#4ade80",
                    wordBreak: "break-all", lineHeight: 1.5, fontFamily: "monospace",
                  }}>
                    {apkHash === null ? "Fetching…" : apkHash === "unavailable" ? "Hash not yet available — APK not uploaded" : apkHash}
                  </code>
                  {apkHash && apkHash !== "unavailable" && apkHash !== null && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(apkHash);
                        setHashCopied(true);
                        setTimeout(() => setHashCopied(false), 2000);
                      }}
                      data-testid="button-copy-apk-hash"
                      style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 4 }}
                    >
                      {hashCopied
                        ? <Check style={{ width: 14, height: 14, color: "#4ade80" }} />
                        : <Copy style={{ width: 14, height: 14, color: "rgba(255,255,255,0.4)" }} />}
                    </button>
                  )}
                </div>
                {apkHash && apkHash !== "unavailable" && (
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: 6, lineHeight: 1.5 }}>
                    After downloading, verify on device: <code style={{ color: "rgba(74,222,128,0.6)" }}>sha256sum gigzito.apk</code>
                  </div>
                )}
              </div>

              {/* VirusTotal link */}
              {apkHash && apkHash !== "unavailable" && apkHash !== null && (
                <a
                  href={`https://www.virustotal.com/gui/file/${apkHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-virustotal-apk"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", borderRadius: "8px",
                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                    textDecoration: "none", marginBottom: 16,
                  }}
                >
                  <Shield style={{ width: 13, height: 13, color: "#60a5fa", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: "12px", color: "#93c5fd", fontWeight: 600 }}>Check on VirusTotal</span>
                  <ExternalLink style={{ width: 11, height: 11, color: "rgba(96,165,250,0.5)", flexShrink: 0 }} />
                </a>
              )}

              {/* What to expect note */}
              <div style={{
                background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)",
                borderRadius: "8px", padding: "10px 12px", marginBottom: 20,
              }}>
                <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 600, marginBottom: 4 }}>Beta Install Tips</div>
                <ul style={{ margin: 0, paddingLeft: 14, fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  <li>Enable "Install unknown apps" in Settings → Security</li>
                  <li>Android may warn about unknown sources — this is normal for sideloaded APKs</li>
                  <li>Always verify the hash above matches after download</li>
                </ul>
              </div>

              {/* Download button */}
              <button
                onClick={() => {
                  window.open("https://gigzito.com/ota-dist/android/gigzito.apk", "_blank", "noopener,noreferrer");
                  setShowApkDialog(false);
                }}
                data-testid="button-download-apk-confirmed"
                style={{
                  width: "100%", padding: "13px", borderRadius: "10px", border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Download style={{ width: 15, height: 15, color: "#fff" }} />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>Download APK</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GZGroups top-right button */}
      <button
        onClick={() => navigate("/groups")}
        data-testid="button-gzgroups-topbar"
        style={{
          position: "fixed",
          top: 10,
          right: 168,
          zIndex: 9997,
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(0,10,30,0.70)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(59,130,246,0.45)",
          borderRadius: "999px",
          padding: "6px 12px",
          cursor: "pointer",
          color: "#60a5fa",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 10px rgba(59,130,246,0.18)",
        }}
      >
        <Users style={{ width: 12, height: 12 }} />
        GZGroups
      </button>

      {/* Most Loved top-right button */}
      <button
        onClick={() => navigate("/most-loved")}
        data-testid="button-most-loved-topbar"
        style={{
          position: "fixed",
          top: 10,
          right: 60,
          zIndex: 9997,
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(10,0,0,0.70)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,43,43,0.45)",
          borderRadius: "999px",
          padding: "6px 12px",
          cursor: "pointer",
          color: "#ff2b2b",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 10px rgba(255,43,43,0.18)",
        }}
      >
        <Trophy style={{ width: 12, height: 12 }} />
        Most Loved
      </button>

      <div className={`category-bg ${activeBgClass}`} aria-hidden="true" />

      {showSplash && (
        <div className={`splash-screen ${fadeSplash ? 'fade-out' : ''}`}>
          <img src={logoImg} alt="Gigzito" className="splash-logo" />
        </div>
      )}

      <div className="gigzito-logo-container">
        <img src={logoImg} alt="Gigzito" className="gigzito-logo-img" />
      </div>

      <MiniLivePlayer />

      {/* ── Hamburger menu ── */}
      <div ref={menuRef} style={{ position: "fixed", top: 10, left: 12, zIndex: 9998 }}>
        {/* Top bar row: hamburger + quick links */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            data-testid="button-hamburger-menu"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, #ff2b2b, #cc0000)",
              border: "none",
              borderRadius: "999px",
              padding: "7px 13px 7px 11px",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(255,43,43,0.45)",
            }}
          >
            {menuOpen
              ? <X style={{ width: 15, height: 15, color: "#fff" }} />
              : <Menu style={{ width: 15, height: 15, color: "#fff" }} />
            }
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}>
              {menuOpen ? "Close" : (CATEGORIES.find(c => c.key === activeVertical)?.label ?? "All Videos")}
            </span>
          </button>

          <button
            onClick={() => navigate("/pricing")}
            data-testid="button-topbar-pricing"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "linear-gradient(135deg, #ff2b2b, #cc0000)",
              border: "none",
              borderRadius: "999px",
              padding: "7px 13px",
              cursor: "pointer",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(255,43,43,0.45)",
            }}
          >
            <Layers style={{ width: 12, height: 12, color: "#fff" }} />
            Tiers
          </button>

          <button
            onClick={() => navigate("/keeping-it-geezee")}
            data-testid="button-topbar-geezee"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "linear-gradient(135deg, #ff2b2b, #cc0000)",
              border: "none",
              borderRadius: "999px",
              padding: "7px 13px",
              cursor: "pointer",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(255,43,43,0.45)",
            }}
          >
            <Flame style={{ width: 12, height: 12, color: "#fff" }} />
            Keeping it Geezee
          </button>

          <button
            onClick={() => navigate("/geezees")}
            data-testid="button-topbar-geezee-cards"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "linear-gradient(135deg, #7c3aed, #4f1eb8)",
              border: "none",
              borderRadius: "999px",
              padding: "7px 13px",
              cursor: "pointer",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(124,58,237,0.45)",
            }}
          >
            <CreditCard style={{ width: 12, height: 12, color: "#fff" }} />
            GeeZee Cards
          </button>

          <button
            onClick={() => navigate("/offer-center")}
            data-testid="button-topbar-advertise"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
              border: "none",
              borderRadius: "999px",
              padding: "7px 13px",
              cursor: "pointer",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(29,78,216,0.5)",
            }}
          >
            <Zap style={{ width: 12, height: 12, color: "#fff" }} />
            GZFlash Sales
          </button>

          <button
            onClick={() => navigate("/gz-music")}
            data-testid="button-topbar-gz-music"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "linear-gradient(135deg, #ff7a00, #cc5200)",
              border: "none",
              borderRadius: "999px",
              padding: "7px 13px",
              cursor: "pointer",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(255,122,0,0.5)",
            }}
          >
            <Music style={{ width: 12, height: 12, color: "#fff" }} />
            GZMusic
          </button>
        </div>

        {/* Dropdown panel */}
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 220,
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
            background: "rgba(10,10,10,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            backdropFilter: "blur(20px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            padding: "6px 0",
            transformOrigin: "top left",
            transform: menuOpen ? "scale(1)" : "scale(0.92)",
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? "auto" : "none",
            transition: "transform 0.18s ease, opacity 0.18s ease",
          }}
          data-testid="category-menu-panel"
        >
          {/* ── Get the App — always first ── */}
          <button
            onClick={() => { setMenuOpen(false); setApkHash(null); setShowApkDialog(true); }}
            data-testid="button-menu-get-the-app"
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              width: "100%", padding: "9px 16px",
              background: "rgba(74,222,128,0.10)", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.18)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.10)"; }}
          >
            <Smartphone style={{ width: 13, height: 13, color: "#4ade80", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#4ade80", letterSpacing: "0.01em" }}>Get the App</span>
              <span style={{ fontSize: "9px", color: "rgba(74,222,128,0.55)", letterSpacing: "0.02em" }}>Android Beta · APK download</span>
            </div>
          </button>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

          {/* ── Nav links ── */}
          <button
            onClick={() => { setMenuOpen(false); navigate("/all-eyes-on-me"); }}
            data-testid="button-all-eyes-on-me"
            style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "9px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,43,43,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Eye style={{ width: 13, height: 13, color: "#ff2b2b", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#ff2b2b", letterSpacing: "0.01em" }}>All Eyes On Me</span>
          </button>

          <button
            onClick={() => { setMenuOpen(false); navigate("/pricing"); }}
            data-testid="button-menu-pricing"
            style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "9px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Layers style={{ width: 13, height: 13, color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: "0.01em" }}>Membership Tiers</span>
          </button>

          <button
            onClick={() => { setMenuOpen(false); navigate("/keeping-it-geezee"); }}
            data-testid="button-menu-keeping-it-geezee"
            style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "9px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Flame style={{ width: 13, height: 13, color: "#f59e0b", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#f59e0b", letterSpacing: "0.01em" }}>Keeping it Geezee</span>
          </button>

          <button
            onClick={() => { setMenuOpen(false); navigate("/gz-music"); }}
            data-testid="button-menu-gz-music"
            style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "9px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,122,0,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Music style={{ width: 13, height: 13, color: "#ff7a00", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#ff7a00", letterSpacing: "0.01em" }}>GZMusic · GZ100</span>
          </button>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

          {/* ── Categories collapsible — at the bottom ── */}
          <button
            onClick={() => setCatOpen((o) => !o)}
            data-testid="button-menu-categories-toggle"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "9px 16px",
              background: "rgba(255,43,43,0.06)", border: "none", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ff2b2b", flexShrink: 0 }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#ff2b2b" }}>
                {CATEGORIES.find(c => c.key === activeVertical)?.label ?? "All Videos"}
              </span>
            </div>
            <ChevronDown style={{
              width: 13, height: 13, color: "#ff2b2b", flexShrink: 0,
              transform: catOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.18s ease",
            }} />
          </button>

          {catOpen && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {CATEGORIES.map(({ key, label }) => {
                const isActive = activeVertical === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setActiveVertical(key); setCatOpen(false); setMenuOpen(false); }}
                    data-testid={`cat-tab-${key.toLowerCase()}`}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      width: "100%", padding: "8px 16px 8px 28px",
                      background: isActive ? "rgba(255,43,43,0.10)" : "transparent",
                      border: "none", cursor: "pointer", textAlign: "left",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? "rgba(255,43,43,0.10)" : "transparent"; }}
                  >
                    {isActive && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ff2b2b", flexShrink: 0 }} />}
                    {!isActive && <span style={{ width: 3, flexShrink: 0 }} />}
                    <span style={{ fontSize: "12px", fontWeight: isActive ? 700 : 400, color: isActive ? "#ff2b2b" : "rgba(255,255,255,0.65)" }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AllEyesBanner />

      {/* Feed — no onScroll handler; index is driven by wheel/touch/button, not scroll position */}
      <div
        ref={feedRef}
        className="feed-wrap feed-container flex-1"
        style={{
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          height: "calc(100dvh - 140px)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        data-testid="feed-container"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="space-y-4 w-full max-w-2xl mx-auto px-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-96 w-full bg-white/10 rounded-md" />
              ))}
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div className="text-white/50 space-y-2">
              <p className="text-2xl font-bold">No listings yet</p>
              <p className="text-sm">Be the first to post a video in {activeVertical === "ALL" ? "any vertical" : activeVertical.toLowerCase()}!</p>
            </div>
          </div>
        ) : (
          listings.map((listing, idx) => (
            <div
              key={listing.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              className="feed-item"
              style={{
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                position: "relative",
                width: "100%",
                maxWidth: "420px",
                height: "calc(100dvh - 140px)",
                flexShrink: 0,
              }}
              data-testid={`listing-item-${idx}`}
            >
              <VideoCard
                listing={listing}
                className="w-full h-full"
                isActive={idx === currentIndex && !feedPaused && !userPaused}
                isMuted={globalMuted}
                onMuteChange={handleMuteChange}
                initialIsLiked={batchFetched ? (batchLikes[listing.id] ?? false) : undefined}
                suppressLikeQuery={listingIds.length > 0}
                onEnd={() => {
                  scrollToIndex(idx < listings.length - 1 ? idx + 1 : 0, { instant: true });
                }}
              />

              {/* GZ Logo — transparent pause/play button, only on the active card */}
              {idx === currentIndex && !feedPaused && (
                <button
                  onClick={() => setUserPaused((p) => !p)}
                  data-testid="button-feed-pause-play"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 25,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    transition: "opacity 0.25s ease, transform 0.2s ease",
                    opacity: userPaused ? 0.85 : 0.18,
                  }}
                  onMouseEnter={(e) => { if (!userPaused) (e.currentTarget as HTMLButtonElement).style.opacity = "0.38"; }}
                  onMouseLeave={(e) => { if (!userPaused) (e.currentTarget as HTMLButtonElement).style.opacity = "0.18"; }}
                  aria-label={userPaused ? "Play" : "Pause"}
                >
                  <div style={{ position: "relative", width: 100, height: 100 }}>
                    <img
                      src={gzLogo}
                      alt="GZ"
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        objectFit: "cover",
                        filter: userPaused
                          ? "drop-shadow(0 0 18px rgba(255,43,43,0.75))"
                          : "drop-shadow(0 0 6px rgba(255,43,43,0.3))",
                        transition: "filter 0.25s ease",
                      }}
                    />
                    {/* Pause bars overlay when playing, play triangle when paused */}
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: userPaused ? "rgba(0,0,0,0.45)" : "transparent",
                      borderRadius: "50%",
                      border: userPaused ? "2.5px solid rgba(255,43,43,0.8)" : "none",
                      transition: "all 0.25s ease",
                    }}>
                      {userPaused ? (
                        /* Play triangle */
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 3 }}>
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      ) : (
                        /* Pause bars — subtle */
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)">
                          <rect x="5" y="4" width="4" height="16" rx="1" />
                          <rect x="15" y="4" width="4" height="16" rx="1" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              )}

              {feedPaused && idx === currentIndex && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                  data-testid="feed-paused-overlay"
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 64, height: 64, background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.45)" }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                      <rect x="5" y="4" width="4" height="16" rx="1" />
                      <rect x="15" y="4" width="4" height="16" rx="1" />
                    </svg>
                  </div>
                  <p className="text-white text-sm font-semibold text-center px-6" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    Live audio is on
                  </p>
                  <p className="text-white/70 text-xs text-center px-8" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    Scroll to the next video to resume
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav activeVertical={activeVertical} onVerticalChange={setActiveVertical} />

      {/* Nav arrows (desktop) */}
      {listings.length > 1 && (
        <div className="fixed right-4 bottom-[140px] flex flex-col gap-2 z-40">
          <button
            data-testid="button-scroll-up"
            onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="h-9 w-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-all"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            data-testid="button-scroll-down"
            onClick={() => scrollToIndex(currentIndex >= listings.length - 1 ? 0 : currentIndex + 1)}
            disabled={false}
            className="h-9 w-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-all"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}



      {/* Registered user count badge — bottom-right */}
      <button
        data-testid="button-user-count"
        title={`${userCount.toLocaleString()} registered users`}
        className="fixed bottom-20 right-4 z-50 h-10 w-10 rounded-full bg-[#ff2b2b]/20 hover:bg-[#ff2b2b]/35 border border-[#ff2b2b]/60 hover:border-[#ff2b2b] backdrop-blur-sm flex items-center justify-center transition-colors cursor-default"
      >
        <span className="text-white font-bold leading-none" style={{ fontSize: userCount >= 1000 ? "9px" : "11px" }}>
          {userCount >= 1000 ? `${(userCount / 1000).toFixed(1)}k` : userCount || "—"}
        </span>
      </button>

      <RightRailHeroAd />
    </div>
  );
}

