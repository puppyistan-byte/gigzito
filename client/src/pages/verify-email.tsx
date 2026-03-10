import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, XCircle, CheckCircle2 } from "lucide-react";
import logoImg from "@assets/gigzito-logo-tight_1772926617316.png";

type Status = "loading" | "success" | "already" | "error";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token found in the link.");
      return;
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.verified) setStatus("success");
        else if (data.alreadyVerified) setStatus("already");
        else { setStatus("error"); setErrorMsg(data.message || "Invalid or expired link."); }
      })
      .catch(() => { setStatus("error"); setErrorMsg("Something went wrong. Please try again."); });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <Link href="/">
        <a className="mb-8" data-testid="link-verify-home">
          <img src={logoImg} alt="Gigzito" style={{ height: 36 }} />
        </a>
      </Link>

      <Card className="w-full max-w-sm p-8 flex flex-col items-center gap-4 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-[#ff2b2b] animate-spin" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Email verified!</h2>
            <p className="text-sm text-muted-foreground">Your account is confirmed. You can now log in.</p>
            <Button className="w-full mt-2" onClick={() => navigate("/auth")} data-testid="button-go-login">
              Go to login
            </Button>
          </>
        )}

        {status === "already" && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#ff2b2b]/10 border border-[#ff2b2b]/20 flex items-center justify-center">
              <MailCheck className="h-7 w-7 text-[#ff2b2b]" />
            </div>
            <h2 className="text-lg font-bold text-white">Already verified</h2>
            <p className="text-sm text-muted-foreground">Your email is already confirmed. Go ahead and log in.</p>
            <Button className="w-full mt-2" onClick={() => navigate("/auth")} data-testid="button-go-login-already">
              Go to login
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Verification failed</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button variant="outline" className="w-full mt-2" onClick={() => navigate("/auth")} data-testid="button-back-to-auth">
              Back to login
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
