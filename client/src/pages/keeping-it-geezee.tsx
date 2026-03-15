import { Link } from "wouter";
import { Check, Zap, BarChart3, MapPin, Users, Video, CreditCard, Bell, Mail, Download, Tag, TrendingUp, ArrowLeft } from "lucide-react";

const TIER_JOURNEY = [
  {
    name: "GZLurker",
    price: "Free",
    color: "#6b7280",
    glow: "rgba(107,114,128,0.3)",
    label: "Viewer / Participant",
    icon: Users,
    description: "Start watching. Start engaging. Create your digital identity — no credit card, no catch.",
    perks: [
      "Watch all Zito TV content",
      "Like, comment & engage",
      "Create your GeeZee Card",
      "Join the Rolodex network",
    ],
  },
  {
    name: "GZMarketer",
    price: "$12 / mo",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.35)",
    label: "Creator",
    icon: Video,
    description: "Publish unlimited videos. Turn your content into your distribution channel.",
    perks: [
      "Unlimited video uploads",
      "Full Zito TV presence",
      "GeeZee Card & Rolodex",
      "Creator dashboard",
    ],
  },
  {
    name: "GZMarketerPro",
    price: "$15 / mo",
    color: "#ff2b2b",
    glow: "rgba(255,43,43,0.4)",
    label: "Advanced Marketer",
    icon: BarChart3,
    description: "Unlock GZMetrics — the same business intelligence used by major platforms, built into your dashboard.",
    perks: [
      "GZMetrics analytics engine",
      "Campaign creation & tagging",
      "Mailing list management",
      "CSV lead export",
      "Push notifications",
      "SMTP email campaigns",
    ],
    highlight: true,
  },
  {
    name: "GZBusiness",
    price: "$25 / mo",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.35)",
    label: "Local Business Engine",
    icon: MapPin,
    description: "Take it physical. Preemptive Marketing activates customers the moment they enter your zone — before they even walk through your door.",
    perks: [
      "Everything in GZMarketerPro",
      "Preemptive Marketing (location ads)",
      "Geo-based push notifications",
      "Automatic coupon triggers",
      "Proximity offer delivery",
    ],
  },
];

const GZMETRICS_STATS = [
  { label: "Average Watch Time", icon: TrendingUp },
  { label: "Total Video Views", icon: BarChart3 },
  { label: "Repeat Visitors", icon: Users },
  { label: "Viewer Home City", icon: MapPin },
  { label: "Age Range Data", icon: Tag },
  { label: "CTA Click Rate", icon: Zap },
  { label: "Completion Rate", icon: Check },
  { label: "Campaign Engagement", icon: Bell },
];

export default function KeepingItGeezeePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", overflowX: "hidden" }}>

      {/* Back button */}
      <div style={{ padding: "16px 24px" }}>
        <Link href="/">
          <div data-testid="link-back-home-geezee" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 16px rgba(255,43,43,0.35)", letterSpacing: "0.02em" }}>
            <ArrowLeft size={14} />
            Back to Gigzito
          </div>
        </Link>
      </div>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", textAlign: "center", overflow: "hidden" }}>

        {/* Background glow blobs */}
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,43,43,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Grid overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,43,43,0.12)", border: "1px solid rgba(255,43,43,0.3)", borderRadius: 999, padding: "5px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#ff4444", textTransform: "uppercase", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4444", display: "inline-block" }} />
            Keeping it Geezee
          </div>

          <h1 style={{ fontSize: "clamp(38px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
            <span style={{ display: "block", background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.75) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Not just a video
            </span>
            <span style={{ display: "block", background: "linear-gradient(135deg, #ff2b2b 0%, #ff6b6b 50%, #f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              platform.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: "rgba(255,255,255,0.55)", maxWidth: 640, margin: "0 auto 16px", lineHeight: 1.65, fontWeight: 400 }}>
            A business intelligence system that connects content, marketing, and local commerce into a single operational framework.
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.7 }}>
            Gigzito gives creators and businesses the same data and engagement capabilities traditionally reserved for the largest technology platforms.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth">
              <div data-testid="hero-cta-signup" style={{ background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 800, fontSize: 14, padding: "14px 32px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 40px rgba(255,43,43,0.4)", letterSpacing: "0.02em" }}>
                Get Started Free
              </div>
            </Link>
            <Link href="/pricing">
              <div data-testid="hero-cta-pricing" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 14, padding: "14px 32px", borderRadius: 999, cursor: "pointer", backdropFilter: "blur(10px)" }}>
                View Pricing
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── WHAT IS GIGZITO ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 800, margin: "0 0 16px", background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.6))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            The Gigzito Ecosystem
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>
            From casual viewer to full local business engine — every tier is built with a purpose.
          </p>
        </div>

        {/* Tier Journey */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          {TIER_JOURNEY.map((tier, i) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.name}
                data-testid={`tier-journey-${tier.name.toLowerCase()}`}
                style={{
                  position: "relative",
                  background: tier.highlight
                    ? `linear-gradient(145deg, rgba(255,43,43,0.1), rgba(255,43,43,0.03))`
                    : "rgba(255,255,255,0.025)",
                  border: tier.highlight ? "1px solid rgba(255,43,43,0.35)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 18,
                  padding: "28px 22px",
                  transition: "transform 0.2s",
                }}
              >
                {tier.highlight && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#ff2b2b", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "3px 14px", borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    Most Popular
                  </div>
                )}

                {/* Step number */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.2)", marginBottom: 16, letterSpacing: "0.08em" }}>
                  TIER {i + 1}
                </div>

                <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(${tier.color === "#6b7280" ? "107,114,128" : tier.color === "#7c3aed" ? "124,58,237" : tier.color === "#ff2b2b" ? "255,43,43" : "245,158,11"},0.15)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, border: `1px solid ${tier.color}30` }}>
                  <Icon style={{ width: 20, height: 20, color: tier.color }} />
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: tier.color, marginBottom: 4 }}>{tier.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{tier.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 14 }}>{tier.price}</div>

                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 20 }}>
                  {tier.description}
                </p>

                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {tier.perks.map((perk) => (
                    <li key={perk} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Check style={{ width: 13, height: 13, color: tier.color, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GZMETRICS ───────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", padding: "80px 24px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(255,43,43,0.05) 50%, transparent 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,43,43,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 960, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-block", background: "rgba(255,43,43,0.12)", border: "1px solid rgba(255,43,43,0.25)", borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#ff4444", textTransform: "uppercase", marginBottom: 20 }}>
                GZMarketerPro &amp; GZBusiness
              </div>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, margin: "0 0 16px", lineHeight: 1.1 }}>
                <span style={{ background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GZMetrics —</span>
                <br />
                <span style={{ background: "linear-gradient(135deg, #ff2b2b, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Intelligence Engine</span>
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 24 }}>
                GZMetrics provides creators and marketers with the same level of insight used by major digital platforms — including watch time, repeat visits, audience demographics, and full engagement performance — all built into your Gigzito dashboard.
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75 }}>
                Every CTA interaction captures lead data automatically. Build your list, tag contacts to campaigns, and export to CSV — no third-party tool required.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {GZMETRICS_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    data-testid={`gzmetrics-stat-${stat.label.replace(/\s+/g, "-").toLowerCase()}`}
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,43,43,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 15, height: 15, color: "#ff4444" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", lineHeight: 1.3 }}>{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── PREEMPTIVE MARKETING ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 24, padding: "48px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 20 }}>
                <MapPin style={{ width: 11, height: 11 }} />
                GZBusiness Exclusive
              </div>
              <h2 style={{ fontSize: "clamp(22px, 3.5vw, 38px)", fontWeight: 800, margin: "0 0 16px", lineHeight: 1.15 }}>
                <span style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Preemptive Marketing —</span>
                <span style={{ color: "#fff" }}> Location-Enabled<br />Ads &amp; Notifications</span>
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 20, maxWidth: 500 }}>
                Gigzito partners drop a push pin on the map and set up a pre-designed ad. When a user with location services enabled enters the zone, a targeted notification fires directly to their phone — automatically. No manual activation, no missed foot traffic.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {["Proximity Detection", "Auto Coupon Trigger", "Geo-Based Campaigns", "Real-World Commerce"].map((tag) => (
                  <div key={tag} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 999, padding: "5px 14px", fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
                    {tag}
                  </div>
                ))}
              </div>
              <Link href="/preemptive-marketing">
                <div data-testid="link-preemptive-marketing" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", fontWeight: 800, fontSize: 13, padding: "10px 22px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 24px rgba(245,158,11,0.3)" }}>
                  <MapPin style={{ width: 13, height: 13 }} />
                  Preemptive Marketing
                </div>
              </Link>
            </div>

            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))", border: "2px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 0 60px rgba(245,158,11,0.2)" }}>
                <MapPin style={{ width: 44, height: 44, color: "#f59e0b" }} />
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,158,11,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Location Ads</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GEEZEE CARDS ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          <div style={{ background: "linear-gradient(145deg, rgba(124,58,237,0.1), rgba(124,58,237,0.03))", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 20, padding: "36px 32px" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, border: "1px solid rgba(124,58,237,0.25)" }}>
              <CreditCard style={{ width: 22, height: 22, color: "#7c3aed" }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>GeeZee Cards</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, margin: "0 0 20px" }}>
              Your scannable digital identity on Gigzito. Every user — from GZLurker to GZBusiness — can create and publish a GeeZee Card to the Rolodex network. QR-powered, shareable, and always on.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Available on all tiers", "QR code scannable", "Published to Rolodex", "Send & receive messages"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check style={{ width: 13, height: 13, color: "#7c3aed", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "linear-gradient(145deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 20, padding: "36px 32px" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, border: "1px solid rgba(16,185,129,0.2)" }}>
              <Download style={{ width: 22, height: 22, color: "#10b981" }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>Lead Capture System</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, margin: "0 0 20px" }}>
              When viewers interact with your CTA, their contact data is automatically captured, stored in your Gigzito dashboard, and ready to be tagged, exported, or blasted — without a single third-party integration.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Auto lead capture on CTA click", "Name & email collected", "Tag to campaigns", "Export via CSV", "SMTP broadcast ready"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Check style={{ width: 13, height: 13, color: "#10b981", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── LAUNCH OFFER ────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative", borderRadius: 24, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a0a00 0%, #0d0500 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(255,43,43,0.1) 100%)", opacity: 0.6 }} />
          <div style={{ position: "absolute", top: -80, right: -80, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)" }} />

          <div style={{ position: "relative", zIndex: 1, padding: "56px 48px", textAlign: "center" }}>
            <div style={{ display: "inline-block", background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 999, padding: "5px 18px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 24 }}>
              Launch Offer
            </div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 900, margin: "0 0 16px", lineHeight: 1.1 }}>
              <span style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>3 Months Free</span>
              <span style={{ color: "#fff" }}> GZBusiness</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7 }}>
              Early partners get a complimentary three-month GZBusiness membership — full access to GigJack, geo campaigns, GZMetrics, and automatic coupon triggers while we build out billing.
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
              {["GZMetrics Analytics", "Preemptive Marketing", "Geo Campaigns", "Coupon Triggers", "Full Lead Capture"].map((feature) => (
                <div key={feature} style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "5px 14px", fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
                  {feature}
                </div>
              ))}
            </div>

            <Link href="/auth">
              <div data-testid="launch-offer-cta" style={{ display: "inline-block", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", fontWeight: 900, fontSize: 14, padding: "16px 40px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 50px rgba(245,158,11,0.35)", letterSpacing: "0.02em" }}>
                Claim Your Free 3 Months
              </div>
            </Link>

            <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              No credit card required during launch phase
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <Link href="/pricing">
            <span data-testid="footer-link-pricing" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer", textDecoration: "none" }}>Membership Tiers</span>
          </Link>
          <Link href="/auth">
            <span data-testid="footer-link-auth" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>Sign Up</span>
          </Link>
          <Link href="/">
            <span data-testid="footer-link-home" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>Zito TV</span>
          </Link>
          <a href="mailto:press@gigzito.com" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>press@gigzito.com</a>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>© 2026 Gigzito. Keeping it Geezee.</div>
      </div>

    </div>
  );
}
