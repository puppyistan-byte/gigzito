import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Zap, CalendarDays, Clock, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import type { HourSlot, SlotAvailabilityResponse } from "@shared/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateRange(days = 14): { date: string; label: string; short: string; dayName: string }[] {
  const result = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const short = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayName = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    result.push({ date: iso, label, short, dayName });
  }
  return result;
}

// ─── Form schema (offer details) ─────────────────────────────────────────────

const formSchema = z.object({
  companyUrl: z.string().url("Must be a valid URL (include https://)").or(z.literal("")),
  artworkUrl: z.string().url("Must be a valid image URL"),
  offerTitle: z.string().min(5, "At least 5 characters").max(120),
  description: z.string().min(10, "At least 10 characters").max(500),
  ctaLink: z.string().url("Must be a valid URL"),
  countdownMinutes: z.coerce.number().int().min(1).max(30),
  couponCode: z.string().max(40).optional().or(z.literal("")),
  quantityLimit: z.coerce.number().int().min(1).max(100000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Choose Date" },
    { n: 2, label: "Pick Time" },
    { n: 3, label: "Offer Details" },
  ];
  return (
    <div className="flex items-center gap-1 mb-6" data-testid="stepper-gigjack">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1 flex-1">
          <div className={`flex items-center gap-1.5 ${step >= s.n ? "text-white" : "text-[#444]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              step > s.n ? "bg-green-500 text-white" : step === s.n ? "bg-[#ff2b2b] text-white" : "bg-[#1e1e1e] text-[#444]"
            }`}>
              {step > s.n ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === s.n ? "text-white" : step > s.n ? "text-green-400" : "text-[#444]"}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-1 ${step > s.n ? "bg-green-500/40" : "bg-[#1e1e1e]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function GigJackNewPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [dateOffset, setDateOffset] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const dateRange = getDateRange(14);
  const visibleDates = dateRange.slice(dateOffset, dateOffset + 7);
  const selectedDateInfo = dateRange.find((d) => d.date === selectedDate);

  const { data: availability, isLoading: availLoading } = useQuery<SlotAvailabilityResponse>({
    queryKey: ["/api/gigjacks/availability", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/gigjacks/availability?date=${selectedDate}`);
      return res.json();
    },
    enabled: !!selectedDate,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyUrl: "",
      artworkUrl: "",
      offerTitle: "",
      description: "",
      ctaLink: "",
      countdownMinutes: 10,
      couponCode: "",
      quantityLimit: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/gigjacks/submit", {
        ...data,
        bookedDate: selectedDate,
        bookedHour: selectedHour,
        quantityLimit: data.quantityLimit === "" ? null : Number(data.quantityLimit),
        couponCode: data.couponCode === "" ? null : data.couponCode,
        companyUrl: data.companyUrl || data.ctaLink,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message ?? "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "GigJack request submitted!", description: "Awaiting admin approval." });
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message ?? "Please try again.", variant: "destructive" });
    },
  });

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">You must be logged in to submit a GigJack.</p>
          <Button onClick={() => navigate("/auth")}>Log In</Button>
        </div>
      </div>
    );
  }

  // ── Submitted ────────────────────────────────────────────────────────────
  if (submitted) {
    const hourSlot = availability?.hours.find((h) => h.hour === selectedHour);
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold">Request Submitted!</h2>
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 text-sm text-left space-y-1.5 max-w-xs mx-auto">
            <p className="text-[#555] text-xs font-semibold uppercase tracking-wide mb-2">Your booking</p>
            <div className="flex items-center gap-2 text-white">
              <CalendarDays className="h-4 w-4 text-[#ff2b2b]" />
              <span>{selectedDateInfo?.dayName}</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Clock className="h-4 w-4 text-[#ff2b2b]" />
              <span>{hourSlot?.label ?? `${selectedHour}:00`}</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your Gig Jack request has been submitted and is awaiting admin approval. You'll be notified once it goes live.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate("/provider/me")}>My Dashboard</Button>
            <Button
              onClick={() => { setSubmitted(false); setStep(1); setSelectedDate(null); setSelectedHour(null); form.reset(); }}
              style={{ background: "#ff2b2b", border: "none" }}
            >
              Submit Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#ff2b2b]" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Book a GigJack</h1>
            <p className="text-xs text-[#555] mt-0.5">Select a date and time slot, then describe your offer.</p>
          </div>
        </div>

        <StepIndicator step={step} />

        {/* ═══════════════════════ STEP 1: DATE ═══════════════════════ */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-date-picker">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Select a date</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setDateOffset(Math.max(0, dateOffset - 7))}
                  disabled={dateOffset === 0}
                  className="p-1 rounded text-[#555] hover:text-white disabled:opacity-30"
                  data-testid="btn-prev-week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDateOffset(Math.min(7, dateOffset + 7))}
                  disabled={dateOffset >= 7}
                  className="p-1 rounded text-[#555] hover:text-white disabled:opacity-30"
                  data-testid="btn-next-week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {visibleDates.map((d) => {
                const isSelected = selectedDate === d.date;
                return (
                  <button
                    key={d.date}
                    onClick={() => { setSelectedDate(d.date); setSelectedHour(null); }}
                    data-testid={`btn-date-${d.date}`}
                    className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-[#ff2b2b]/15 border-[#ff2b2b]/50 text-white"
                        : "bg-[#0b0b0b] border-[#1e1e1e] text-[#666] hover:border-[#333] hover:text-white"
                    }`}
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-wider">{d.short}</span>
                    <span className={`text-base font-bold mt-0.5 ${isSelected ? "text-[#ff2b2b]" : ""}`}>{d.label.split(" ")[1]}</span>
                    <span className="text-[9px] mt-0.5 opacity-60">{d.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>

            <Button
              className="w-full mt-2"
              disabled={!selectedDate}
              onClick={() => setStep(2)}
              style={{ background: selectedDate ? "#ff2b2b" : undefined, border: "none" }}
              data-testid="btn-continue-to-time"
            >
              Continue — Pick a Time
            </Button>
          </div>
        )}

        {/* ═══════════════════════ STEP 2: TIME ═══════════════════════ */}
        {step === 2 && selectedDate && (
          <div className="space-y-4" data-testid="step-time-picker">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(1)} className="text-[#555] hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-semibold text-white">Select a time slot</p>
                <p className="text-xs text-[#555]">{selectedDateInfo?.dayName} · max 2 GigJacks per hour</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-[#555]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#ff2b2b]/30 border border-[#ff2b2b]/40" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/30" />1 booked</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1e1e1e] border border-[#2a2a2a]" />Full</span>
            </div>

            {availLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(availability?.hours ?? []).map((slot: HourSlot) => {
                  const isFull = !slot.available;
                  const isSelected = selectedHour === slot.hour;
                  const halfBooked = slot.approvedCount === 1;

                  return (
                    <button
                      key={slot.hour}
                      disabled={isFull}
                      onClick={() => setSelectedHour(isSelected ? null : slot.hour)}
                      data-testid={`btn-hour-${slot.hour}`}
                      className={`flex flex-col items-center py-3 px-2 rounded-xl border transition-all text-center ${
                        isFull
                          ? "bg-[#0a0a0a] border-[#1a1a1a] text-[#333] cursor-not-allowed"
                          : isSelected
                          ? "bg-[#ff2b2b]/15 border-[#ff2b2b]/50 text-white"
                          : halfBooked
                          ? "bg-amber-500/8 border-amber-500/25 text-amber-300 hover:border-amber-500/40"
                          : "bg-[#ff2b2b]/5 border-[#ff2b2b]/20 text-white hover:bg-[#ff2b2b]/10 hover:border-[#ff2b2b]/40"
                      }`}
                    >
                      <span className="text-sm font-bold">{slot.label}</span>
                      <span className={`text-[10px] mt-0.5 ${
                        isFull ? "text-[#333]" : halfBooked ? "text-amber-400/70" : "text-[#ff2b2b]/60"
                      }`}>
                        {isFull ? "Full" : `${slot.approvedCount}/2 booked`}
                      </span>
                      {slot.pendingCount > 0 && !isFull && (
                        <span className="text-[9px] text-[#555] mt-0.5">{slot.pendingCount} pending</span>
                      )}
                    </button>
                  );
                })}
                {(availability?.hours ?? []).length === 0 && (
                  <div className="col-span-3 text-center py-8 text-[#444] text-sm">
                    No available slots for this date.
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={selectedHour === null}
              onClick={() => setStep(3)}
              style={{ background: selectedHour !== null ? "#ff2b2b" : undefined, border: "none" }}
              data-testid="btn-continue-to-offer"
            >
              Continue — Add Offer Details
            </Button>
          </div>
        )}

        {/* ═══════════════════════ STEP 3: OFFER FORM ═══════════════════════ */}
        {step === 3 && (
          <div className="space-y-5" data-testid="step-offer-form">
            {/* Booking summary bar */}
            <div className="rounded-xl bg-[#0b0b0b] border border-[#ff2b2b]/20 p-3 flex items-center gap-3">
              <Zap className="h-4 w-4 text-[#ff2b2b] shrink-0" />
              <div className="flex-1 text-sm">
                <span className="text-white font-semibold">{selectedDateInfo?.dayName}</span>
                <span className="text-[#555] mx-2">·</span>
                <span className="text-[#ff2b2b] font-medium">{availability?.hours.find((h) => h.hour === selectedHour)?.label ?? `${selectedHour}:00`}</span>
              </div>
              <button
                onClick={() => setStep(2)}
                className="text-xs text-[#555] hover:text-white underline"
                data-testid="btn-change-slot"
              >
                Change
              </button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => submitMutation.mutate(d))} className="space-y-5">

                <div className="rounded-xl bg-[#ff2b2b]/04 border border-[#ff2b2b]/12 p-4 space-y-4">
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Company & Offer</p>
                  <FormField control={form.control} name="companyUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company URL <span className="text-[#555] font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourcompany.com" data-testid="input-gigjack-company-url" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="artworkUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artwork Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." data-testid="input-gigjack-artwork-url" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Host on <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="underline">Imgur</a> or similar and paste the direct link.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {form.watch("artworkUrl") && (
                    <div className="rounded-lg overflow-hidden w-24">
                      <img src={form.watch("artworkUrl")} alt="Preview" className="w-24 h-16 object-cover block"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        data-testid="img-gigjack-artwork-preview" />
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white/[0.02] border border-white/[0.07] p-4 space-y-4">
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Offer Details</p>
                  <FormField control={form.control} name="offerTitle" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 50% off all plans — today only" data-testid="input-gigjack-offer-title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What makes this offer compelling…" rows={3} data-testid="input-gigjack-description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ctaLink" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourcompany.com/deal" data-testid="input-gigjack-cta-link" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="countdownMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Countdown Duration <span className="text-[#555] font-normal">(minutes)</span></FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={30} placeholder="10" data-testid="input-gigjack-countdown" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">1–30 minutes. Creates urgency when displayed.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="rounded-xl bg-white/[0.02] border border-white/[0.07] p-4 space-y-4">
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Optional Extras</p>
                  <FormField control={form.control} name="couponCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code <span className="text-[#555] font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. LAUNCH50" data-testid="input-gigjack-coupon-code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="quantityLimit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Limit <span className="text-[#555] font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="e.g. 50" data-testid="input-gigjack-quantity-limit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-shrink-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-gigjack"
                    style={{ background: "#ff2b2b", color: "#fff", border: "none" }}
                  >
                    {submitMutation.isPending ? "Submitting…" : "Submit GigJack Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

      </div>
    </div>
  );
}
