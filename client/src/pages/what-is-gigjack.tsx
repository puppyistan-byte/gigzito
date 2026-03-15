import { Link } from "wouter";
import { ArrowLeft, Zap, Users, BarChart3, Globe, Radio, TrendingUp, Clock } from "lucide-react";
import MoreBelow from "@/components/more-below";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "A brand books a GigJack slot",
    body: "Using the GigJack calendar, a brand picks a date and hour. Slots are capped at 2 per hour — first come, first served after admin approval.",
    icon: Clock,
    color: "#ff2b2b",
  },
  {
    step: "02",
    title: "GZMetrics surfaces high-volume windows",
    body: "The platform analyzes peak traffic hours across all verticals and surfaces the best windows to GZMarketerPro users — so brands know exactly when the audience is largest.",
    icon: BarChart3,
    color: "#f59e0b",
  },
  {
    step: "03",
    title: "The flash fires — the whole site is yours",
    body: "At the scheduled moment, every active Gigzito user sees a full-screen brand takeover. Your artwork, your offer, your countdown — for up to 60 seconds.",
    icon: Radio,
    color: "#ff2b2b",
  },
  {
    step: "04",
    title: "The siren keeps it alive",
    body: "After the flash collapses, a branded siren widget stays locked top-right for the full offer window — live countdown, claim CTA, persistent brand presence.",
    icon: Zap,
    color: "#f59e0b",
  },
];

const STATS = [
  { label: "Max brands per hour", value: "2", note: "Hard cap — exclusivity by design" },
  { label: "Flash duration", value: "5–60s", note: "Brand chooses at booking" },
  { label: "Offer window", value: "Up to 24h", note: "Siren stays live until offer expires" },
  { label: "Audience reached", value: "All active users", note: "Every vertical, every session" },
];

export default function WhatIsGigJackPage() {
  return (
    <>
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", overflowX: "hidden" }}>

      {/* Back button */}
      <div style={{ padding: "16px 24px" }}>
        <Link href="/">
          <div data-testid="link-back-home-gigjack" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 16px rgba(255,43,43,0.35)", letterSpacing: "0.02em" }}>
            <ArrowLeft size={14} />
            Back to Gigzito
          </div>
        </Link>
      </div>

      {/* ── HERO ── */}
      <div style={{ position: "relative", minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 60px", textAlign: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,43,43,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 780 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,43,43,0.12)", border: "1px solid rgba(255,43,43,0.35)", borderRadius: 999, padding: "5px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#ff4444", textTransform: "uppercase", marginBottom: 28 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff4444", display: "inline-block", animation: "pulse 1.5s infinite" }} />
            Site-Wide Flash Event
          </div>

          <h1 style={{ fontSize: "clamp(38px, 7vw, 78px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
            <span style={{ display: "block", background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.75) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              What is
            </span>
            <span style={{ display: "block", background: "linear-gradient(135deg, #ff2b2b 0%, #ff6b00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              GigJack?
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2.5vw, 21px)", color: "rgba(255,255,255,0.55)", maxWidth: 600, margin: "0 auto 20px", lineHeight: 1.65, fontWeight: 400 }}>
            GigJack is a scheduled, full-screen brand takeover of the entire Gigzito platform. Every active user — across every vertical — sees your brand simultaneously for up to 60 seconds.
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", maxWidth: 540, margin: "0 auto 48px", lineHeight: 1.75 }}>
            Not a banner. Not a sidebar ad. A complete site hijack — your artwork, your offer, your countdown — dropped at the highest-traffic moment your data can identify.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/gigjack/new">
              <div data-testid="gigjack-cta-book" style={{ background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 800, fontSize: 14, padding: "14px 32px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 40px rgba(255,43,43,0.4)", letterSpacing: "0.02em" }}>
                Book a GigJack Slot
              </div>
            </Link>
            <Link href="/pricing">
              <div data-testid="gigjack-cta-pricing" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 14, padding: "14px 32px", borderRadius: 999, cursor: "pointer" }}>
                View Pricing
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {STATS.map((s) => (
            <div key={s.label} data-testid={`gigjack-stat-${s.label.replace(/\s+/g, "-").toLowerCase()}`} style={{ background: "rgba(255,43,43,0.04)", border: "1px solid rgba(255,43,43,0.15)", borderRadius: 16, padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ff4444", marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>{s.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, margin: "0 0 14px", background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.6))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            How a GigJack works
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            From booking to blast — the full lifecycle in 4 stages.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {HOW_IT_WORKS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} data-testid={`gigjack-step-${item.step}`} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "flex-start", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "28px 28px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `rgba(${item.color === "#ff2b2b" ? "255,43,43" : "245,158,11"},0.12)`, border: `1px solid ${item.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ width: 22, height: 22, color: item.color }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: item.color, letterSpacing: "0.08em" }}>{item.step}</div>
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{item.title}</div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── VERTICALS ANGLE ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(255,43,43,0.08), rgba(245,158,11,0.04))", border: "1px solid rgba(255,43,43,0.2)", borderRadius: 24, padding: "48px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,43,43,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 20 }}>
                <TrendingUp style={{ width: 11, height: 11 }} />
                GZMetrics Integration
              </div>
              <h3 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
                Hit all verticals at their peak
              </h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: "0 0 16px", maxWidth: 520 }}>
                GZMetrics surfaces the highest-traffic windows across Music, Marketing, Coaching, Events, Business, and every other vertical — so brands using GZMarketerPro know exactly which hour slots will deliver the widest reach.
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, margin: 0, maxWidth: 520 }}>
                When your GigJack fires, it doesn't target a category — it takes the whole platform. Every user browsing any vertical sees your takeover simultaneously.
              </p>
            </div>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg, rgba(255,43,43,0.2), rgba(245,158,11,0.1))", border: "2px solid rgba(255,43,43,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 0 60px rgba(255,43,43,0.2)" }}>
                <Globe style={{ width: 40, height: 40, color: "#ff4444" }} />
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,43,43,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Whole Platform</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOOK CTA ── */}
      <div style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(255,43,43,0.1), rgba(255,43,43,0.04))", border: "1px solid rgba(255,43,43,0.25)", borderRadius: 24, padding: "52px 40px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,43,43,0.12)", border: "1px solid rgba(255,43,43,0.3)", borderRadius: 999, padding: "5px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#ff4444", textTransform: "uppercase", marginBottom: 24 }}>
              <Users style={{ width: 11, height: 11 }} />
              Ready when you are
            </div>
            <h2 style={{ fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 900, margin: "0 0 16px", color: "#fff", lineHeight: 1.15 }}>
              Book your GigJack slot
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.75 }}>
              Choose your date, pick a high-traffic hour from the calendar, upload your artwork, write your offer — and your brand will own the platform for that window.
            </p>
            <Link href="/gigjack/new">
              <div data-testid="gigjack-bottom-cta" style={{ display: "inline-block", background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 900, fontSize: 14, padding: "16px 40px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 50px rgba(255,43,43,0.35)", letterSpacing: "0.02em" }}>
                Book a GigJack Slot
              </div>
            </Link>
            <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              Slots require admin approval. Pricing is included in your membership tier.
            </div>
          </div>
        </div>
      </div>

    </div>
    <MoreBelow />
    </>
  );
}
