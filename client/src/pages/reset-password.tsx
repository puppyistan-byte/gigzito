import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (!token) { setError("Invalid or missing reset token."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to reset password.");
      } else {
        setDone(true);
        setTimeout(() => setLocation("/auth"), 3000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-black text-red-500 tracking-tight">Gigzito</h1>
          <p className="text-xs text-muted-foreground mt-1">Getcho Gig On</p>
        </div>

        {!token ? (
          <div className="text-center space-y-3 py-4">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-sm font-semibold">Invalid reset link</p>
            <p className="text-xs text-muted-foreground">This link is missing a reset token. Please request a new password reset from the login page.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setLocation("/auth")}>Back to Login</Button>
          </div>
        ) : done ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-sm font-semibold">Password updated!</p>
            <p className="text-xs text-muted-foreground">Your password has been changed. Redirecting you to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-base font-bold">Set a new password</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Choose a strong password — at least 6 characters.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                data-testid="input-new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                data-testid="input-confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              data-testid="button-reset-password-submit"
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>

            <button type="button" className="text-xs text-muted-foreground w-full text-center hover:text-foreground transition-colors" onClick={() => setLocation("/auth")}>
              Back to login
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
