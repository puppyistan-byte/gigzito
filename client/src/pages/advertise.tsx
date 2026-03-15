import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import MoreBelow from "@/components/more-below";
import { Navbar } from "@/components/navbar";
import { Link } from "wouter";
import logoImg from "@assets/gigzito-logo-tight_1772926617316.png";
import { Zap, Monitor, Users, TrendingUp, CheckCircle, ChevronLeft, ChevronRight, CalendarDays, Megaphone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_SLOTS = 5;

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

type SlotMap = Record<string, { slot: number; available: boolean }[]>;

type Step = "calendar" | "slot" | "form" | "success";

export default function AdvertisePage() {
  const { toast } = useToast();
  const search = useSearch();
  const ref = new URLSearchParams(search).get("ref") ?? "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [monthOffset, setMonthOffset] = useState(0);
  const [step, setStep] = useState<Step>("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", notes: "" });

  const displayMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const startOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
  const endOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0);
  const rangeStart = toDateStr(startOfMonth);
  const rangeEnd = toDateStr(endOfMonth);

  const { data: availability = {}, isLoading: availLoading } = useQuery<SlotMap>({
    queryKey: ["/api/ads/availability", rangeStart, rangeEnd],
    queryFn: () =>
      fetch(`/api/ads/availability?start=${rangeStart}&end=${rangeEnd}`)
        .then((r) => r.json()),
    staleTime: 30_000,
  });

  const bookMutation = useMutation({
    mutationFn: async (data: object) => {
      const res = await fetch("/api/ads/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Booking failed");
      }
      return res.json();
    },
    onSuccess: () => setStep("success"),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function slotCountForDate(dateStr: string) {
    const slots = availability[dateStr];
    if (!slots) return { available: MAX_SLOTS, total: MAX_SLOTS };
    const available = slots.filter((s) => s.available).length;
    return { available, total: MAX_SLOTS };
  }

  function isPast(dateStr: string) {
    return new Date(dateStr) < today;
  }

  function handleDayClick(dateStr: string) {
    if (isPast(dateStr)) return;
    const { available } = slotCountForDate(dateStr);
    if (available === 0) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setStep("slot");
    setTimeout(() => {
      document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function handleSlotSelect(slot: number) {
    setSelectedSlot(slot);
    setStep("form");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;
    bookMutation.mutate({
      bookingDate: selectedDate,
      slotNumber: selectedSlot,
      advertiserName: form.name,
      advertiserEmail: form.email,
      notes: form.notes || null,
      amountCents: 0,
    });
  }

  const calendarDays: (Date | null)[] = [];
  const firstDow = startOfMonth.getDay();
  for (let i = 0; i < firstDow; i++) calendarDays.push(null);
  for (let d = new Date(startOfMonth); d <= endOfMonth; d = addDays(d, 1)) {
    calendarDays.push(new Date(d));
  }

  const monthLabel = displayMonth.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <>
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
          5 premium slots per day. Rotating every 25 seconds beside the video feed. No hay, just signal.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "center", gap: "48px", flexWrap: "wrap", padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        {[
          { label: "Slots Per Day", value: "5" },
          { label: "Rotation Interval", value: "25 sec" },
          { label: "Categories", value: "11" },
          { label: "Ad Display Size", value: "380×260px" },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", fontWeight: 900, color: "#ff2b2b", marginBottom: "6px" }}>{stat.value}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "64px 24px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          {[
            { icon: Monitor, title: "Always In View", desc: "Fixed right-rail panel — never scrolled past." },
            { icon: Users, title: "Motivated Audience", desc: "Entrepreneurs, marketers, and buyers actively seeking services." },
            { icon: TrendingUp, title: "Retina Sharp", desc: "760×520 source displayed at 380×260 — always crisp." },
            { icon: Zap, title: "Self-Serve Booking", desc: "Pick a date, pick a slot, go live — no emails needed." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(255,43,43,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                <Icon style={{ width: "20px", height: "20px", color: "#ff2b2b" }} />
              </div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>{title}</h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOOKING CALENDAR ───────────────────────────────────── */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <CalendarDays style={{ width: "22px", height: "22px", color: "#ff2b2b" }} />
            <h2 style={{ fontSize: "26px", fontWeight: 800, margin: 0 }}>Book a Slot</h2>
          </div>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
            Select an available day — then choose one of the 5 daily placement slots.
          </p>
        </div>

        {/* Calendar navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <button
            onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
            disabled={monthOffset === 0}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 14px", color: monthOffset === 0 ? "#333" : "#fff", cursor: monthOffset === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "14px" }}
            data-testid="button-prev-month"
          >
            <ChevronLeft style={{ width: "16px", height: "16px" }} /> Prev
          </button>
          <span style={{ fontWeight: 800, fontSize: "18px" }}>{monthLabel}</span>
          <button
            onClick={() => setMonthOffset((m) => Math.min(3, m + 1))}
            disabled={monthOffset === 3}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 14px", color: monthOffset === 3 ? "#333" : "#fff", cursor: monthOffset === 3 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "14px" }}
            data-testid="button-next-month"
          >
            Next <ChevronRight style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "6px" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", padding: "6px 0", letterSpacing: "0.05em" }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {availLoading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
            <Loader2 style={{ width: "24px", height: "24px", margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
            Loading availability…
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dateStr = toDateStr(day);
              const past = isPast(dateStr);
              const { available, total } = slotCountForDate(dateStr);
              const soldOut = available === 0;
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === toDateStr(today);

              let bg = "rgba(255,255,255,0.03)";
              let border = "1px solid rgba(255,255,255,0.07)";
              let cursor = "pointer";
              let opacity = 1;

              if (past) { bg = "transparent"; border = "1px solid rgba(255,255,255,0.04)"; cursor = "default"; opacity = 0.35; }
              else if (soldOut) { bg = "rgba(255,43,43,0.05)"; border = "1px solid rgba(255,43,43,0.15)"; cursor = "default"; }
              else if (isSelected) { bg = "rgba(255,43,43,0.15)"; border = "1px solid #ff2b2b"; }
              else if (available === total) { bg = "rgba(255,255,255,0.04)"; border = "1px solid rgba(255,255,255,0.09)"; }
              else { bg = "rgba(255,180,0,0.04)"; border = "1px solid rgba(255,180,0,0.15)"; }

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  style={{ borderRadius: "10px", padding: "10px 6px 8px", background: bg, border, cursor, opacity, transition: "all 0.15s", textAlign: "center", position: "relative" }}
                  data-testid={`day-${dateStr}`}
                >
                  {isToday && (
                    <div style={{ position: "absolute", top: "4px", right: "4px", width: "6px", height: "6px", borderRadius: "50%", background: "#ff2b2b" }} />
                  )}
                  <div style={{ fontSize: "15px", fontWeight: isToday ? 800 : 600, color: past ? "rgba(255,255,255,0.25)" : soldOut ? "rgba(255,43,43,0.5)" : "#fff", marginBottom: "6px" }}>
                    {day.getDate()}
                  </div>
                  {!past && (
                    soldOut ? (
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#ff2b2b", letterSpacing: "0.05em", textTransform: "uppercase" }}>Sold Out</div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "center", gap: "3px", flexWrap: "wrap" }}>
                        {Array.from({ length: total }).map((_, si) => {
                          const slotInfo = availability[dateStr]?.[si];
                          const avail = slotInfo ? slotInfo.available : true;
                          return (
                            <div
                              key={si}
                              style={{ width: "7px", height: "7px", borderRadius: "2px", background: avail ? "#22c55e" : "rgba(255,43,43,0.5)" }}
                            />
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
          {[
            { color: "#22c55e", label: "Available slot" },
            { color: "rgba(255,43,43,0.5)", label: "Booked slot" },
            { color: "rgba(255,180,0,0.7)", label: "Partial availability" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── BOOKING PANEL ── */}
        {step !== "calendar" && selectedDate && (
          <div id="booking-panel" style={{ marginTop: "40px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "32px", position: "relative" }}>

            {step === "success" ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <CheckCircle style={{ width: "32px", height: "32px", color: "#22c55e" }} />
                </div>
                <h3 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px" }}>Request Received!</h3>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "24px", lineHeight: 1.6 }}>
                  Your booking request for <strong>{selectedDate}</strong>, Slot {selectedSlot} is pending review.<br />
                  We'll confirm via email within 24 hours.
                </p>
                <button
                  onClick={() => { setStep("calendar"); setSelectedDate(null); setSelectedSlot(null); setForm({ name: "", email: "", notes: "" }); }}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "999px", padding: "10px 28px", color: "#fff", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                  data-testid="button-book-another"
                >
                  Book Another Date
                </button>
              </div>

            ) : step === "slot" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                  <button onClick={() => { setStep("calendar"); setSelectedDate(null); }} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "4px" }}>
                    <ChevronLeft style={{ width: "20px", height: "20px" }} />
                  </button>
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Select a Slot</div>
                    <div style={{ fontWeight: 800, fontSize: "18px" }}>{selectedDate}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
                  {Array.from({ length: MAX_SLOTS }).map((_, i) => {
                    const slotNum = i + 1;
                    const slotInfo = availability[selectedDate]?.[i];
                    const avail = slotInfo ? slotInfo.available : true;
                    return (
                      <button
                        key={slotNum}
                        disabled={!avail}
                        onClick={() => handleSlotSelect(slotNum)}
                        style={{
                          background: avail ? "rgba(34,197,94,0.08)" : "rgba(255,43,43,0.06)",
                          border: `2px solid ${avail ? "rgba(34,197,94,0.4)" : "rgba(255,43,43,0.25)"}`,
                          borderRadius: "12px",
                          padding: "20px 8px",
                          cursor: avail ? "pointer" : "not-allowed",
                          textAlign: "center",
                          transition: "all 0.15s",
                          opacity: avail ? 1 : 0.5,
                        }}
                        data-testid={`slot-${slotNum}`}
                      >
                        <div style={{ fontSize: "22px", fontWeight: 900, color: avail ? "#22c55e" : "#ff4444", marginBottom: "6px" }}>{slotNum}</div>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: avail ? "rgba(34,197,94,0.7)" : "rgba(255,43,43,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {avail ? "Open" : "Taken"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "16px", textAlign: "center" }}>
                  All 5 slots rotate equally — earlier slot numbers have no priority advantage.
                </p>
              </>

            ) : step === "form" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                  <button onClick={() => setStep("slot")} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "4px" }}>
                    <ChevronLeft style={{ width: "20px", height: "20px" }} />
                  </button>
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Your Details</div>
                    <div style={{ fontWeight: 800, fontSize: "18px" }}>{selectedDate} · Slot {selectedSlot}</div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Business / Advertiser Name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Acme Corp or Your Name"
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                      data-testid="input-advertiser-name"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contact Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@yourcompany.com"
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                      data-testid="input-advertiser-email"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes (optional)</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Landing page URL, referral code, anything we should know…"
                      rows={3}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", color: "#fff", fontSize: "14px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                      data-testid="input-advertiser-notes"
                    />
                  </div>
                  <div style={{ background: "rgba(255,43,43,0.06)", border: "1px solid rgba(255,43,43,0.15)", borderRadius: "10px", padding: "14px 16px", fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                    <strong style={{ color: "rgba(255,255,255,0.7)" }}>What happens next:</strong> Our team will review your request and contact you within 24 hours to complete the booking and collect your ad creative (760×520px PNG/JPG).
                  </div>
                  <button
                    type="submit"
                    disabled={bookMutation.isPending}
                    style={{ background: "linear-gradient(135deg, #ff2b2b, #cc0000)", color: "#fff", border: "none", borderRadius: "999px", padding: "14px 32px", fontWeight: 700, fontSize: "15px", cursor: bookMutation.isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: bookMutation.isPending ? 0.7 : 1, boxShadow: "0 4px 24px rgba(255,43,43,0.35)" }}
                    data-testid="button-submit-booking"
                  >
                    {bookMutation.isPending ? <><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Submitting…</> : <><Megaphone style={{ width: "16px", height: "16px" }} /> Request This Slot</>}
                  </button>
                </form>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Ad Specs */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px 64px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "20px" }}>Creative Specs</h2>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
          {[
            ["Display Size", "380 × 260px (panel width × image height)"],
            ["Recommended Upload", "760 × 520px @ 72dpi — auto-resized on upload"],
            ["File Formats", "JPG, PNG, WebP (max 8 MB)"],
            ["Headline", "Up to 60 characters"],
            ["Body Text", "Up to 120 characters"],
            ["CTA Button", "Custom label + destination URL"],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ display: "flex", gap: "16px", padding: "13px 20px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.35)", minWidth: "160px" }}>{label}</span>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>{value}</span>
            </div>
          ))}
        </div>
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
    <MoreBelow />
    </>
  );
}
