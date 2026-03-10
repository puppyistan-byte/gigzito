import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Mail, RefreshCw, MailCheck } from "lucide-react";
import { Link } from "wouter";
import logoImg from "@assets/gigzito-logo-tight_1772926617316.png";

const RESEND_COOLDOWN = 30;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login / register state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verify email state (after registration)
  const [verifyEmailStep, setVerifyEmailStep] = useState(false);
  const [verifyEmailAddr, setVerifyEmailAddr] = useState("");
  const [resendVerifyCooldown, setResendVerifyCooldown] = useState(0);
  const [resendVerifyLoading, setResendVerifyLoading] = useState(false);
  const verifyCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [rememberMe, setRememberMe] = useState(false);

  // MFA state
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
    if (mfaStep) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
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

  if (user) {
    navigate("/provider/me");
    return null;
  }

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
    if (mfaCode.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
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
        toast({ title: "Code resent", description: "A new verification code was sent to your email." });
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimerChecked) {
      toast({ title: "Agreement required", description: "Please accept the participation disclaimer to continue.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword, disclaimerAccepted: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Registration failed", description: data.message, variant: "destructive" });
      } else if (data.requiresVerification) {
        setVerifyEmailAddr(data.email);
        setVerifyEmailStep(true);
        startVerifyCooldown();
      } else {
        await refetch();
        navigate("/provider/profile");
        toast({ title: "Welcome to Gigzito!", description: "Complete your profile to start posting videos." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Verify Email Step ────────────────────────────────────────────────────────
  if (verifyEmailStep) {
    return (
      <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4">
        <Link href="/">
          <a className="auth-brand" data-testid="link-auth-home">
            <img src={logoImg} alt="Gigzito" className="auth-logo" />
          </a>
        </Link>

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

          <div className="flex flex-col items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendVerifyCooldown > 0 || resendVerifyLoading}
              className={`flex items-center gap-1.5 text-xs transition-colors ${resendVerifyCooldown > 0 ? "text-[#444] cursor-not-allowed" : "text-[#ff2b2b] hover:text-[#ff5555]"}`}
              data-testid="button-resend-verification"
            >
              {resendVerifyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {resendVerifyCooldown > 0 ? `Resend in ${resendVerifyCooldown}s` : "Resend verification email"}
            </button>
            <button
              type="button"
              onClick={() => setVerifyEmailStep(false)}
              className="text-xs text-[#444] hover:text-[#888] transition-colors"
              data-testid="button-back-to-login"
            >
              Back to login
            </button>
          </div>
        </Card>

        <p className="text-xs text-muted-foreground mt-4">Verification link expires in 24 hours.</p>
      </div>
    );
  }

  // ─── MFA Step ─────────────────────────────────────────────────────────────────
  if (mfaStep) {
    return (
      <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4">
        <Link href="/">
          <a className="auth-brand" data-testid="link-auth-home">
            <img src={logoImg} alt="Gigzito" className="auth-logo" />
          </a>
        </Link>

        <Card className="w-full max-w-sm p-6">
          <div className="flex flex-col items-center gap-2 mb-5">
            <div className="w-12 h-12 rounded-full bg-[#ff2b2b]/10 border border-[#ff2b2b]/20 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-[#ff2b2b]" />
            </div>
            <h2 className="text-lg font-bold text-white text-center">Verify your identity</h2>
            <p className="text-xs text-[#666] text-center leading-relaxed">
              Enter the 6-digit code sent to<br />
              <span className="text-[#999] font-medium">{mfaEmail}</span>
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
              <Input
                ref={codeInputRef}
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl font-mono tracking-[0.5em] h-14"
                autoComplete="one-time-code"
                required
                data-testid="input-mfa-code"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={mfaLoading || mfaCode.length !== 6}
              data-testid="button-mfa-verify"
            >
              {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify & Sign in
            </Button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className={`flex items-center gap-1.5 text-xs transition-colors ${resendCooldown > 0 ? "text-[#444] cursor-not-allowed" : "text-[#ff2b2b] hover:text-[#ff5555]"}`}
              data-testid="button-mfa-resend"
            >
              {resendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => { setMfaStep(false); setMfaCode(""); setDevCode(null); }}
              className="text-xs text-[#444] hover:text-[#888] transition-colors"
              data-testid="button-mfa-back"
            >
              Back to login
            </button>
          </div>
        </Card>

        <p className="text-xs text-muted-foreground mt-4">Code expires in 10 minutes.</p>
      </div>
    );
  }

  // ─── Login / Register ─────────────────────────────────────────────────────────
  return (
    <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4">
      <Link href="/">
        <a className="auth-brand" data-testid="link-auth-home">
          <img src={logoImg} alt="Gigzito" className="auth-logo" />
        </a>
      </Link>

      <Card className="w-full max-w-sm p-6">
        <Tabs defaultValue="login">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="login" className="flex-1" data-testid="tab-login">Log in</TabsTrigger>
            <TabsTrigger value="register" className="flex-1" data-testid="tab-register">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  data-testid="input-login-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  data-testid="input-login-password"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer" data-testid="label-remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-[#ff2b2b] w-3.5 h-3.5"
                    data-testid="checkbox-remember-me"
                  />
                  <span className="text-xs text-[#888]">Remember me</span>
                </label>
                <button type="button" className="link-red" data-testid="button-forgot-password">Forgot password?</button>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login-submit">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Log in
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Demo: alex@gigzito.com / password123
              </p>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  data-testid="input-reg-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="Choose a password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-reg-password"
                />
              </div>

              <div
                style={{
                  background: "rgba(255,43,43,0.05)",
                  border: "1px solid rgba(255,43,43,0.2)",
                  borderRadius: "10px",
                  padding: "12px",
                }}
              >
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: "1.6", marginBottom: "10px" }}>
                  This platform does not provide medical, financial, or legal advice. All interactions are voluntary promotional communications.
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer" data-testid="label-disclaimer">
                  <input
                    type="checkbox"
                    checked={disclaimerChecked}
                    onChange={(e) => setDisclaimerChecked(e.target.checked)}
                    className="mt-0.5 accent-[#ff2b2b] w-3.5 h-3.5 flex-shrink-0"
                    data-testid="checkbox-disclaimer"
                  />
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", lineHeight: "1.5" }}>
                    I understand and agree to the participation disclaimer above
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !disclaimerChecked}
                data-testid="button-register-submit"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        By signing up you agree to post only content you own.
      </p>
    </div>
  );
}
