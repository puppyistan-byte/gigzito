import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Login failed", description: data.message, variant: "destructive" });
      } else {
        queryClient.setQueryData(["/api/auth/me"], data);
        refetch();
        navigate("/provider/me");
      }
    } finally {
      setIsLoading(false);
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
      } else {
        queryClient.setQueryData(["/api/auth/me"], data);
        refetch();
        navigate("/provider/profile");
        toast({ title: "Welcome to Gigzito!", description: "Complete your profile to start posting videos." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen flex flex-col items-center justify-center px-4">
      <Link href="/">
        <a className="auth-brand" data-testid="link-auth-home">
          <img src="/gigzito-logo-v3.png" alt="Gigzito" className="auth-logo" />
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
              <div className="auth-row">
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

              {/* Participation disclaimer */}
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
