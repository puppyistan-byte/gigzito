import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X, Mail, User, Phone, ExternalLink, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ListingWithProvider } from "@shared/schema";

const formSchema = z.object({
  firstName: z.string().min(1, "Name is required").max(60),
  email: z.string().email("Valid email required"),
  phone: z.string().max(30).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface InquireLeadModalProps {
  listing: ListingWithProvider;
  onClose: () => void;
}

const CTA_LABEL_MAP: Record<string, string> = {
  "Visit Offer":  "Visit Offer",
  "Shop Product": "Shop Now",
  "Join Event":   "Join Event",
  "Book Service": "Book Now",
  "Join Guild":   "Join Guild",
};

export function InquireLeadModal({ listing, onClose }: InquireLeadModalProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: "", email: "", phone: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/leads", {
        videoId: listing.id,
        creatorUserId: listing.provider.userId,
        firstName: data.firstName,
        email: data.email,
        phone: data.phone || null,
        videoTitle: listing.title,
        category: listing.vertical,
      });
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" }),
  });

  const ctaUrl = listing.ctaUrl ?? null;
  const ctaType = listing.ctaType ?? null;
  const destinationLabel = ctaType ? (CTA_LABEL_MAP[ctaType] ?? ctaType) : "View Offer";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-inquire"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#111",
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fff", margin: 0 }}>
            {submitted ? "You're in!" : "Get Access"}
          </h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "4px" }}
            data-testid="button-close-modal"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
            <CheckCircle2
              size={44}
              style={{ color: "#22c55e", margin: "0 auto 12px" }}
              data-testid="icon-lead-success"
            />
            <p style={{ color: "#fff", fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>
              Thanks, {form.getValues("firstName")}!
            </p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginBottom: "20px" }}>
              Your details have been sent to {listing.provider.displayName}.
            </p>
            {ctaUrl ? (
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "12px",
                  background: "#c41414",
                  color: "#fff",
                  borderRadius: "999px",
                  fontWeight: "700",
                  fontSize: "14px",
                  textDecoration: "none",
                }}
                data-testid="link-cta-destination"
              >
                <ExternalLink size={15} />
                {destinationLabel}
              </a>
            ) : (
              <Button
                onClick={onClose}
                style={{ width: "100%", background: "#222", color: "#fff", border: "1px solid #333", borderRadius: "999px" }}
              >
                Close
              </Button>
            )}
          </div>
        ) : (
          /* ── Form state ── */
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Listing context */}
              <div
                style={{
                  background: "rgba(255,43,43,0.06)",
                  border: "1px solid rgba(255,43,43,0.2)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                }}
              >
                <p style={{ fontSize: "12px", fontWeight: "600", color: "#ff2b2b", marginBottom: "2px" }}>{listing.title}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>by {listing.provider.displayName}</p>
              </div>

              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px" }}>
                    <User size={11} style={{ display: "inline", marginRight: "5px" }} />
                    Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" data-testid="input-lead-first-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px" }}>
                    <Mail size={11} style={{ display: "inline", marginRight: "5px" }} />
                    Email *
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" data-testid="input-lead-email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px" }}>
                    <Phone size={11} style={{ display: "inline", marginRight: "5px" }} />
                    Phone <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1 555 000 0000" data-testid="input-lead-phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
                data-testid="button-submit-lead"
                style={{ background: "#c41414", color: "#fff", border: "none", borderRadius: "999px", fontWeight: "700" }}
              >
                {mutation.isPending ? "Sending…" : ctaUrl ? `Submit & ${destinationLabel}` : "Send Inquiry"}
              </Button>

              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textAlign: "center", margin: 0 }}>
                No account required. Your info goes only to this creator.
              </p>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
