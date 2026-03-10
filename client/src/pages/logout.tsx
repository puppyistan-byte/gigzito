import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    logout().then(() => navigate("/auth"));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
      <Loader2 className="animate-spin" style={{ width: "28px", height: "28px", color: "#ff2b2b" }} />
      <p style={{ color: "#555", fontSize: "13px" }}>Signing out…</p>
    </div>
  );
}
