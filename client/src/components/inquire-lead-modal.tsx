import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X, Mail, User, Phone, MessageSquare, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ListingWithProvider } from "@shared/schema";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  email: z.string().email("Valid email required"),
  phone: z.string().max(30).optional().or(z.literal("")),
  message: z.string().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface InquireLeadModalProps {
  listing: ListingWithProvider;
  onClose: () => void;
}

export function InquireLeadModal({ listing, onClose }: InquireLeadModalProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: "", email: "", phone: "", message: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/leads", {
        videoId: listing.id,
        creatorUserId: listing.provider.userId,
        firstName: data.firstName,
        email: data.email,
        phone: data.phone || null,
        message: data.message || null,
        videoTitle: listing.title,
        category: listing.vertical,
      });
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" }),
  });

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
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#fff" }}>Inquire</h2>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>{listing.provider.displayName}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            data-testid="button-close-inquire-modal"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Mail size={22} style={{ color: "#22c55e" }} />
            </div>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>Inquiry Sent!</p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: "1.5", marginBottom: "20px" }}>
              Your details have been submitted. {listing.provider.displayName} will be in touch.
            </p>
            {listing.ctaUrl && (
              <a
                href={listing.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#c41414",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
                data-testid="link-inquire-cta-redirect"
              >
                <ExternalLink size={14} />
                {listing.ctaLabel ?? "Visit Website"}
              </a>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div
                style={{
                  background: "rgba(255,43,43,0.06)",
                  border: "1px solid rgba(255,43,43,0.2)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  marginBottom: "16px",
                }}
              >
                <p style={{ fontSize: "12px", fontWeight: "600", color: "#ff2b2b", marginBottom: "2px" }}>{listing.title}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{listing.provider.displayName}</p>
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

              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ fontSize: "12px" }}>
                    <MessageSquare size={11} style={{ display: "inline", marginRight: "5px" }} />
                    Message <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell them what you're interested in…" rows={3} data-testid="input-lead-message" {...field} />
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
                {mutation.isPending ? "Sending…" : "Send Inquiry"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
