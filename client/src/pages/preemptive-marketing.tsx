import { Link } from "wouter";
import { ArrowLeft, MapPin, Bell, Tag, Zap, Navigation, Store, Smartphone, Target } from "lucide-react";

const FEATURES = [
  {
    icon: Navigation,
    title: "Proximity Detection",
    body: "When a Gigzito user with location services enabled enters within range of a partner shop, the platform automatically detects their presence and triggers the pre-designed campaign.",
    color: "#f59e0b",
  },
  {
    icon: Bell,
    title: "Push Notification Delivery",
    body: "A targeted push notification fires directly to the user's mobile — your branded message, image, and offer. No app required beyond Gigzito. No third-party integration needed.",
    color: "#ff2b2b",
  },
  {
    icon: Tag,
    title: "Auto Coupon Trigger",
    body: "Set a coupon code to fire automatically when a proximity event is detected. The user receives a time-limited offer the moment they walk in — zero manual activation required.",
    color: "#10b981",
  },
  {
    icon: Target,
    title: "Geo-Based Campaigns",
    body: "Draw a geographic zone around your location — or multiple locations. Configure different offers for different zones. Run hyper-local campaigns that respond to real-world movement.",
    color: "#7c3aed",
  },
  {
    icon: Store,
    title: "Partner Shop Setup",
    body: "Gigzito partners access the Preemptive Marketing dashboard via GZBusiness. Upload your ad creative, set your offer, define your radius, and activate. The system runs itself.",
    color: "#f59e0b",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    body: "Every campaign is designed for the mobile screen — image-first cards, one-tap claim, and expiry countdown all optimised for the moment a customer is physically in your space.",
    color: "#06b6d4",
  },
];

const STEPS = [
  { n: "1", title: "Partner signs up as GZBusiness", desc: "The Preemptive Marketing dashboard becomes available at the GZBusiness tier ($25/mo)." },
  { n: "2", title: "Upload campaign assets", desc: "Pre-design your ad: image, headline, offer text, coupon code (optional), and expiry timer." },
  { n: "3", title: "Drop a push pin on the map", desc: "Set your location and define the proximity radius — from 50 metres to 2km." },
  { n: "4", title: "Activate the campaign", desc: "Campaign goes live. Any Gigzito user with location enabled who enters your zone receives the notification." },
  { n: "5", title: "GZMetrics tracks engagement", desc: "See how many proximity events fired, how many notifications were opened, and how many offers were claimed." },
];

export default function PreemptiveMarketingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", overflowX: "hidden" }}>

      {/* Back button */}
      <div style={{ padding: "16px 24px" }}>
        <Link href="/">
          <div data-testid="link-back-home-preemptive" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 16px rgba(255,43,43,0.35)", letterSpacing: "0.02em" }}>
            <ArrowLeft size={14} />
            Back to Gigzito
          </div>
        </Link>
      </div>

      {/* ── HERO ── */}
      <div style={{ position: "relative", minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 60px", textAlign: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,43,43,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 780 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "5px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 28 }}>
            <MapPin style={{ width: 11, height: 11 }} />
            GZBusiness Exclusive
          </div>

          <h1 style={{ fontSize: "clamp(36px, 6.5vw, 76px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
            <span style={{ display: "block", background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.75) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Preemptive
            </span>
            <span style={{ display: "block", background: "linear-gradient(135deg, #f59e0b 0%, #ff6b00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Marketing
            </span>
          </h1>

          <p style={{ fontSize: "clamp(15px, 2.5vw, 20px)", color: "rgba(255,255,255,0.55)", maxWidth: 600, margin: "0 auto 20px", lineHeight: 1.65, fontWeight: 400 }}>
            When a Gigzito user enters a participating business location with mobile location services enabled, a pre-designed ad and offer fires directly to their phone — automatically.
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", maxWidth: 540, margin: "0 auto 48px", lineHeight: 1.75 }}>
            Gigzito partners set up a push pin on the map, upload their creative, and activate. The system handles the rest — proximity detection, notification delivery, coupon distribution, and engagement tracking.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/pricing">
              <div data-testid="preemptive-cta-pricing" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", fontWeight: 900, fontSize: 14, padding: "14px 32px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 40px rgba(245,158,11,0.3)", letterSpacing: "0.02em" }}>
                Get GZBusiness — $25/mo
              </div>
            </Link>
            <Link href="/keeping-it-geezee">
              <div data-testid="preemptive-cta-ecosystem" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 14, padding: "14px 32px", borderRadius: 999, cursor: "pointer" }}>
                Full Ecosystem
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── FEATURE TAGS ── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 60px", textAlign: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {["Proximity Detection", "Auto Coupon Trigger", "Geo-Based Campaigns", "Real-World Commerce", "Push Pin Setup", "Mobile Notifications"].map((tag) => (
            <div key={tag} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 999, padding: "6px 16px", fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, margin: "0 0 14px", background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.6))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            How it works
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            From partner setup to customer notification — five steps, fully automated.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {STEPS.map((step) => (
            <div key={step.n} data-testid={`preemptive-step-${step.n}`} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "center", background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.1)", borderRadius: 16, padding: "22px 24px" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#f59e0b" }}>{step.n}</span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES GRID ── */}
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800, margin: "0 0 12px", background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.6))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            What's included
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} data-testid={`preemptive-feature-${f.title.replace(/\s+/g, "-").toLowerCase()}`} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "28px 24px" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: `rgba(${f.color === "#f59e0b" ? "245,158,11" : f.color === "#ff2b2b" ? "255,43,43" : f.color === "#10b981" ? "16,185,129" : f.color === "#7c3aed" ? "124,58,237" : f.color === "#06b6d4" ? "6,182,212" : "245,158,11"},0.12)`, border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <Icon style={{ width: 20, height: 20, color: f.color }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{f.title}</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GZBusiness CTA ── */}
      <div style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ position: "relative", borderRadius: 24, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #150800 0%, #0a0400 100%)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(255,43,43,0.08) 100%)", opacity: 0.7 }} />
            <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)" }} />

            <div style={{ position: "relative", zIndex: 1, padding: "52px 44px", textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 999, padding: "5px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 24 }}>
                <Zap style={{ width: 11, height: 11 }} />
                GZBusiness
              </div>
              <h2 style={{ fontSize: "clamp(22px, 3.5vw, 38px)", fontWeight: 900, margin: "0 0 14px", lineHeight: 1.1, color: "#fff" }}>
                Activate Preemptive Marketing
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.75 }}>
                Available exclusively on the GZBusiness tier. Drop your push pin, upload your creative, and start converting foot traffic before they even walk through your door.
              </p>
              <Link href="/pricing">
                <div data-testid="preemptive-bottom-cta" style={{ display: "inline-block", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", fontWeight: 900, fontSize: 14, padding: "16px 40px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 50px rgba(245,158,11,0.3)", letterSpacing: "0.02em" }}>
                  Upgrade to GZBusiness
                </div>
              </Link>
              <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                $25/month · Includes all GZMarketerPro features · Full location marketing suite
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
