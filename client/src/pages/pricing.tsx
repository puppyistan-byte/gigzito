import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Minus, HelpCircle, ArrowLeft, Flame, Zap, Star, CheckCircle } from "lucide-react";
import MoreBelow from "@/components/more-below";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// July 7, 2026 at 11:59 PM UTC — end of 3-month brand build
const PROMO_END = new Date("2026-07-07T23:59:59Z");

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div
        style={{
          background: "linear-gradient(145deg, rgba(255,43,43,0.25), rgba(255,43,43,0.08))",
          border: "1px solid rgba(255,43,43,0.4)",
          borderRadius: 12,
          padding: "14px 20px",
          minWidth: 72,
          textAlign: "center",
          boxShadow: "0 0 20px rgba(255,43,43,0.15)",
        }}
      >
        <span style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </span>
    </div>
  );
}

const TIERS = [
  {
    id: "GZLurker",
    name: "GZLurker",
    price: "Free",
    priceNum: null,
    priceNote: "",
    type: "Viewer / Participant",
    highlight: false,
    color: "#6b7280",
    perks: ["Watch all content", "Like & comment", "GeeZee card", "GeeZee Rolodex"],
  },
  {
    id: "GZGroups",
    name: "GZGroups",
    price: "$8",
    priceNum: 8,
    priceNote: "/ mo",
    type: "Community Builder",
    highlight: false,
    color: "#22c55e",
    perks: ["Create private groups", "Kanban board", "Group calendar", "Group wallet"],
  },
  {
    id: "GZMarketer",
    name: "GZMarketer",
    price: "$12",
    priceNum: 12,
    priceNote: "/ mo",
    type: "Creator",
    highlight: false,
    color: "#7c3aed",
    perks: ["Unlimited video posts", "Campaign tagging", "Mailing lists", "CSV export"],
  },
  {
    id: "GZMarketerPro",
    name: "GZMarketerPro",
    price: "$15",
    priceNum: 15,
    priceNote: "/ mo",
    type: "Advanced Marketer",
    highlight: true,
    color: "#ff2b2b",
    perks: ["GZMetrics analytics", "SMTP campaigns", "Push notifications", "GZFlash Ad Center"],
  },
  {
    id: "GZBusiness",
    name: "GZBusiness",
    price: "$25",
    priceNum: 25,
    priceNote: "/ mo",
    type: "Local Business Engine",
    highlight: false,
    color: "#f59e0b",
    perks: ["Geo-based campaigns", "Location marketing", "Auto coupon triggers", "Everything in Pro"],
  },
  {
    id: "GZEnterprise",
    name: "GZEnterprise",
    price: "TBD",
    priceNum: null,
    priceNote: "",
    type: "Enterprise Scale",
    highlight: false,
    color: "#06b6d4",
    comingSoon: true,
    perks: ["Custom integrations", "Dedicated support", "White-label options", "Volume pricing"],
  },
];

type CellValue = boolean | string | "check" | "dash";
interface Feature { label: string; tooltip: string; values: CellValue[]; }

const FEATURES: Feature[] = [
  { label: "Registration Required", tooltip: "A Gigzito account is required.", values: [true, true, true, true, true] },
  { label: "Access to Zito TV", tooltip: "Watch all live and recorded content.", values: [true, true, true, true, true] },
  { label: "Like / Comment / Engage", tooltip: "React and engage with creator content.", values: [true, true, true, true, true] },
  { label: "Post Videos", tooltip: "Post promotional videos in the Zito TV feed.", values: ["1/day", "1/day", "Unlimited", "Unlimited", "Unlimited"] },
  { label: "Text Ad Posts", tooltip: "Publish text-based ads in the feed.", values: [true, true, true, true, true] },
  { label: "GeeZee Cards", tooltip: "Create and publish your digital Gigness Card.", values: ["Create & Publish", "Create & Publish", "Create & Publish", "Create & Publish", "Create & Publish"] },
  { label: "GeeZee Rolodex Listing", tooltip: "Appear in the GeeZee public directory.", values: [true, true, true, true, true] },
  { label: "Create GZGroups", tooltip: "Create your own private or open group.", values: [false, true, false, true, true] },
  { label: "Unlimited Group Members", tooltip: "No cap on how many members can join.", values: [false, true, false, true, true] },
  { label: "Private / Invite-Only Groups", tooltip: "Lock your group to invited members only.", values: [false, true, false, true, true] },
  { label: "Group Kanban Board", tooltip: "Built-in project board inside every group.", values: [false, true, false, true, true] },
  { label: "Group Calendar & Events", tooltip: "Schedule meetups and share a group calendar.", values: [false, true, false, true, true] },
  { label: "Campaign Creation", tooltip: "Build structured marketing campaigns.", values: [false, false, false, true, true] },
  { label: "Campaign Tagging", tooltip: "Tag videos and leads to specific campaigns.", values: [false, false, false, true, true] },
  { label: "Mailing List Management", tooltip: "Organize captured leads into mailing lists.", values: [false, false, false, true, true] },
  { label: "CSV Export of Leads", tooltip: "Download all leads as a CSV file.", values: [false, false, false, true, true] },
  { label: "Push Notifications", tooltip: "Send push alerts to followers.", values: [false, false, false, true, true] },
  { label: "SMTP Campaigns", tooltip: "Send email campaigns from your dashboard.", values: [false, false, false, true, true] },
  { label: "GZMetrics Analytics", tooltip: "Advanced analytics: watch time, viewer city, CTA click rate, completion rate, and more.", values: [false, false, false, true, true] },
  { label: "GZFlash Ad Center", tooltip: "Deploy time-limited flash deals competing for Pole Position.", values: [false, false, false, true, true] },
  { label: "GZFlash Location Marketing", tooltip: "Geo-targeted marketing slots for local businesses.", values: [false, false, false, false, true] },
  { label: "Geo-Based Campaigns", tooltip: "Target campaigns to a defined geographic radius.", values: [false, false, false, false, true] },
  { label: "Automatic Coupon Trigger", tooltip: "Auto-send coupons when viewers complete specific actions.", values: [false, false, false, false, true] },
];

function Cell({ value, tierColor }: { value: CellValue; tierColor: string }) {
  if (value === true) return <div style={{ display: "flex", justifyContent: "center" }}><Check style={{ width: 18, height: 18, color: tierColor }} strokeWidth={2.5} /></div>;
  if (value === false) return <div style={{ display: "flex", justifyContent: "center" }}><Minus style={{ width: 16, height: 16, color: "#374151" }} /></div>;
  return <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: tierColor }}>{value}</div>;
}

function FeatureTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", color: "#6b7280", flexShrink: 0 }} data-testid={`tooltip-${label.replace(/\s+/g, "-").toLowerCase()}`}>
            <HelpCircle style={{ width: 13, height: 13 }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" style={{ maxWidth: 280, background: "#1a1a1a", border: "1px solid #2a2a2a", color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 1.5, padding: "8px 12px", borderRadius: 8 }}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const countdown = useCountdown(PROMO_END);
  const [confirmTier, setConfirmTier] = useState<typeof TIERS[0] | null>(null);
  const [setting, setSetting] = useState(false);

  const currentTier = user?.user?.subscriptionTier ?? null;

  const handleJoinTier = (tier: typeof TIERS[0]) => {
    if (tier.comingSoon) return;
    if (!user) {
      navigate(`/auth?tab=register&tier=${tier.id}`);
      return;
    }
    setConfirmTier(tier);
  };

  const confirmJoin = async () => {
    if (!confirmTier) return;
    setSetting(true);
    try {
      await apiRequest("POST", "/api/user/set-tier", { tier: confirmTier.id });
      await qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: `You're now on ${confirmTier.name}!`, description: "All perks unlocked — free during Brand Build." });
      setConfirmTier(null);
    } catch (e: any) {
      toast({ title: "Could not update tier", description: e.message, variant: "destructive" });
    } finally {
      setSetting(false);
    }
  };

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", paddingTop: 60, paddingBottom: 80 }}>

        {/* Back button */}
        <div style={{ padding: "16px 24px" }}>
          <Link href="/">
            <div data-testid="link-back-home-pricing" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 16px rgba(255,43,43,0.35)", letterSpacing: "0.02em" }}>
              <ArrowLeft size={14} />
              Back to Gigzito
            </div>
          </Link>
        </div>

        {/* ======= BRAND BUILD HERO BANNER ======= */}
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto 24px",
            padding: "0 16px",
          }}
        >
          <div
            data-testid="brand-build-banner"
            style={{
              background: "linear-gradient(135deg, rgba(255,43,43,0.18) 0%, rgba(255,120,0,0.12) 50%, rgba(255,43,43,0.18) 100%)",
              border: "1.5px solid rgba(255,43,43,0.5)",
              borderRadius: 20,
              padding: "36px 32px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 0 60px rgba(255,43,43,0.12), inset 0 0 60px rgba(255,43,43,0.04)",
            }}
          >
            {/* Glow orb behind */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 200, background: "radial-gradient(ellipse, rgba(255,43,43,0.15), transparent 70%)", pointerEvents: "none" }} />

            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,43,43,0.2)", border: "1px solid rgba(255,43,43,0.5)", borderRadius: 999, padding: "5px 16px", fontSize: 11, fontWeight: 800, color: "#ff6666", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
              <Flame size={12} style={{ color: "#ff6666" }} />
              Limited Time — Brand Build Special
              <Flame size={12} style={{ color: "#ff6666" }} />
            </div>

            <h1 style={{ fontSize: "clamp(26px, 5vw, 52px)", fontWeight: 900, margin: "0 0 8px", lineHeight: 1.1 }}>
              <span style={{ background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.75))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                We're Building Together.
              </span>
            </h1>
            <p style={{ fontSize: "clamp(15px, 2.5vw, 20px)", fontWeight: 700, color: "#ff5555", margin: "0 0 6px" }}>
              ALL TIERS FREE — No credit card. No catch.
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 32px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              Gigzito is in its brand-building phase. Every paid membership is unlocked for free so you can experience the full platform and help us grow.
            </p>

            {/* Countdown */}
            {!countdown.expired ? (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  Free access ends in
                </p>
                <div data-testid="countdown-timer" style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <CountdownBox value={countdown.days} label="Days" />
                  <div style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,43,43,0.6)", paddingTop: 14 }}>:</div>
                  <CountdownBox value={countdown.hours} label="Hours" />
                  <div style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,43,43,0.6)", paddingTop: 14 }}>:</div>
                  <CountdownBox value={countdown.minutes} label="Minutes" />
                  <div style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,43,43,0.6)", paddingTop: 14 }}>:</div>
                  <CountdownBox value={countdown.seconds} label="Seconds" />
                </div>
                <p style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  Free through July 7, 2026 — tiers lock to paid pricing after
                </p>
              </div>
            ) : (
              <div style={{ padding: "12px 24px", background: "rgba(255,255,255,0.05)", borderRadius: 12, display: "inline-block" }}>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Brand Build promo has ended. Paid tiers now apply.</p>
              </div>
            )}
          </div>
        </div>

        {/* ======= HEADER ======= */}
        <div style={{ textAlign: "center", padding: "24px 24px 40px" }}>
          <div style={{ display: "inline-block", background: "rgba(255,43,43,0.12)", border: "1px solid rgba(255,43,43,0.25)", borderRadius: 999, padding: "4px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#ff4444", textTransform: "uppercase", marginBottom: 14 }}>
            Membership Ecosystem
          </div>
          <h2 style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 800, margin: "0 0 8px", background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Choose Your Tier — Free Until July 2026
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 480, margin: "0 auto" }}>
            Select the tier that fits your goals. All perks unlocked instantly, completely free.
          </p>
        </div>

        {/* ======= TIER CARDS ======= */}
        <div style={{ display: "flex", gap: 16, padding: "0 20px 48px", maxWidth: 1060, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
          {TIERS.map((tier) => {
            const isActive = currentTier === tier.id;
            return (
              <div
                key={tier.id}
                data-testid={`tier-card-${tier.id.toLowerCase()}`}
                style={{
                  flex: "1 1 170px",
                  maxWidth: 200,
                  background: tier.comingSoon ? "rgba(6,182,212,0.04)" : tier.highlight ? "linear-gradient(145deg, rgba(255,43,43,0.14), rgba(255,43,43,0.05))" : "rgba(255,255,255,0.03)",
                  border: isActive ? `1.5px solid ${tier.color}` : tier.comingSoon ? "1px dashed rgba(6,182,212,0.3)" : tier.highlight ? "1px solid rgba(255,43,43,0.4)" : "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18,
                  padding: "22px 18px 20px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: isActive ? `0 0 20px ${tier.color}33` : "none",
                  opacity: tier.comingSoon ? 0.75 : 1,
                  transition: "box-shadow 0.2s",
                }}
              >
                {/* Badges */}
                {isActive && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: tier.color, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 12px", borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    Your Plan
                  </div>
                )}
                {tier.highlight && !isActive && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#ff2b2b", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 12px", borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    Most Popular
                  </div>
                )}
                {tier.comingSoon && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 12px", borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    Coming Soon
                  </div>
                )}

                {/* Name + type */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: tier.color, marginBottom: 6 }}>{tier.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{tier.type}</div>
                </div>

                {/* Price — struck through + FREE */}
                <div>
                  {tier.priceNum && !countdown.expired ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", textDecoration: "line-through", textDecorationColor: "rgba(255,43,43,0.7)", textDecorationThickness: 2 }}>
                        {tier.price}{tier.priceNote}
                      </span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span data-testid={`price-free-${tier.id}`} style={{ fontSize: 32, fontWeight: 900, color: "#22c55e", lineHeight: 1 }}>FREE</span>
                        <span style={{ fontSize: 10, color: "#22c55e", opacity: 0.7 }}>now</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: tier.comingSoon ? "rgba(255,255,255,0.3)" : "#fff" }}>{tier.price}</span>
                      {tier.priceNote && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{tier.priceNote}</span>}
                    </div>
                  )}
                </div>

                {/* Perks list */}
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                  {tier.perks.map((perk) => (
                    <li key={perk} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <Check style={{ width: 12, height: 12, color: tier.color, flexShrink: 0, marginTop: 2 }} strokeWidth={2.5} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{perk}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                {!tier.comingSoon && (
                  isActive ? (
                    <div data-testid={`button-active-${tier.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: `${tier.color}22`, border: `1px solid ${tier.color}55`, borderRadius: 10, padding: "9px 12px", fontSize: 11, fontWeight: 700, color: tier.color }}>
                      <CheckCircle size={13} /> Active Plan
                    </div>
                  ) : (
                    <button
                      data-testid={`button-join-${tier.id.toLowerCase()}`}
                      onClick={() => handleJoinTier(tier)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 12px",
                        background: countdown.expired ? `${tier.color}33` : "linear-gradient(135deg, #22c55e, #16a34a)",
                        border: countdown.expired ? `1px solid ${tier.color}55` : "none",
                        borderRadius: 10,
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                        boxShadow: countdown.expired ? "none" : "0 4px 16px rgba(34,197,94,0.3)",
                        transition: "opacity 0.15s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      {countdown.expired
                        ? `Join ${tier.name}`
                        : tier.id === "GZLurker"
                          ? "Join Free"
                          : "Become a Member — FREE"}
                    </button>
                  )
                )}
                {tier.comingSoon && (
                  <div style={{ fontSize: 10, color: "#06b6d4", fontWeight: 700, letterSpacing: "0.06em", textAlign: "center" }}>
                    Details announced soon
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Social proof strip */}
        <div style={{ textAlign: "center", margin: "0 auto 48px", maxWidth: 680, padding: "0 20px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {[
              { icon: <Zap size={16} />, label: "Instant access", sub: "No credit card needed" },
              { icon: <Star size={16} />, label: "Full perks unlocked", sub: "All features, all tiers" },
              { icon: <Flame size={16} />, label: "Free through July 2026", sub: "Lock in your tier now" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ color: "#ff5555" }}>{item.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature comparison table */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
          <h3 style={{ textAlign: "center", fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.7)", marginBottom: 24 }}>Full Feature Comparison</h3>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(5, minmax(70px, 1fr))", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 20px", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Feature</div>
              {TIERS.filter((t) => !t.comingSoon).map((tier) => (
                <div key={tier.id} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: tier.color }}>{tier.name}</div>
                </div>
              ))}
            </div>
            {FEATURES.map((feature, i) => (
              <div key={feature.label} data-testid={`feature-row-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr repeat(5, minmax(70px, 1fr))", padding: "13px 20px", gap: 8, borderBottom: i < FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", alignItems: "center" }}>
                <FeatureTooltip label={feature.label} tooltip={feature.tooltip} />
                {feature.values.map((val, ti) => (
                  <Cell key={ti} value={val} tierColor={TIERS[ti].color} />
                ))}
              </div>
            ))}
          </div>

          {/* GZMetrics section */}
          <div style={{ marginTop: 48, background: "linear-gradient(145deg, rgba(255,43,43,0.07), rgba(255,43,43,0.02))", border: "1px solid rgba(255,43,43,0.2)", borderRadius: 16, padding: "32px 28px" }} data-testid="gzmetrics-section">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(255,43,43,0.15)", borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 800, color: "#ff4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                GZMarketerPro &amp; GZBusiness
              </div>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>GZMetrics — Advanced Creator Analytics</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 28px", lineHeight: 1.6 }}>
              The same level of insight used by major platforms — built directly into your Gigzito dashboard.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {[
                { title: "Viewer Intelligence", items: ["Average watch time", "Total video views", "Re-visits / repeat viewers", "Viewer home city", "Age range of viewers"] },
                { title: "Engagement Metrics", items: ["CTA click rate", "Engagement rate", "Campaign engagement", "Video completion rate", "Returning viewer percentage"] },
                { title: "Lead Capture Integration", items: ["Name", "Email", "Exported to CSV", "Forwarded by email", "Viewed in your dashboard"] },
              ].map(({ title, items }) => (
                <div key={title} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#ff4444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{title}</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((item) => (
                      <li key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Check style={{ width: 13, height: 13, color: "#ff4444", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ textAlign: "center", marginTop: 56, padding: "0 24px" }}>
            <div style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 16, padding: "28px 32px" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e", marginBottom: 6 }}>Join the Brand Build. It's Free.</div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
                Choose your tier above and get full access to Gigzito — no payment required until July 7, 2026.
              </p>
              {!user && (
                <button
                  data-testid="button-become-member-bottom"
                  onClick={() => navigate("/auth?tab=register")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: 12, padding: "14px 32px", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 24px rgba(34,197,94,0.3)" }}
                >
                  <Zap size={16} /> Create Your Free Account
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======= CONFIRM TIER MODAL ======= */}
      <Dialog open={!!confirmTier} onOpenChange={(o) => !o && setConfirmTier(null)}>
        <DialogContent className="bg-[#0d0d0d] border-[#2a2a2a] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              Join {confirmTier?.name}
              {!countdown.expired && <span className="text-green-400 ml-2">— FREE</span>}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {countdown.expired
                ? `You're selecting the ${confirmTier?.name} tier.`
                : `During the Brand Build, all tiers are completely free. You'll get instant access to all ${confirmTier?.name} perks.`}
            </DialogDescription>
          </DialogHeader>
          {confirmTier && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm font-bold mb-3" style={{ color: confirmTier.color }}>{confirmTier.name} — What you unlock:</div>
                <ul className="space-y-2">
                  {confirmTier.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-zinc-300">
                      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: confirmTier.color }} />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
              {!countdown.expired && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-lg px-3 py-2">
                  <Flame className="h-4 w-4 text-green-400 shrink-0" />
                  <p className="text-xs text-green-300 font-medium">Free through July 7, 2026 — no credit card required</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/10" onClick={() => setConfirmTier(null)}>
                  Cancel
                </Button>
                <Button
                  data-testid="button-confirm-join-tier"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={confirmJoin}
                  disabled={setting}
                >
                  {setting ? "Activating…" : countdown.expired ? `Join ${confirmTier.name}` : "Claim Free Access"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MoreBelow />
    </>
  );
}
