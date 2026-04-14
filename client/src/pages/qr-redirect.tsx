import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { QrCode, Loader2, AlertCircle } from "lucide-react";

export default function QrRedirectPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [, navigate] = useLocation();

  const { data: card, isLoading, isError } = useQuery<{ userId: number; displayName?: string } | null>({
    queryKey: ["/api/gigness-cards/qr", uuid],
    queryFn: () =>
      fetch(`/api/gigness-cards/qr/${uuid}`).then((r) => (r.ok ? r.json() : null)),
    enabled: !!uuid,
    retry: false,
  });

  useEffect(() => {
    if (card?.userId) {
      navigate(`/geezee/${card.userId}`, { replace: true });
    }
  }, [card, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24,
      }}
    >
      {/* Logo / brand mark */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "linear-gradient(135deg,#ff2b2b 0%,#8b1a1a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 32px rgba(255,43,43,0.3)",
          marginBottom: 4,
        }}
      >
        <QrCode className="w-7 h-7 text-white" />
      </div>

      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#ff2b2b",
          margin: 0,
        }}
      >
        Gigzito
      </p>

      {isLoading && (
        <>
          <Loader2
            className="animate-spin"
            style={{ width: 28, height: 28, color: "rgba(255,255,255,0.4)", marginTop: 8 }}
          />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, margin: 0 }}>
            Loading GeeZee Card…
          </p>
        </>
      )}

      {(isError || (!isLoading && !card)) && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertCircle style={{ width: 32, height: 32, color: "#ef4444" }} />
          <p style={{ color: "#ef4444", fontWeight: 600, fontSize: 15, margin: 0 }}>
            QR Card not found
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0, textAlign: "center" }}>
            This QR code may be invalid or the card has been removed.
          </p>
          <a
            href="/"
            style={{
              marginTop: 8,
              padding: "9px 24px",
              borderRadius: 999,
              background: "#ff2b2b",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Go to Gigzito
          </a>
        </div>
      )}
    </div>
  );
}
