import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Zap, CalendarDays, Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { TimeSlot, SlotAvailabilityResponse } from "@shared/schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const ADVANCE_DAYS = 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime12(hour: number, minute: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = String(minute).padStart(2, "0");
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${m} ${ampm}`;
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const formSchema = z.object({
  companyUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  artworkUrl: z.string().url("Must be a valid image URL"),
  offerTitle: z.string().min(5, "At least 5 characters").max(120),
  description: z.string().min(10, "At least 10 characters").max(500),
  ctaLink: z.string().url("Must be a valid URL"),
  countdownMinutes: z.coerce.number().int().min(1).max(30),
  flashDurationSeconds: z.coerce.number().int().min(5).max(60).default(7),
  offerDurationMinutes: z.coerce.number().int().min(10).max(1440).default(60),
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
  maxDate.setDate(today.getDate() + ADVANCE_DAYS);

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

  const prevMonth = () => {
    if (!canPrev) return;
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (!canNext) return;
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div>
      {/* Month/Year nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canPrev}
          className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-[#1e1e1e] disabled:opacity-20 transition-colors"
          data-testid="btn-prev-month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <span className="text-sm font-semibold text-white">{MONTHS[viewMonth]} {viewYear}</span>
          <p className="text-[10px] text-[#444] mt-0.5">Up to {ADVANCE_DAYS} days ahead</p>
        </div>
        <button
          onClick={nextMonth}
          disabled={!canNext}
          className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-[#1e1e1e] disabled:opacity-20 transition-colors"
          data-testid="btn-next-month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#444] py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = toDateStr(d);
          const isPast = d < today;
          const isBeyond = d > maxDate;
          const isDisabled = isPast || isBeyond;
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
                  ? "bg-[#ff2b2b] text-white shadow-md"
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

// ─── Time Picker ──────────────────────────────────────────────────────────────

interface TimePickerProps {
  selectedDate: string;
  slots: TimeSlot[];
  loading: boolean;
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot | null) => void;
  minLeadMinutes: number;
}

function TimePicker({ selectedDate, slots, loading, selectedSlot, onSelect, minLeadMinutes }: TimePickerProps) {
  const [pickedHour, setPickedHour] = useState<number | null>(null);
  const [pickedMinute, setPickedMinute] = useState<number | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  const leadBlockedMs = Date.now() + minLeadMinutes * 60 * 1000;

  const leadErrorMsg =
    minLeadMinutes <= 1
      ? "Test scheduling requires at least 1 minute lead time."
      : minLeadMinutes === 30
        ? "Corporate GigJacks must be scheduled at least 30 minutes in advance."
        : "GigJacks must be scheduled at least 1 hour in advance.";

  const slotMap = useMemo(() => {
    const m = new Map<string, TimeSlot>();
    for (const s of slots) m.set(s.time, s);
    return m;
  }, [slots]);

  const handleTimeChange = (hour: number, minute: number) => {
    setPickedHour(hour);
    setPickedMinute(minute);

    const timeKey = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const slot = slotMap.get(timeKey);

    if (!slot) {
      setConflictMsg("That time is outside available scheduling hours.");
      onSelect(null);
      return;
    }

    if (!slot.available) {
      if (slot.approvedInHour >= 2) {
        setConflictMsg("This hour already has 2 approved GigJacks. Please choose a different hour.");
      } else {
        setConflictMsg("GigJacks must be at least 15 minutes apart. That time is unavailable.");
      }
      onSelect(null);
    } else {
      const slotMs = new Date(slot.scheduledAt).getTime();
      if (slotMs < leadBlockedMs) {
        setConflictMsg(leadErrorMsg);
        onSelect(null);
      } else {
        setConflictMsg(null);
        onSelect(slot);
      }
    }
  };

  const isLeadBlocked = (slot: TimeSlot) => new Date(slot.scheduledAt).getTime() < leadBlockedMs;
  const availableCount = slots.filter((s) => s.available && !isLeadBlocked(s)).length;
  const allBlocked = slots.length > 0 && availableCount === 0;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] animate-pulse" />
          <div className="h-14 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-[#0b0b0b] border border-[#1e1e1e] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (allBlocked) {
    return (
      <div className="rounded-xl bg-amber-500/08 border border-amber-500/20 p-4 flex items-start gap-3 text-sm text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">No available times on this date</p>
          <p className="text-xs text-amber-400/70">All time slots are blocked by the 2-per-hour cap or 15-minute spacing rule. Please go back and choose a different date.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Manual time selectors */}
      <div className="rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] p-4 space-y-3">
        <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">Choose a time</p>

        <div className="grid grid-cols-2 gap-3">
          {/* Hour selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#666]">Hour</label>
            <select
              value={pickedHour ?? ""}
              onChange={(e) => {
                const h = parseInt(e.target.value);
                if (!isNaN(h)) {
                  const m = pickedMinute ?? 0;
                  handleTimeChange(h, m);
                }
              }}
              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff2b2b]/40 appearance-none"
              data-testid="select-hour"
            >
              <option value="">Select hour</option>
              {Array.from({ length: 24 }, (_, h) => {
                const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
                return <option key={h} value={h}>{label}</option>;
              })}
            </select>
          </div>

          {/* Minute selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#666]">Minute</label>
            <select
              value={pickedMinute ?? ""}
              onChange={(e) => {
                const m = parseInt(e.target.value);
                if (!isNaN(m)) {
                  const h = pickedHour ?? 0;
                  handleTimeChange(h, m);
                }
              }}
              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff2b2b]/40 appearance-none"
              data-testid="select-minute"
            >
              <option value="">Select minute</option>
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Conflict / selection feedback */}
        {conflictMsg && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/08 border border-red-500/25 px-3 py-2.5" data-testid="msg-time-conflict">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-400 leading-relaxed">{conflictMsg}</div>
          </div>
        )}

        {selectedSlot && !conflictMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/08 border border-green-500/25 px-3 py-2.5" data-testid="msg-time-selected">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            <span className="text-xs text-green-400 font-medium">
              {selectedSlot.label} is available
            </span>
          </div>
        )}
      </div>

      {/* Rules info */}
      <div className="flex items-start gap-2 rounded-xl bg-[#0b0b0b] border border-[#1e1e1e] px-3 py-2.5">
        <Info className="h-3.5 w-3.5 text-[#444] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#444] leading-relaxed">
          GigJacks must be <span className="text-[#666]">at least 15 minutes apart</span> and a maximum of <span className="text-[#666]">2 per hour</span> can be approved. Slots available in 15-minute intervals.
        </p>
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

  const role = user?.user?.role ?? "PROVIDER";
  const minLeadMinutes =
    (role === "ADMIN" || role === "SUPER_ADMIN") ? 1 :
    role === "CORPORATE" ? 30 : 60;
  const leadWindowLabel =
    minLeadMinutes <= 1
      ? "Test scheduling enabled — immediate booking allowed"
      : minLeadMinutes === 30
        ? "Earliest available booking: 30 minutes from now"
        : "Earliest available booking: 1 hour from now";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: availability, isLoading: availLoading } = useQuery<SlotAvailabilityResponse>({
    queryKey: ["/api/gigjacks/availability", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/gigjacks/availability?date=${selectedDate}&nowMs=${Date.now()}&tzOffset=${new Date().getTimezoneOffset()}`);
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
      flashDurationSeconds: 7,
      offerDurationMinutes: 60,
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
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <Link href="/provider/me">
            <button className="flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="btn-return-to-profile-success">
              <ChevronLeft className="h-3.5 w-3.5" />
              Return to Profile
            </button>
          </Link>
        </div>
        <div className="max-w-lg mx-auto px-4 pb-16 text-center space-y-5">
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        <Link href="/provider/me">
          <button className="flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-white transition-colors" data-testid="btn-return-to-profile">
            <ChevronLeft className="h-3.5 w-3.5" />
            Return to Profile
          </button>
        </Link>

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
              <MonthCalendar
                selected={selectedDate}
                onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
              />
            </div>

            {selectedDate && (
              <div className="flex items-center gap-2 rounded-xl bg-[#ff2b2b]/06 border border-[#ff2b2b]/20 px-4 py-3">
                <CalendarDays className="h-4 w-4 text-[#ff2b2b] shrink-0" />
                <span className="text-sm text-white font-medium">{formatDateFull(selectedDate)}</span>
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
            {/* Header with back + date */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-[#1e1e1e] transition-colors"
                data-testid="btn-back-to-date"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-semibold text-white">Select a time</p>
                <p className="text-xs text-[#555]">{formatDateFull(selectedDate)}</p>
              </div>
            </div>

            {/* Scheduling window info */}
            <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 border ${
              minLeadMinutes <= 1
                ? "bg-amber-500/08 border-amber-500/20"
                : "bg-[#0b0b0b] border-[#1e1e1e]"
            }`} data-testid="msg-scheduling-window">
              <Info className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${minLeadMinutes <= 1 ? "text-amber-400" : "text-[#444]"}`} />
              <p className={`text-[11px] leading-relaxed ${minLeadMinutes <= 1 ? "text-amber-400" : "text-[#444]"}`}>
                {leadWindowLabel}
              </p>
            </div>

            <TimePicker
              selectedDate={selectedDate}
              slots={slots}
              loading={availLoading}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              minLeadMinutes={minLeadMinutes}
            />

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
            {/* Selected slot summary */}
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

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="flashDurationSeconds" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Flash Duration</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                          <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm" data-testid="select-gigjack-flash-duration">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[5, 7, 10, 15, 30, 60].map((s) => (
                              <SelectItem key={s} value={String(s)}>{s}s</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="offerDurationMinutes" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Offer Duration</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                          <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white h-9 text-sm" data-testid="select-gigjack-offer-duration">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="180">3 hours</SelectItem>
                            <SelectItem value="360">6 hours</SelectItem>
                            <SelectItem value="720">12 hours</SelectItem>
                            <SelectItem value="1440">24 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.02] border border-white/[0.07] p-4 space-y-4">
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Optional Extras</p>

                  <FormField control={form.control} name="couponCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code <span className="text-[#555] font-normal">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="SAVE20" data-testid="input-gigjack-coupon" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="quantityLimit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Limit <span className="text-[#555] font-normal">(optional)</span></FormLabel>
                      <FormControl><Input type="number" min={1} placeholder="e.g. 100" data-testid="input-gigjack-quantity" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                  style={{ background: "#ff2b2b", border: "none" }}
                  data-testid="btn-submit-gigjack"
                >
                  {submitMutation.isPending ? "Submitting…" : "Submit GigJack for Review"}
                </Button>

                <p className="text-center text-xs text-[#444]">Your GigJack will be reviewed by our team before going live.</p>
              </form>
            </Form>
          </div>
        )}

      </div>
    </div>
  );
}
