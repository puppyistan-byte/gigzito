import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Zap, ExternalLink } from "lucide-react";

const formSchema = z.object({
  companyUrl: z.string().url("Must be a valid URL (include https://)"),
  artworkUrl: z.string().url("Must be a valid image URL (include https://)"),
  offerTitle: z.string().min(5, "At least 5 characters").max(120, "Max 120 characters"),
  description: z.string().min(10, "At least 10 characters").max(500, "Max 500 characters"),
  ctaLink: z.string().url("Must be a valid URL (include https://)"),
  countdownMinutes: z.coerce.number().int().min(1, "Minimum 1 minute").max(30, "Maximum 30 minutes"),
  couponCode: z.string().max(40, "Max 40 characters").optional().or(z.literal("")),
  quantityLimit: z.coerce.number().int().min(1).max(100000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function GigJackNewPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [botWarning, setBotWarning] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyUrl: "",
      artworkUrl: "",
      offerTitle: "",
      description: "",
      ctaLink: "",
      countdownMinutes: 10,
      couponCode: "",
      quantityLimit: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/gigjacks/submit", {
        ...data,
        quantityLimit: data.quantityLimit === "" ? null : Number(data.quantityLimit),
        couponCode: data.couponCode === "" ? null : data.couponCode,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.botWarning) {
        setBotWarning(data.botWarningMessage);
      } else {
        setSubmitted(true);
      }
      toast({ title: data.botWarning ? "Submission flagged for review" : "GigJack submitted!", description: "Your offer is pending admin review." });
      if (!data.botWarning) setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <Zap size={24} style={{ color: "#22c55e" }} />
          </div>
          <h2 className="text-xl font-bold">GigJack Submitted!</h2>
          <p className="text-muted-foreground text-sm">
            Your offer is pending admin review. You'll be able to track its status from your dashboard once approved.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate("/provider/me")}>My Dashboard</Button>
            <Button onClick={() => { setSubmitted(false); form.reset(); setBotWarning(null); }}>Submit Another</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Zap size={18} style={{ color: "#ff2b2b" }} />
            <h1 className="text-xl font-bold">Submit a GigJack</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            GigJacks are high-impact, limited-time offers. All submissions are reviewed before going live.
          </p>
        </div>

        {botWarning && (
          <div
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.35)",
              borderRadius: "10px",
              padding: "14px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
            data-testid="alert-bot-warning-form"
          >
            <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#f59e0b", marginBottom: "4px" }}>Offer Quality Warning</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", lineHeight: "1.5" }}>{botWarning}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "6px" }}>
                Your submission was still received and will be reviewed by an admin.
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => submitMutation.mutate(d))} className="space-y-5">

            <div
              style={{
                background: "rgba(255,43,43,0.04)",
                border: "1px solid rgba(255,43,43,0.15)",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Company &amp; Offer</p>
              <div className="space-y-4">
                <FormField control={form.control} name="companyUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourcompany.com" data-testid="input-gigjack-company-url" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="artworkUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artwork Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." data-testid="input-gigjack-artwork-url" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload your image to an image host (e.g. <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="underline">Imgur</a>) and paste the direct link here.
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />
                {form.watch("artworkUrl") && (
                  <div style={{ borderRadius: "8px", overflow: "hidden", maxWidth: "120px" }}>
                    <img
                      src={form.watch("artworkUrl")}
                      alt="Artwork preview"
                      style={{ width: "120px", height: "90px", objectFit: "cover", display: "block" }}
                      data-testid="img-gigjack-artwork-preview"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Offer Details</p>
              <div className="space-y-4">
                <FormField control={form.control} name="offerTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 50% off all plans — today only" data-testid="input-gigjack-offer-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe what makes this offer compelling…" rows={3} data-testid="input-gigjack-description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ctaLink" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourcompany.com/deal" data-testid="input-gigjack-cta-link" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="countdownMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Countdown Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={30} placeholder="10" data-testid="input-gigjack-countdown" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">1–30 minutes. Creates urgency when displayed on the card.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Optional Extras</p>
              <div className="space-y-4">
                <FormField control={form.control} name="couponCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Code <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. LAUNCH50" data-testid="input-gigjack-coupon-code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantityLimit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Limit <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="e.g. 50" data-testid="input-gigjack-quantity-limit" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Maximum number of redemptions available.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending}
              data-testid="button-submit-gigjack"
              style={{ background: "#ff2b2b", color: "#fff", border: "none" }}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit GigJack for Review"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
