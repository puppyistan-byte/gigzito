import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Zap, CalendarDays, Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import type { TimeSlot, SlotAvailabilityResponse } from "@shared/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const formSchema = z.object({
  companyUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  artworkUrl: z.string().url("Must be a valid image URL"),
  offerTitle: z.string().min(5, "At least 5 characters").max(120),
  description: z.string().min(10, "At least 10 characters").max(500),
  ctaLink: z.string().url("Must be a valid URL"),
  countdownMinutes: z.coerce.number().int().min(1).max(30),
  couponCode: z.string().max(40).or(z.literal("")).optional(),
  quantityLimit: z.coerce.number().int().min(1).max(100000).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

// ─── Step Indicator ───────────────────────────────────────────────────────────

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
          <div className="flex items-center gap-1.5">
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

// ─── Month Calendar ───────────────────────────────────────────────────────────

function MonthCalendar({ selected, onSelect }: { selected: string | null; onSelect: (d: string) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 60);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = firstDayOfMonth.getDay();
  const totalCells = Math.ceil((startOffset + lastDayOfMonth.getDate()) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1;
    if (day < 1 || day > lastDayOfMonth.getDate()) {
      cells.push(null);
    } else {
      cells.push(new Date(viewYear, viewMonth, day));
    }
  }

  const canPrev = new Date(viewYear, viewMonth, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(viewYear, viewMonth + 1, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { if (!canPrev) return; if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); } else setViewMonth(viewMonth - 1); }}
          disabled={!canPrev}
          className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-[#1e1e1e] disabled:opacity-20"
          data-testid="btn-prev-month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">{MONTHS[viewMonth]} {viewYear}</span>
        <button
          onClick={() => { if (!canNext) return; if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); } else setViewMonth(viewMonth + 1); }}
          disabled={!canNext}
          className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-[#1e1e1e] disabled:opacity-20"
          data-testid="btn-next-month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#444] py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = toDateStr(d);
          const isPast = d < today;
          const isFuture = d > maxDate;
          const isDisabled = isPast || isFuture;
          const isSelected = selected === ds;
          const isToday = toDateStr(d) === toDateStr(today);

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onSelect(ds)}
              data-testid={`btn-date-${ds}`}
              className={`h-9 w-full rounded-lg text-sm font-medium transition-all ${
                isDisabled
                  ? "text-[#2a2a2a] cursor-not-allowed"
                  : isSelected
                  ? "bg-[#ff2b2b] text-white"
                  : isToday
                  ? "bg-[#1e1e1e] text-[#ff2b2b] border border-[#ff2b2b]/30"
                  : "text-[#999] hover:bg-[#1e1e1e] hover:text-white"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GigJackNewPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
        scheduledAt: selectedSlot!.scheduledAt,
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
      queryClient.invalidateQueries({ queryKey: ["/api/gigjacks/mine"] });
      toast({ title: "GigJack submitted!", description: "Awaiting admin approval." });
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message ?? "Please try again.", variant: "destructive" });
    },
  });

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

  if (submitted && selectedSlot) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold">Request Submitted!</h2>
          <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 text-sm text-left space-y-2 max-w-xs mx-auto">
            <p className="text-[#555] text-xs font-semibold uppercase tracking-wide">Your booking</p>
            <div className="flex items-center gap-2 text-white">
              <CalendarDays className="h-4 w-4 text-[#ff2b2b]" />
              <span>{formatDateFull(selectedDate!)}</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Clock className="h-4 w-4 text-[#ff2b2b]" />
              <span>{selectedSlot.label}</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Your Gig Jack request has been submitted for admin approval. You'll be notified once it goes live.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate("/provider/me")}>My Dashboard</Button>
            <Button
              onClick={() => { setSubmitted(false); setStep(1); setSelectedDate(null); setSelectedSlot(null); form.reset(); }}
              style={{ background: "#ff2b2b", border: "none" }}
            >
              Submit Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const slots = availability?.slots ?? [];
  const availableSlots = slots.filter((s) => s.available);
  const blockedSlots = slots.filter((s) => !s.available);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#ff2b2b]" />
          <div>
            <h1 className="text-xl font-bold">Book a GigJack</h1>
            <p className="text-xs text-[#555] mt-0.5">Pick a date and time, then describe your flash offer.</p>
          </div>
        </div>

        <StepIndicator step={step} />

        {/* ═══════════ STEP 1: DATE ═══════════ */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-date-picker">
            <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4">
              <p className="text-sm font-semibold text-white mb-4">Select a date</p>
              <MonthCalendar
                selected={selectedDate}
                onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
              />
            </div>

            {selectedDate && (
              <div className="text-center text-sm text-[#888]">
                Selected: <span className="text-white font-medium">{formatDateFull(selectedDate)}</span>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedDate}
              onClick={() => setStep(2)}
              style={{ background: selectedDate ? "#ff2b2b" : undefined, border: "none" }}
              data-testid="btn-continue-to-time"
            >
              Continue — Pick a Time
            </Button>
          </div>
        )}

        {/* ═══════════ STEP 2: TIME ═══════════ */}
        {step === 2 && selectedDate && (
          <div className="space-y-4" data-testid="step-time-picker">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(1)} className="text-[#555] hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-semibold text-white">Select a time slot</p>
                <p className="text-xs text-[#555]">{formatDateFull(selectedDate)} · 15-min intervals · max 2/hr · 15-min spacing</p>
              </div>
            </div>

            <div className="flex gap-4 text-xs text-[#555] flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#ff2b2b]/25 border border-[#ff2b2b]/40" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1a1a1a] border border-[#2a2a2a]" />Blocked</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#ff2b2b]/60 border border-[#ff2b2b]" />Selected</span>
            </div>

            {availLoading ? (
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-[#0b0b0b] border border-[#1e1e1e] animate-pulse" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-8 text-center text-[#444] text-sm">
                No available slots for this date (all past or fully booked).
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((slot) => {
                    const isBlocked = !slot.available;
                    const isSelected = selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        disabled={isBlocked}
                        onClick={() => setSelectedSlot(isSelected ? null : slot)}
                        data-testid={`btn-slot-${slot.time.replace(":", "")}`}
                        title={isBlocked ? slot.reason : undefined}
                        className={`flex flex-col items-center py-2 px-1 rounded-lg border transition-all text-center ${
                          isBlocked
                            ? "bg-[#0a0a0a] border-[#1a1a1a] text-[#2a2a2a] cursor-not-allowed"
                            : isSelected
                            ? "bg-[#ff2b2b]/20 border-[#ff2b2b]/70 text-white ring-1 ring-[#ff2b2b]/40"
                            : "bg-[#ff2b2b]/06 border-[#ff2b2b]/20 text-[#ccc] hover:bg-[#ff2b2b]/12 hover:border-[#ff2b2b]/40 hover:text-white"
                        }`}
                      >
                        <span className="text-xs font-semibold leading-tight">{slot.label}</span>
                        {isBlocked && (
                          <span className="text-[8px] text-[#333] mt-0.5 leading-tight">
                            {slot.approvedInHour >= 2 ? "Full" : "Buffered"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {availableSlots.length === 0 && (
                  <div className="rounded-xl bg-amber-500/08 border border-amber-500/20 p-3 flex items-center gap-2 text-xs text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    All time slots for this date are blocked. Please choose a different date.
                  </div>
                )}

                {blockedSlots.length > 0 && availableSlots.length > 0 && (
                  <p className="text-xs text-[#444]">
                    {blockedSlots.length} slot{blockedSlots.length !== 1 ? "s" : ""} blocked by 15-min buffer or hour cap · {availableSlots.length} available
                  </p>
                )}
              </>
            )}

            <Button
              className="w-full"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              style={{ background: selectedSlot ? "#ff2b2b" : undefined, border: "none" }}
              data-testid="btn-continue-to-offer"
            >
              Continue — Add Offer Details
            </Button>
          </div>
        )}

        {/* ═══════════ STEP 3: FORM ═══════════ */}
        {step === 3 && (
          <div className="space-y-5" data-testid="step-offer-form">
            <div className="rounded-xl bg-[#0b0b0b] border border-[#ff2b2b]/20 p-3 flex items-center gap-3">
              <Zap className="h-4 w-4 text-[#ff2b2b] shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                <span className="text-white font-semibold">{formatDateFull(selectedDate!)}</span>
                <span className="text-[#555] mx-2">·</span>
                <span className="text-[#ff2b2b] font-medium">{selectedSlot?.label}</span>
              </div>
              <button onClick={() => setStep(2)} className="text-xs text-[#555] hover:text-white underline shrink-0" data-testid="btn-change-slot">
                Change
              </button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => submitMutation.mutate(d))} className="space-y-5">

                <div className="rounded-xl bg-[#ff2b2b]/04 border border-[#ff2b2b]/12 p-4 space-y-4">
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Company & Artwork</p>

                  <FormField control={form.control} name="companyUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company URL <span className="text-[#555] font-normal">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="https://yourcompany.com" data-testid="input-gigjack-company-url" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="artworkUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artwork Image URL</FormLabel>
                      <FormControl><Input placeholder="https://..." data-testid="input-gigjack-artwork-url" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Host on <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="underline">Imgur</a> and paste the direct link.</p>
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
                      <FormControl><Input placeholder="e.g. 50% off all plans — today only" data-testid="input-gigjack-offer-title" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="What makes this offer compelling…" rows={3} data-testid="input-gigjack-description" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="ctaLink" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA Link</FormLabel>
                      <FormControl><Input placeholder="https://yourcompany.com/deal" data-testid="input-gigjack-cta-link" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="countdownMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Countdown <span className="text-[#555] font-normal">(minutes)</span></FormLabel>
                      <FormControl><Input type="number" min={1} max={30} placeholder="10" data-testid="input-gigjack-countdown" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="rounded-xl bg-white/[0.02] border border-white/[0.07] p-4 space-y-4">
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Optional Extras</p>

                  <FormField control={form.control} name="couponCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code <span className="text-[#555] font-normal">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="e.g. LAUNCH50" data-testid="input-gigjack-coupon-code" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="quantityLimit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Limit <span className="text-[#555] font-normal">(optional)</span></FormLabel>
                      <FormControl><Input type="number" min={1} placeholder="e.g. 50" data-testid="input-gigjack-quantity-limit" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="shrink-0">
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
