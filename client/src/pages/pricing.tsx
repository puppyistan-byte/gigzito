import { Link } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Minus, HelpCircle, ArrowLeft } from "lucide-react";
import MoreBelow from "@/components/more-below";

const TIERS = [
  {
    id: "GZLurker",
    name: "GZLurker",
    price: "Free",
    priceNote: "",
    type: "Viewer / Participant",
    highlight: false,
    color: "#6b7280",
  },
  {
    id: "GZGroups",
    name: "GZGroups",
    price: "$8",
    priceNote: "/ month",
    type: "Community Builder",
    highlight: false,
    color: "#22c55e",
  },
  {
    id: "GZMarketer",
    name: "GZMarketer",
    price: "$12",
    priceNote: "/ month",
    type: "Creator",
    highlight: false,
    color: "#7c3aed",
  },
  {
    id: "GZMarketerPro",
    name: "GZMarketerPro",
    price: "$15",
    priceNote: "/ month",
    type: "Advanced Marketer",
    highlight: true,
    color: "#ff2b2b",
  },
  {
    id: "GZBusiness",
    name: "GZBusiness",
    price: "$25",
    priceNote: "/ month",
    type: "Local Business Engine",
    highlight: false,
    color: "#f59e0b",
  },
  {
    id: "GZEnterprise",
    name: "GZEnterprise",
    price: "TBD",
    priceNote: "",
    type: "Enterprise Scale",
    highlight: false,
    color: "#06b6d4",
    comingSoon: true,
  },
];

type CellValue = boolean | string | "check" | "dash";

interface Feature {
  label: string;
  tooltip: string;
  values: CellValue[];
}

const FEATURES: Feature[] = [
  {
    label: "Registration Required",
    tooltip: "A Gigzito account is required to access all features on the platform.",
    values: [true, true, true, true, true],
  },
  {
    label: "Access to Zito TV",
    tooltip: "Watch and interact with all live and recorded content in the Zito TV feed.",
    values: [true, true, true, true, true],
  },
  {
    label: "Like / Comment / Engage",
    tooltip: "React to, comment on, and engage with videos and creator profiles across the platform.",
    values: [true, true, true, true, true],
  },
  {
    label: "Post Videos",
    tooltip: "Post promotional videos or text ads that appear in the Zito TV vertical feed for viewers to discover.",
    values: ["1/day", "1/day", "Unlimited", "Unlimited", "Unlimited"],
  },
  {
    label: "Text Ad Posts",
    tooltip: "Publish a text-based ad — headline, body, and CTA — without needing a video. Visible in the feed.",
    values: [true, true, true, true, true],
  },
  {
    label: "GeeZee Cards",
    tooltip: "Create and publish your digital Gigness Card — your scannable networking identity on Gigzito.",
    values: ["Create & Publish", "Create & Publish", "Create & Publish", "Create & Publish", "Create & Publish"],
  },
  {
    label: "GeeZee Rolodex Listing",
    tooltip: "Appear in the GeeZee public directory so other users can discover and connect with your card.",
    values: [true, true, true, true, true],
  },
  {
    label: "Create GZGroups",
    tooltip: "Create your own private or open group — your community clubhouse with a Wall, Calendar, Kanban, Endeavors, and Members tab.",
    values: [false, true, true, true, true],
  },
  {
    label: "Unlimited Group Members",
    tooltip: "No cap on how many members can join your GZGroup. Scale your community without paying more.",
    values: [false, true, true, true, true],
  },
  {
    label: "Private / Invite-Only Groups",
    tooltip: "Lock your group so only people you invite can see the content and join the conversation.",
    values: [false, true, true, true, true],
  },
  {
    label: "Group Kanban Board",
    tooltip: "Built-in project board inside every group. Move tasks from To Do → In Progress → Done as a team.",
    values: [false, true, true, true, true],
  },
  {
    label: "Group Calendar & Events",
    tooltip: "Schedule meetups, sync RSVPs, and keep every member on the same page with a shared group calendar.",
    values: [false, true, true, true, true],
  },
  {
    label: "Campaign Creation",
    tooltip: "Build structured marketing campaigns to organize your video drops, CTAs, and lead capture goals.",
    values: [false, false, false, true, true],
  },
  {
    label: "Campaign Tagging",
    tooltip: "Tag individual videos and leads to specific campaigns for segmented tracking and reporting.",
    values: [false, false, false, true, true],
  },
  {
    label: "Mailing List Management",
    tooltip: "Organize captured leads into mailing lists you can manage, segment, and export directly from your dashboard.",
    values: [false, false, false, true, true],
  },
  {
    label: "CSV Export of Leads",
    tooltip: "Download all collected leads as a CSV file to use in your own CRM, email tool, or spreadsheet.",
    values: [false, false, false, true, true],
  },
  {
    label: "Push Notifications",
    tooltip: "Send push alerts directly to followers and subscribers when you drop new content or launch a campaign.",
    values: [false, false, false, true, true],
  },
  {
    label: "SMTP Campaigns",
    tooltip: "Send email campaigns to your mailing list directly from your Gigzito dashboard using your own SMTP credentials.",
    values: [false, false, false, true, true],
  },
  {
    label: "GZMetrics Analytics",
    tooltip:
      "Advanced creator analytics suite. Captures average watch time, total views, repeat visitors, viewer city, age range, CTA click rate, engagement rate, campaign engagement, video completion rate, and returning viewer %. Leads captured via CTA are automatically stored and can be exported or tagged to campaigns.",
    values: [false, false, false, true, true],
  },
  {
    label: "GZFlash Ad Center",
    tooltip: "Deploy time-limited flash deals that compete in real-time for Pole Position on the platform. Set discount %, quantity, and duration. Potency score determines ranking. Available to GZMarketerPro, GZBusiness, and GZEnterprise.",
    values: [false, false, false, true, true],
  },
  {
    label: "GZFlash Location Marketing",
    tooltip: "Pin your business or campaign to a GZFlash location slot — a geo-targeted marketing slot that surfaces your content to viewers in a specific area.",
    values: [false, false, false, false, true],
  },
  {
    label: "Geo-Based Campaigns",
    tooltip: "Target your campaigns to viewers within a defined geographic radius — city, zip code, or region.",
    values: [false, false, false, false, true],
  },
  {
    label: "Automatic Coupon Trigger",
    tooltip: "Automatically send a coupon or discount code to a viewer when they complete a specific action — like finishing a video or clicking a CTA.",
    values: [false, false, false, false, true],
  },
];

function Cell({ value, tierColor }: { value: CellValue; tierColor: string }) {
  if (value === true) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Check style={{ width: 18, height: 18, color: tierColor }} strokeWidth={2.5} />
      </div>
    );
  }
  if (value === false) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Minus style={{ width: 16, height: 16, color: "#374151" }} />
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: tierColor }}>
      {value}
    </div>
  );
}

function FeatureTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              color: "#6b7280",
              flexShrink: 0,
            }}
            data-testid={`tooltip-${label.replace(/\s+/g, "-").toLowerCase()}`}
          >
            <HelpCircle style={{ width: 13, height: 13 }} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          style={{
            maxWidth: 280,
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "rgba(255,255,255,0.85)",
            fontSize: 12,
            lineHeight: 1.5,
            padding: "8px 12px",
            borderRadius: 8,
          }}
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function PricingPage() {
  return (
    <>
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        paddingTop: 60,
        paddingBottom: 80,
      }}
    >
      {/* Back button */}
      <div style={{ padding: "16px 24px" }}>
        <Link href="/">
          <div data-testid="link-back-home-pricing" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 999, cursor: "pointer", boxShadow: "0 0 16px rgba(255,43,43,0.35)", letterSpacing: "0.02em" }}>
            <ArrowLeft size={14} />
            Back to Gigzito
          </div>
        </Link>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "40px 24px 48px" }}>
        <div
          style={{
            display: "inline-block",
            background: "rgba(255,43,43,0.12)",
            border: "1px solid rgba(255,43,43,0.25)",
            borderRadius: 999,
            padding: "4px 16px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#ff4444",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Membership Ecosystem
        </div>
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            margin: "0 0 12px",
            background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Gigzito Membership Tiers
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto" }}>
          Every tier is free to start. Monetization launches soon.
        </p>
      </div>

      {/* Tier cards — mobile stack, desktop row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "0 24px 48px",
          maxWidth: 960,
          margin: "0 auto",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {TIERS.map((tier: any) => (
          <div
            key={tier.id}
            data-testid={`tier-card-${tier.id.toLowerCase()}`}
            style={{
              flex: "1 1 180px",
              maxWidth: 210,
              background: tier.comingSoon
                ? "rgba(6,182,212,0.04)"
                : tier.highlight
                  ? "linear-gradient(145deg, rgba(255,43,43,0.12), rgba(255,43,43,0.04))"
                  : "rgba(255,255,255,0.03)",
              border: tier.comingSoon
                ? "1px dashed rgba(6,182,212,0.3)"
                : tier.highlight ? "1px solid rgba(255,43,43,0.4)" : "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "24px 20px",
              position: "relative",
              opacity: tier.comingSoon ? 0.75 : 1,
            }}
          >
            {tier.highlight && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#ff2b2b", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 12px", borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Most Popular
              </div>
            )}
            {tier.comingSoon && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "3px 12px", borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Coming Soon
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 800, color: tier.color, marginBottom: 8 }}>
              {tier.name}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: tier.comingSoon ? "rgba(255,255,255,0.4)" : "#fff" }}>{tier.price}</span>
              {tier.priceNote && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{tier.priceNote}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.3 }}>
              {tier.type}
            </div>
            {tier.comingSoon && (
              <div style={{ marginTop: 12, fontSize: 10, color: "#06b6d4", fontWeight: 700, letterSpacing: "0.06em" }}>
                Details announced soon
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Feature comparison table */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr repeat(5, minmax(70px, 1fr))",
              background: "rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              padding: "14px 20px",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Feature
            </div>
            {TIERS.filter((t: any) => !t.comingSoon).map((tier) => (
              <div key={tier.id} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: tier.color }}>{tier.name}</div>
              </div>
            ))}
          </div>

          {/* Feature rows */}
          {FEATURES.map((feature, i) => (
            <div
              key={feature.label}
              data-testid={`feature-row-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr repeat(5, minmax(70px, 1fr))",
                padding: "13px 20px",
                gap: 8,
                borderBottom: i < FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                alignItems: "center",
              }}
            >
              <FeatureTooltip label={feature.label} tooltip={feature.tooltip} />
              {feature.values.map((val, ti) => (
                <Cell key={ti} value={val} tierColor={TIERS[ti].color} />
              ))}
            </div>
          ))}
        </div>

        {/* GZMetrics deep-dive */}
        <div
          style={{
            marginTop: 48,
            background: "linear-gradient(145deg, rgba(255,43,43,0.07), rgba(255,43,43,0.02))",
            border: "1px solid rgba(255,43,43,0.2)",
            borderRadius: 16,
            padding: "32px 28px",
          }}
          data-testid="gzmetrics-section"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                background: "rgba(255,43,43,0.15)",
                borderRadius: 8,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 800,
                color: "#ff4444",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              GZMarketerPro &amp; GZBusiness
            </div>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>
            GZMetrics — Advanced Creator Analytics
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 28px", lineHeight: 1.6 }}>
            The same level of insight used by major platforms — built directly into your Gigzito dashboard.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {/* Viewer Intelligence */}
            <div
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: "#ff4444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                Viewer Intelligence
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  "Average watch time",
                  "Total video views",
                  "Re-visits / repeat viewers",
                  "Viewer home city",
                  "Age range of viewers",
                ].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check style={{ width: 13, height: 13, color: "#ff4444", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Engagement Metrics */}
            <div
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: "#ff4444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                Engagement Metrics
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  "CTA click rate",
                  "Engagement rate",
                  "Campaign engagement",
                  "Video completion rate",
                  "Returning viewer percentage",
                ].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check style={{ width: 13, height: 13, color: "#ff4444", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lead Capture */}
            <div
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: "#ff4444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                Lead Capture Integration
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "0 0 10px" }}>
                When a viewer interacts with a CTA, you capture:
              </p>
              <ul style={{ margin: "0 0 14px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {["Name", "Email"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check style={{ width: 13, height: 13, color: "#ff4444", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "0 0 8px" }}>
                Leads are stored in your profile and can be:
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {["Exported to CSV", "Forwarded by email", "Viewed in your dashboard"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check style={{ width: 13, height: 13, color: "#ff4444", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Coming soon footer */}
        <div style={{ textAlign: "center", marginTop: 48, padding: "0 24px" }}>
          <div
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "16px 32px",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
              Payments launching soon
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              All features are currently available free while we build out billing.
            </div>
          </div>
        </div>
      </div>
    </div>
    <MoreBelow />
    </>
  );
}
