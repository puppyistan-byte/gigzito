import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Download, Package, Loader2, RotateCcw, MapPin, Truck, Clock } from "lucide-react";
import type { ProviderProfile } from "@shared/schema";
import gigzitoLogoPath from "@assets/reoverblack_1772857110054.jpg";

const CARD_W = 350;
const CARD_H = 200;

const QUANTITIES = [50, 100, 250, 500];

interface GigCardSectionProps {
  profile: ProviderProfile;
}

function CardFront({ qrDataUrl, size = CARD_W }: { qrDataUrl: string | null; size?: number }) {
  const h = Math.round(size * (CARD_H / CARD_W));
  const scale = size / CARD_W;
  const qrSize = 108 * scale;
  const qrRight = 14 * scale;
  const qrTop = 16 * scale;
  return (
    <div
      style={{
        width: size,
        height: h,
        background: "#000",
        borderRadius: 8 * scale,
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        flexShrink: 0,
      }}
      data-testid="gig-card-front"
    >
      {/* Official logo image – fills the left portion; black bg blends naturally */}
      <img
        src={gigzitoLogoPath}
        alt="Gigzito"
        style={{
          position: "absolute",
          left: -10 * scale,
          top: "50%",
          transform: "translateY(-52%)",
          width: 220 * scale,
          height: "auto",
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />

      {/* QR code - right column */}
      <div
        style={{
          position: "absolute",
          right: qrRight,
          top: qrTop,
          width: qrSize,
          height: qrSize,
          background: "#fff",
          borderRadius: 4 * scale,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <Loader2 size={20 * scale} style={{ color: "#999", animation: "spin 1s linear infinite" }} />
        )}
      </div>

      {/* Scan text */}
      <div style={{
        position: "absolute",
        right: qrRight,
        top: qrTop + qrSize + 4 * scale,
        width: qrSize,
        textAlign: "center",
        fontSize: 7 * scale,
        color: "rgba(255,255,255,0.35)",
        letterSpacing: 0.3 * scale,
        fontFamily: "Arial, sans-serif",
      }}>
        Scan to unlock my gigs
      </div>

      {/* Bottom red bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24 * scale, background: "#ff2b2b", display: "flex", alignItems: "center", paddingLeft: 14 * scale }}>
        <span style={{ fontSize: 7 * scale, color: "#fff", fontWeight: 700, letterSpacing: 1.2 * scale, textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
          gigzito.com
        </span>
      </div>
    </div>
  );
}

function CardBack({ profile, size = CARD_W }: { profile: ProviderProfile; size?: number }) {
  const h = Math.round(size * (CARD_H / CARD_W));
  const scale = size / CARD_W;
  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/provider/${profile.username ?? profile.id}`
    : `/provider/${profile.username ?? profile.id}`;

  const roleLabel = profile.primaryCategory
    ? profile.primaryCategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Creator";

  return (
    <div
      style={{
        width: size,
        height: h,
        background: "#0a0a0a",
        borderRadius: 8 * scale,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Arial', sans-serif",
        userSelect: "none",
        flexShrink: 0,
      }}
      data-testid="gig-card-back"
    >
      {/* Red left border */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4 * scale, background: "#ff2b2b" }} />

      {/* Red top-right corner decorative diamond */}
      <div style={{
        position: "absolute",
        top: -24 * scale,
        right: -24 * scale,
        width: 80 * scale,
        height: 80 * scale,
        background: "rgba(255,43,43,0.12)",
        transform: "rotate(45deg)",
      }} />

      {/* Content centered */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 * scale }}>
        <div style={{ fontSize: 19 * scale, fontWeight: 800, color: "#fff", letterSpacing: -0.5 * scale, textAlign: "center", paddingLeft: 8 * scale }}>
          {profile.displayName || "Creator"}
        </div>
        <div style={{ fontSize: 9 * scale, color: "#ff2b2b", fontWeight: 700, letterSpacing: 1.5 * scale, textTransform: "uppercase", textAlign: "center" }}>
          {roleLabel} · Gigzito
        </div>
        {profile.contactEmail && (
          <div style={{ fontSize: 7.5 * scale, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 4 * scale }}>
            {profile.contactEmail}
          </div>
        )}
        <div style={{ fontSize: 7 * scale, color: "rgba(255,43,43,0.6)", textAlign: "center", marginTop: 2 * scale, wordBreak: "break-all", paddingLeft: 8 * scale }}>
          {profileUrl}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 22 * scale, background: "rgba(255,43,43,0.08)", borderTop: `1px solid rgba(255,43,43,0.2)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 6.5 * scale, color: "rgba(255,255,255,0.2)", letterSpacing: 2 * scale, textTransform: "uppercase" }}>
          Getcho Gig On!
        </span>
      </div>
    </div>
  );
}

export function GigCardSection({ profile }: GigCardSectionProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [face, setFace] = useState<"front" | "back">("front");
  const [showOrder, setShowOrder] = useState(false);
  const [quantity, setQuantity] = useState(100);
  const [generating, setGenerating] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", address: "", city: "", zip: "", country: "" });

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/provider/${profile.username ?? profile.id}`
    : `/provider/${profile.username ?? profile.id}`;

  useEffect(() => {
    import("qrcode").then((mod) => {
      const QRCode = mod.default ?? mod;
      QRCode.toDataURL(profileUrl, {
        width: 400,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      }).then((url: string) => setQrDataUrl(url));
    });
  }, [profileUrl]);

  const handleDownloadPDF = async () => {
    if (!qrDataUrl) {
      toast({ title: "QR code still loading", description: "Please wait a moment and try again.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "in", format: [3.5, 2] });

      // Fetch logo as base64 data URL for PDF embedding
      const logoDataUrl = await fetch(gigzitoLogoPath)
        .then((r) => r.blob())
        .then((blob) => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        }));

      const roleLabel = profile.primaryCategory
        ? profile.primaryCategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "Creator";

      // ── PAGE 1: FRONT ──
      doc.setFillColor("#000000");
      doc.rect(0, 0, 3.5, 2, "F");

      // Official Gigzito logo image (left column, black bg blends)
      // Logo native ratio: 1022×563 ≈ 1.815:1
      // Target: 1.9" wide × 1.05" tall, nudged left so scripts don't clip
      doc.addImage(logoDataUrl, "JPEG", -0.08, 0.35, 1.9, 1.05);

      // QR code (right side)
      doc.addImage(qrDataUrl, "PNG", 2.26, 0.17, 1.06, 1.06);

      // "Scan to unlock my gigs"
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text("Scan to unlock my gigs", 2.79, 1.33, { align: "center" });

      // Red bottom bar
      doc.setFillColor("#ff2b2b");
      doc.rect(0, 1.73, 3.5, 0.27, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor("#ffffff");
      doc.text("GIGZITO.COM", 0.18, 1.9);

      // ── PAGE 2: BACK ──
      doc.addPage([3.5, 2], "landscape");

      doc.setFillColor("#0a0a0a");
      doc.rect(0, 0, 3.5, 2, "F");

      // Red left border
      doc.setFillColor("#ff2b2b");
      doc.rect(0, 0, 0.05, 2, "F");

      // Creator name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor("#ffffff");
      doc.text(profile.displayName || "Creator", 1.75, 0.75, { align: "center" });

      // Role
      doc.setFontSize(8.5);
      doc.setTextColor("#ff2b2b");
      doc.text(`${roleLabel.toUpperCase()} · GIGZITO`, 1.75, 0.96, { align: "center" });

      // Email
      if (profile.contactEmail) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 90);
        doc.text(profile.contactEmail, 1.75, 1.13, { align: "center" });
      }

      // Profile URL
      doc.setFontSize(6.5);
      doc.setTextColor(120, 40, 40);
      doc.text(profileUrl, 1.75, 1.32, { align: "center" });

      // Bottom bar
      doc.setFillColor(20, 5, 5);
      doc.rect(0, 1.77, 3.5, 0.23, "F");
      doc.setFontSize(5.5);
      doc.setTextColor(50, 50, 50);
      doc.text("GETCHO GIG ON!", 1.75, 1.92, { align: "center" });

      doc.save(`gigzito-card-${profile.username ?? profile.id}.pdf`);
      toast({ title: "Card downloaded!", description: "Print-ready PDF saved — 3.5 × 2 inches." });
    } catch (err) {
      console.error(err);
      toast({ title: "PDF generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const pricePerCard = quantity >= 500 ? 0.12 : quantity >= 250 ? 0.15 : quantity >= 100 ? 0.18 : 0.22;
  const subtotal = (quantity * pricePerCard + 4.99).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white" data-testid="text-gig-cards-title">Gig Cards</h2>
        <span className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">Business Card Generator</span>
      </div>

      {/* Card Preview */}
      <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4">

        {/* Toggle front/back */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFace("front")}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${face === "front" ? "bg-[#ff2b2b] text-white" : "bg-[#1a1a1a] text-[#666] hover:text-white"}`}
            data-testid="button-card-front"
          >
            Front
          </button>
          <button
            onClick={() => setFace("back")}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${face === "back" ? "bg-[#ff2b2b] text-white" : "bg-[#1a1a1a] text-[#666] hover:text-white"}`}
            data-testid="button-card-back"
          >
            Back
          </button>
          <button
            onClick={() => setFace(face === "front" ? "back" : "front")}
            className="ml-auto text-[#555] hover:text-white transition-colors"
            title="Flip card"
            data-testid="button-flip-card"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card visual */}
        <div className="flex justify-center">
          {face === "front"
            ? <CardFront qrDataUrl={qrDataUrl} />
            : <CardBack profile={profile} />
          }
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFace(face === "front" ? "back" : "front")}
            className="text-xs text-[#888] hover:text-white border border-[#2a2a2a] hover:border-[#444] rounded-lg h-8"
            data-testid="button-generate-card"
          >
            <CreditCard className="h-3 w-3 mr-1.5" />
            Generate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownloadPDF}
            disabled={generating || !qrDataUrl}
            className="text-xs text-[#888] hover:text-white border border-[#2a2a2a] hover:border-[#444] rounded-lg h-8"
            data-testid="button-download-pdf"
          >
            {generating
              ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              : <Download className="h-3 w-3 mr-1.5" />
            }
            Download PDF
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowOrder(!showOrder)}
            className="text-xs text-[#888] hover:text-white border border-[#2a2a2a] hover:border-[#444] rounded-lg h-8"
            data-testid="button-order-cards"
          >
            <Package className="h-3 w-3 mr-1.5" />
            Order Cards
          </Button>
        </div>

        <p className="text-[10px] text-[#444] text-center">
          Print-ready PDF · 3.5 × 2 in · 300 DPI · Double-sided
        </p>
      </div>

      {/* Order System */}
      {showOrder && (
        <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-4" data-testid="section-order-cards">

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Order Printed Cards</h3>
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
              Coming Soon
            </span>
          </div>

          {/* Card mini preview */}
          <div className="flex gap-3 items-center overflow-hidden">
            <CardFront qrDataUrl={qrDataUrl} size={140} />
            <CardBack profile={profile} size={140} />
          </div>

          {/* Quantity selector */}
          <div className="space-y-2">
            <Label className="text-[#aaa] text-xs">Quantity</Label>
            <div className="grid grid-cols-4 gap-2">
              {QUANTITIES.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`rounded-lg border py-2 text-xs font-bold transition-colors ${quantity === q ? "border-[#ff2b2b] bg-[#ff2b2b]/10 text-[#ff2b2b]" : "border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#444]"}`}
                  data-testid={`button-qty-${q}`}
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#555]">
              ${pricePerCard.toFixed(2)}/card · Est. total: <strong className="text-[#ff2b2b]">${subtotal}</strong> (incl. shipping)
            </p>
          </div>

          {/* Shipping address */}
          <div className="space-y-3">
            <Label className="text-[#aaa] text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Shipping Address
            </Label>
            <Input
              placeholder="Full name"
              value={orderForm.name}
              onChange={(e) => setOrderForm((p) => ({ ...p, name: e.target.value }))}
              className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] text-sm h-9"
              data-testid="input-order-name"
            />
            <Input
              placeholder="Street address"
              value={orderForm.address}
              onChange={(e) => setOrderForm((p) => ({ ...p, address: e.target.value }))}
              className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] text-sm h-9"
              data-testid="input-order-address"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={orderForm.city}
                onChange={(e) => setOrderForm((p) => ({ ...p, city: e.target.value }))}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] text-sm h-9 col-span-1"
                data-testid="input-order-city"
              />
              <Input
                placeholder="ZIP"
                value={orderForm.zip}
                onChange={(e) => setOrderForm((p) => ({ ...p, zip: e.target.value }))}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] text-sm h-9"
                data-testid="input-order-zip"
              />
              <Input
                placeholder="Country"
                value={orderForm.country}
                onChange={(e) => setOrderForm((p) => ({ ...p, country: e.target.value }))}
                className="bg-[#111] border-[#2a2a2a] text-white placeholder:text-[#444] text-sm h-9"
                data-testid="input-order-country"
              />
            </div>
          </div>

          {/* Checkout CTA */}
          <Button
            className="w-full bg-[#ff1a1a]/30 hover:bg-[#ff1a1a]/40 text-[#ff6666] font-bold rounded-xl h-10 text-sm border border-[#ff1a1a]/20 cursor-not-allowed"
            disabled
            data-testid="button-order-checkout"
          >
            <Truck className="h-4 w-4 mr-2" />
            Proceed to Checkout
            <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">Soon</span>
          </Button>

          <div className="flex items-center gap-2 text-[10px] text-[#444]">
            <Clock className="h-3 w-3 shrink-0" />
            <span>Cards printed and shipped within 5–7 business days. Fulfilled via a print partner. A small processing fee is added above printing cost.</span>
          </div>
        </div>
      )}
    </div>
  );
}
