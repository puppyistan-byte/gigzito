import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ShieldCheck, Mail, RefreshCw, MailCheck, Flame, Zap,
  ChevronRight, ChevronLeft, MapPin, Phone, Globe, Building2, Check,
  Store
} from "lucide-react";
import { Link } from "wouter";
import logoImg from "@assets/gigzito-logo-tight_1772926617316.png";

const VALID_TIERS = ["GZLurker", "GZGroups", "GZMarketer", "GZMarketerPro", "GZBusiness"];

const TIERS = [
  {
    id: "GZLurker",
    label: "GZ Lurker",
    desc: "Watch & engage",
    color: "#6b7280",
    price: "Free forever",
    perks: ["Like & comment on content", "GeeZee card & rolodex", "Follow creators"],
  },
  {
    id: "GZGroups",
    label: "GZ Groups",
    desc: "Community builder",
    color: "#60a5fa",
    price: "$8/mo",
    perks: ["Create private groups", "Kanban board & calendar", "Group wallet"],
  },
  {
    id: "GZMarketer",
    label: "GZ Marketer",
    desc: "Content creator",
    color: "#7c3aed",
    price: "$12/mo",
    perks: ["Unlimited video posts", "Campaign tagging", "Mailing lists & CSV export"],
  },
  {
    id: "GZMarketerPro",
    label: "GZ Marketer Pro",
    desc: "Advanced creator",
    color: "#ff2b2b",
    price: "$15/mo",
    perks: ["GZMetrics analytics", "SMTP email campaigns", "GZFlash Ad Center"],
  },
  {
    id: "GZBusiness",
    label: "GZ Business",
    desc: "Your online storefront",
    color: "#f59e0b",
    price: "$25/mo",
    perks: ["Business Wall storefront", "Map location display", "Geo push campaigns", "Auto coupon triggers"],
    highlight: true,
  },
];

const BIZ_CATEGORIES = [
  "Restaurant / Food", "Retail / Shop", "Health & Wellness", "Beauty & Salon",
  "Auto & Automotive", "Real Estate", "Legal Services", "Financial Services",
  "Entertainment", "Music & Arts", "Technology", "Home Services",
  "Education / Tutoring", "Non-Profit", "Other",
];

const RESEND_COOLDOWN = 30;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(window.location.search);
  const urlTier = searchParams.get("tier");
  const urlTab = searchParams.get("tab");
  const pendingTier = urlTier && VALID_TIERS.includes(urlTier) ? urlTier : null;
  const defaultTab = urlTab === "register" ? "register" : "login";

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register — multi-step
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>(pendingTier ?? "");

  // Business form (step 3)
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizCity, setBizCity] = useState("");
  const [bizState, setBizState] = useState("");
  const [bizZip, setBizZip] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizWebsite, setBizWebsite] = useState("");
  const [bizDescription, setBizDescription] = useState("");
  const [bizLat, setBizLat] = useState<number | null>(null);
  const [bizLng, setBizLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Email verify step
  const [verifyEmailStep, setVerifyEmailStep] = useState(false);
  const [verifyEmailAddr, setVerifyEmailAddr] = useState("");
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [resendVerifyCooldown, setResendVerifyCooldown] = useState(0);
  const [resendVerifyLoading, setResendVerifyLoading] = useState(false);
  const verifyCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // MFA
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mfaStep) setTimeout(() => codeInputRef.current?.focus(), 100);
  }, [mfaStep]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (verifyCooldownRef.current) clearInterval(verifyCooldownRef.current);
    };
  }, []);

  const startVerifyCooldown = () => {
    setResendVerifyCooldown(RESEND_COOLDOWN);
    if (verifyCooldownRef.current) clearInterval(verifyCooldownRef.current);
    verifyCooldownRef.current = setInterval(() => {
      setResendVerifyCooldown((prev) => {
        if (prev <= 1) { clearInterval(verifyCooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  if (user) { navigate("/provider/me"); return null; }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.emailNotVerified) {
          setVerifyEmailAddr(data.email || loginEmail);
          setVerifyEmailStep(true);
          startVerifyCooldown();
        } else {
          toast({ title: "Login failed", description: data.message, variant: "destructive" });
        }
      } else if (data.mfaRequired) {
        setMfaEmail(data.email);
        setDevCode(data.devCode ?? null);
        setMfaCode("");
        setMfaStep(true);
        startCooldown();
        toast({ title: "Code sent", description: "Check your email for a 6-digit verification code." });
      } else {
        queryClient.setQueryData(["/api/auth/me"], data);
        refetch();
        navigate("/provider/me");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) { toast({ title: "Enter the 6-digit code", variant: "destructive" }); return; }
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mfaEmail, code: mfaCode, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Verification failed", description: data.message, variant: "destructive" });
      } else {
        queryClient.setQueryData(["/api/auth/me"], data);
        refetch();
        navigate("/provider/me");
      }
    } finally {
      setMfaLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mfaEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not resend", description: data.message, variant: "destructive" });
      } else {
        setDevCode(data.devCode ?? null);
        setMfaCode("");
        startCooldown();
        toast({ title: "Code resent", description: "A new code was sent." });
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendVerifyCooldown > 0 || resendVerifyLoading) return;
    setResendVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmailAddr }),
      });
      if (res.ok) {
        startVerifyCooldown();
        toast({ title: "Email sent", description: "A new verification link was sent to your inbox." });
      } else {
        const data = await res.json();
        toast({ title: "Could not resend", description: data.message, variant: "destructive" });
      }
    } finally {
      setResendVerifyLoading(false);
    }
  };

  const geocodeAddress = async () => {
    const addr = [bizAddress, bizCity, bizState, bizZip].filter(Boolean).join(", ");
    if (!addr) return;
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (data?.[0]) {
        setBizLat(parseFloat(data[0].lat));
        setBizLng(parseFloat(data[0].lon));
        setMapReady(true);
      } else {
        toast({ title: "Address not found", description: "Try entering a more complete address.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Geocoding failed", description: "Could not look up address.", variant: "destructive" });
    } finally {
      setGeocoding(false);
    }
  };

  const handleStep1Next = () => {
    if (!regEmail.trim() || !regPassword.trim()) {
      toast({ title: "Email and password required", variant: "destructive" }); return;
    }
    if (regPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return;
    }
    if (!disclaimerChecked) {
      toast({ title: "Please accept the disclaimer to continue", variant: "destructive" }); return;
    }
    setRegStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedTier) {
      toast({ title: "Please choose a membership tier", variant: "destructive" }); return;
    }
    if (selectedTier === "GZBusiness") {
      setRegStep(3);
    } else {
      handleFinalRegister();
    }
  };

  const handleFinalRegister = async (businessData?: object) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          disclaimerAccepted: true,
          tier: selectedTier || "GZLurker",
          businessData: businessData ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Registration failed", description: data.message, variant: "destructive" });
      } else if (data.requiresVerification) {
        setVerifyEmailAddr(data.email);
        setDevVerifyUrl(data.devVerifyUrl ?? null);
        setVerifyEmailStep(true);
        startVerifyCooldown();
      } else {
        await refetch();
        navigate("/provider/profile");
        const tierMsg = selectedTier && selectedTier !== "GZLurker"
          ? ` Your ${selectedTier} tier is active — free during Brand Build!`
          : " Complete your profile to start posting.";
        toast({ title: "Welcome to Gigzito!", description: tierMsg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3Submit = () => {
    if (!bizName.trim()) {
      toast({ title: "Business name is required", variant: "destructive" }); return;
    }
    handleFinalRegister({
      businessName: bizName.trim(),
      category: bizCategory,
      address: bizAddress.trim(),
      city: bizCity.trim(),
      state: bizState.trim(),
      zip: bizZip.trim(),
      phone: bizPhone.trim() || null,
      website: bizWebsite.trim() || null,
      description: bizDescription.trim() || null,
      lat: bizLat,
      lng: bizLng,
    });
  };

  // ─── Verify Email Step ─────────────────────────────────────────────────────
  if (verifyEmailStep) {
    return (
      <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4">
        <Link href="/" className="auth-brand" data-testid="link-auth-home"><img src={logoImg} alt="Gigzito" className="auth-logo" /></Link>
        <Card className="w-full max-w-sm p-6">
          <div className="flex flex-col items-center gap-2 mb-5">
            <div className="w-12 h-12 rounded-full bg-[#ff2b2b]/10 border border-[#ff2b2b]/20 flex items-center justify-center">
              <MailCheck className="h-6 w-6 text-[#ff2b2b]" />
            </div>
            <h2 className="text-lg font-bold text-white text-center">Check your inbox</h2>
            <p className="text-xs text-[#666] text-center leading-relaxed">
              We sent a verification link to<br />
              <span className="text-[#999] font-medium">{verifyEmailAddr}</span>
            </p>
            <p className="text-xs text-[#555] text-center leading-relaxed mt-1">
              Click the link in the email to verify your account, then come back to log in.
            </p>
          </div>
          {devVerifyUrl && (
            <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-1.5">Dev mode — no email sent</p>
              <a href={devVerifyUrl} className="block text-xs text-amber-300 underline break-all leading-relaxed" data-testid="link-dev-verify">{devVerifyUrl}</a>
              <p className="text-[10px] text-amber-600 mt-1.5">Click the link above to verify this account</p>
            </div>
          )}
          <div className="flex flex-col items-center gap-3 mt-2">
            <button type="button" onClick={handleResendVerification} disabled={resendVerifyCooldown > 0 || resendVerifyLoading}
              className={`flex items-center gap-1.5 text-xs transition-colors ${resendVerifyCooldown > 0 ? "text-[#444] cursor-not-allowed" : "text-[#ff2b2b] hover:text-[#ff5555]"}`}
              data-testid="button-resend-verification">
              {resendVerifyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {resendVerifyCooldown > 0 ? `Resend in ${resendVerifyCooldown}s` : "Resend verification email"}
            </button>
            <button type="button" onClick={() => setVerifyEmailStep(false)} className="text-xs text-[#444] hover:text-[#888] transition-colors" data-testid="button-back-to-login">
              Back to login
            </button>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground mt-4">Verification link expires in 24 hours.</p>
      </div>
    );
  }

  // ─── MFA Step ─────────────────────────────────────────────────────────────
  if (mfaStep) {
    return (
      <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4">
        <Link href="/" className="auth-brand" data-testid="link-auth-home"><img src={logoImg} alt="Gigzito" className="auth-logo" /></Link>
        <Card className="w-full max-w-sm p-6">
          <div className="flex flex-col items-center gap-2 mb-5">
            <div className="w-12 h-12 rounded-full bg-[#ff2b2b]/10 border border-[#ff2b2b]/20 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-[#ff2b2b]" />
            </div>
            <h2 className="text-lg font-bold text-white text-center">Verify your identity</h2>
            <p className="text-xs text-[#666] text-center leading-relaxed">
              Enter the 6-digit code sent to<br /><span className="text-[#999] font-medium">{mfaEmail}</span>
            </p>
          </div>
          {devCode && (
            <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Code delivered here (SMTP bypass)</p>
                <p className="text-sm text-amber-300 font-mono font-bold tracking-widest mt-0.5">{devCode}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mfa-code">Verification code</Label>
              <Input ref={codeInputRef} id="mfa-code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                placeholder="000000" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl font-mono tracking-[0.5em] h-14" autoComplete="one-time-code" required data-testid="input-mfa-code" />
            </div>
            <Button type="submit" className="w-full" disabled={mfaLoading || mfaCode.length !== 6} data-testid="button-mfa-verify">
              {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify & Sign in
            </Button>
          </form>
          <div className="mt-4 flex flex-col items-center gap-2">
            <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || resendLoading}
              className={`flex items-center gap-1.5 text-xs transition-colors ${resendCooldown > 0 ? "text-[#444] cursor-not-allowed" : "text-[#ff2b2b] hover:text-[#ff5555]"}`}
              data-testid="button-mfa-resend">
              {resendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
            <button type="button" onClick={() => { setMfaStep(false); setMfaCode(""); setDevCode(null); }}
              className="text-xs text-[#444] hover:text-[#888] transition-colors" data-testid="button-mfa-back">
              Back to login
            </button>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground mt-4">Code expires in 10 minutes.</p>
      </div>
    );
  }

  // ─── Login / Register ──────────────────────────────────────────────────────
  return (
    <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <Link href="/" className="auth-brand" data-testid="link-auth-home"><img src={logoImg} alt="Gigzito" className="auth-logo" /></Link>

      <Card className="w-full max-w-md p-6">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="login" className="flex-1" data-testid="tab-login">Log in</TabsTrigger>
            <TabsTrigger value="register" className="flex-1" data-testid="tab-register">Sign up</TabsTrigger>
          </TabsList>

          {/* ── LOGIN ─────────────────────────────────────────────────── */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="you@example.com" value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)} required data-testid="input-login-email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)} required data-testid="input-login-password" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer" data-testid="label-remember-me">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-[#ff2b2b] w-3.5 h-3.5" data-testid="checkbox-remember-me" />
                  <span className="text-xs text-[#888]">Remember me</span>
                </label>
                <button type="button" className="link-red" data-testid="button-forgot-password">Forgot password?</button>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login-submit">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Log in
              </Button>
              <p className="text-xs text-muted-foreground text-center">Demo: alex@gigzito.com / password123</p>
            </form>
          </TabsContent>

          {/* ── REGISTER ──────────────────────────────────────────────── */}
          <TabsContent value="register">

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3].map((s) => {
                const active = regStep === s;
                const done = regStep > s;
                const isBizStep = s === 3;
                if (isBizStep && selectedTier !== "GZBusiness" && regStep < 3) return null;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${done ? "bg-green-600 text-white" : active ? "bg-[#ff2b2b] text-white" : "bg-[#1a1a1a] text-[#444] border border-[#333]"}`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : s}
                    </div>
                    {s < (selectedTier === "GZBusiness" ? 3 : 2) && (
                      <div className={`w-6 h-0.5 ${regStep > s ? "bg-green-600" : "bg-[#222]"}`} />
                    )}
                  </div>
                );
              })}
              <span className="ml-2 text-xs text-[#555]">
                {regStep === 1 && "Account info"}
                {regStep === 2 && "Choose your tier"}
                {regStep === 3 && "Business setup"}
              </span>
            </div>

            {/* ── STEP 1: Credentials + Disclaimer ─────────────────── */}
            {regStep === 1 && (
              <div className="space-y-4">
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "rgba(34,197,94,0.9)", fontWeight: 600 }}>
                    All paid tiers free during Brand Build promotion
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" placeholder="you@example.com" value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)} required data-testid="input-reg-email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" type="password" placeholder="Choose a password (min 6 chars)" value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)} required minLength={6} data-testid="input-reg-password" />
                </div>
                <div style={{ background: "rgba(255,43,43,0.05)", border: "1px solid rgba(255,43,43,0.2)", borderRadius: "10px", padding: "12px" }}>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: "1.6", marginBottom: "10px" }}>
                    This platform does not provide medical, financial, or legal advice. All interactions are voluntary promotional communications.
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer" data-testid="label-disclaimer">
                    <input type="checkbox" checked={disclaimerChecked} onChange={(e) => setDisclaimerChecked(e.target.checked)}
                      className="mt-0.5 accent-[#ff2b2b] w-3.5 h-3.5 flex-shrink-0" data-testid="checkbox-disclaimer" />
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", lineHeight: "1.5" }}>
                      I understand and agree to the participation disclaimer above
                    </span>
                  </label>
                </div>
                <Button type="button" className="w-full" onClick={handleStep1Next} data-testid="button-step1-next">
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* ── STEP 2: Tier Picker ────────────────────────────────── */}
            {regStep === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-[#666] text-center mb-1">Pick the tier that fits your goals. You can change it any time.</p>
                {TIERS.map((tier) => {
                  const isSelected = selectedTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTier(tier.id)}
                      data-testid={`tier-card-${tier.id}`}
                      className="w-full text-left rounded-xl border transition-all p-3"
                      style={{
                        background: isSelected ? `${tier.color}18` : "rgba(255,255,255,0.02)",
                        borderColor: isSelected ? tier.color : "#1e1e1e",
                        boxShadow: isSelected ? `0 0 0 1px ${tier.color}60` : "none",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${tier.color}20` }}>
                          {tier.id === "GZBusiness" ? <Store className="h-4 w-4" style={{ color: tier.color }} /> :
                            <Flame className="h-4 w-4" style={{ color: tier.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-white">{tier.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {tier.id !== "GZLurker" && (
                                <span className="text-[10px] text-[#555] line-through">{tier.price}</span>
                              )}
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${tier.color}25`, color: tier.color }}>
                                {tier.id === "GZLurker" ? "Free" : "FREE now"}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-[#666] mt-0.5">{tier.desc}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {tier.perks.map((p) => (
                              <span key={p} className="text-[10px] text-[#888] bg-[#1a1a1a] rounded px-1.5 py-0.5">{p}</span>
                            ))}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: tier.color }}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setRegStep(1)}
                    className="flex-1 border border-[#1e1e1e]" data-testid="button-step2-back">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="button" onClick={handleStep2Next} disabled={!selectedTier || isLoading}
                    className="flex-1" data-testid="button-step2-next">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {selectedTier === "GZBusiness" ? "Next: Business Setup" : "Create Account"}
                    {!isLoading && <ChevronRight className="h-4 w-4 ml-1" />}
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Business Setup ─────────────────────────────── */}
            {regStep === 3 && (
              <div className="space-y-3">
                <div className="rounded-xl p-3 mb-1" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-400">GZ Business Storefront</p>
                      <p className="text-[10px] text-[#888] mt-0.5">This becomes your public business wall — your online storefront on Gigzito.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#aaa]">Business Name <span className="text-[#ff2b2b]">*</span></Label>
                  <Input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="e.g. Joe's Auto Shop"
                    className="bg-[#0a1020] border-[#1e1e1e]" data-testid="input-biz-name" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#aaa]">Business Category</Label>
                  <select value={bizCategory} onChange={(e) => setBizCategory(e.target.value)}
                    className="w-full h-9 rounded-md bg-[#0a1020] border border-[#1e1e1e] text-white text-sm px-3"
                    data-testid="select-biz-category">
                    <option value="">Select a category…</option>
                    {BIZ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#aaa]">Street Address</Label>
                  <Input value={bizAddress} onChange={(e) => { setBizAddress(e.target.value); setMapReady(false); }}
                    placeholder="123 Main St" className="bg-[#0a1020] border-[#1e1e1e]" data-testid="input-biz-address" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs text-[#aaa]">City</Label>
                    <Input value={bizCity} onChange={(e) => { setBizCity(e.target.value); setMapReady(false); }}
                      placeholder="City" className="bg-[#0a1020] border-[#1e1e1e] text-sm" data-testid="input-biz-city" />
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs text-[#aaa]">State</Label>
                    <Input value={bizState} onChange={(e) => { setBizState(e.target.value); setMapReady(false); }}
                      placeholder="OR" maxLength={2} className="bg-[#0a1020] border-[#1e1e1e] text-sm" data-testid="input-biz-state" />
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs text-[#aaa]">ZIP</Label>
                    <Input value={bizZip} onChange={(e) => { setBizZip(e.target.value); setMapReady(false); }}
                      placeholder="97123" className="bg-[#0a1020] border-[#1e1e1e] text-sm" data-testid="input-biz-zip" />
                  </div>
                </div>

                {/* Geocode + map preview */}
                <div className="space-y-2">
                  <Button type="button" variant="ghost" size="sm" onClick={geocodeAddress}
                    disabled={geocoding || !bizAddress.trim()}
                    className="w-full h-8 text-xs border border-[#1e1e1e] text-[#aaa] hover:text-white"
                    data-testid="button-geocode">
                    {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <MapPin className="h-3.5 w-3.5 mr-1.5" />}
                    {mapReady ? "Map found — update location" : "Find on map"}
                  </Button>
                  {mapReady && bizLat && bizLng && (
                    <div className="rounded-xl overflow-hidden border border-amber-900/30" style={{ height: 130 }}>
                      <iframe
                        title="Business location"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bizLng - 0.005},${bizLat - 0.003},${bizLng + 0.005},${bizLat + 0.003}&layer=mapnik&marker=${bizLat},${bizLng}`}
                        className="w-full h-full"
                        style={{ border: 0, filter: "invert(0.85) hue-rotate(180deg)" }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#aaa]"><Phone className="inline h-3 w-3 mr-1" />Phone</Label>
                    <Input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="(503) 555-0100"
                      className="bg-[#0a1020] border-[#1e1e1e] text-sm" data-testid="input-biz-phone" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#aaa]"><Globe className="inline h-3 w-3 mr-1" />Website</Label>
                    <Input value={bizWebsite} onChange={(e) => setBizWebsite(e.target.value)} placeholder="https://…"
                      className="bg-[#0a1020] border-[#1e1e1e] text-sm" data-testid="input-biz-website" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#aaa]">About your business</Label>
                  <Textarea value={bizDescription} onChange={(e) => setBizDescription(e.target.value)}
                    placeholder="Tell customers what you do, your hours, specialties…"
                    className="bg-[#0a1020] border-[#1e1e1e] text-sm resize-none" rows={3} data-testid="input-biz-description" />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setRegStep(2)}
                    className="flex-1 border border-[#1e1e1e]" data-testid="button-step3-back">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="button" onClick={handleStep3Submit} disabled={isLoading || !bizName.trim()}
                    className="flex-1" style={{ background: "#f59e0b", color: "#000" }} data-testid="button-step3-submit">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
                    Open My Storefront
                  </Button>
                </div>
                <p className="text-[10px] text-[#444] text-center">You can update all of this later in your business settings.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">By signing up you agree to post only content you own.</p>
    </div>
  );
}
