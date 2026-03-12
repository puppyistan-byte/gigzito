import { Navbar } from "@/components/navbar";
import { Link } from "wouter";
import logoImg from "@assets/gigzito-logo-tight_1772926617316.png";
import { Zap, Monitor, Users, TrendingUp, Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function AdvertisePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff" }}>
      <Navbar />

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "100px 24px 60px", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,43,43,0.1)", border: "1px solid rgba(255,43,43,0.25)", borderRadius: "999px", padding: "6px 16px", marginBottom: "24px" }}>
          <Zap style={{ width: "14px", height: "14px", color: "#ff2b2b" }} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#ff2b2b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Premium Placement</span>
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.15, marginBottom: "20px", letterSpacing: "-0.02em" }}>
          Advertise on <span style={{ color: "#ff2b2b" }}>Gigzito</span>
        </h1>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "36px" }}>
          Put your brand in front of thousands of motivated buyers, entrepreneurs, and service seekers every single day.
        </p>
        <a
          href="mailto:ads@gigzito.com"
          style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: "16px", padding: "14px 32px", borderRadius: "999px", textDecoration: "none", boxShadow: "0 4px 24px rgba(255,43,43,0.4)" }}
          data-testid="link-advertise-contact"
        >
          <Mail style={{ width: "18px", height: "18px" }} />
          Get Started — Email Us
          <ArrowRight style={{ width: "16px", height: "16px" }} />
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "center", gap: "48px", flexWrap: "wrap", padding: "48px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        {[
          { label: "Daily Active Users", value: "10,000+" },
          { label: "Video Impressions / Day", value: "50,000+" },
          { label: "Business Categories", value: "11" },
          { label: "Ad Rotation Interval", value: "25 sec" },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", fontWeight: 900, color: "#ff2b2b", marginBottom: "6px" }}>{stat.value}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Ad Placement */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px", textAlign: "center" }}>The Right-Rail Sponsor Panel</h2>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: "48px" }}>
          A large, unmissable ad panel fixed to the right side of the video feed on all desktop screens.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
          {[
            { icon: Monitor, title: "Premium Placement", desc: "Fixed position beside the video feed — always in view, never scrolled past." },
            { icon: Users, title: "Targeted Audience", desc: "Entrepreneurs, marketers, coaches, and buyers actively looking for services." },
            { icon: TrendingUp, title: "Rotating Exposure", desc: "Your ad rotates with others every 25 seconds, maximizing daily impressions." },
            { icon: Zap, title: "Clickable CTA", desc: "Full card + button click sends users directly to your landing page with your referral link." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "28px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255,43,43,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Icon style={{ width: "22px", height: "22px", color: "#ff2b2b" }} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>{title}</h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Specs */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px 64px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "24px" }}>Ad Creative Specs</h2>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
          {[
            ["Panel Width", "380px display (submit at 760px for retina clarity)"],
            ["Image Area", "380 × 260px — aspect ratio ~1.46:1"],
            ["Recommended Upload", "760 × 520px @ 72dpi minimum"],
            ["File Formats", "JPG, PNG, WebP"],
            ["Headline", "Up to 60 characters"],
            ["Body Text", "Up to 120 characters"],
            ["CTA Button", "Custom label + your destination URL (with referral code)"],
          ].map(([label, value], i) => (
            <div key={label} style={{ display: "flex", gap: "16px", padding: "14px 20px", borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.4)", minWidth: "160px" }}>{label}</span>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px 80px", textAlign: "center" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "12px" }}>Pricing & Booking</h2>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", marginBottom: "32px" }}>
          Sponsor slots are sold on a monthly basis with limited availability to keep each placement premium.
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          {["Custom monthly rates based on exclusivity & category", "Referral tracking links baked into every click", "Ads go live within 24 hours of approval", "Swap creatives anytime during your campaign"].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle style={{ width: "16px", height: "16px", color: "#ff2b2b", flexShrink: 0 }} />
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.65)" }}>{item}</span>
            </div>
          ))}
        </div>
        <a
          href="mailto:ads@gigzito.com"
          style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "999px", textDecoration: "none", boxShadow: "0 4px 24px rgba(255,43,43,0.35)" }}
          data-testid="link-advertise-email"
        >
          <Mail style={{ width: "17px", height: "17px" }} />
          Contact ads@gigzito.com
        </a>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", textAlign: "center" }}>
        <Link href="/">
          <a style={{ display: "inline-block", marginBottom: "12px" }}>
            <img src={logoImg} alt="Gigzito" style={{ height: "36px" }} />
          </a>
        </Link>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>© 2025 Gigzito. All rights reserved.</p>
      </div>
    </div>
  );
}
