import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, Phone, Globe, Store, Building2, ChevronLeft, Loader2, Check,
  ExternalLink, Mail, PlusCircle, Trash2, User, Zap, Video, Radio,
} from "lucide-react";

const BIZ_CATEGORIES = [
  "Restaurant / Food", "Retail / Shop", "Health & Wellness", "Beauty & Salon",
  "Auto & Automotive", "Real Estate", "Legal Services", "Financial Services",
  "Entertainment", "Music & Arts", "Technology", "Home Services",
  "Education / Tutoring", "Non-Profit", "Other",
];

type PointOfContact = { title: string; name: string; phone?: string; email?: string };

type BusinessProfile = {
  id: number;
  userId: number;
  businessName: string;
  category: string;
  industry?: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  pointsOfContact?: PointOfContact[] | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export default function BusinessProfileSetupPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existing, isLoading: loadingExisting } = useQuery<BusinessProfile | null>({
    queryKey: ["/api/business-profile/me"],
    enabled: !!user,
  });

  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("");
  const [bizIndustry, setBizIndustry] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizCity, setBizCity] = useState("");
  const [bizState, setBizState] = useState("");
  const [bizZip, setBizZip] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [bizWebsite, setBizWebsite] = useState("");
  const [bizDescription, setBizDescription] = useState("");
  const [bizLat, setBizLat] = useState<number | null>(null);
  const [bizLng, setBizLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [contacts, setContacts] = useState<PointOfContact[]>([]);

  useEffect(() => {
    if (existing && !initialized) {
      setBizName(existing.businessName ?? "");
      setBizCategory(existing.category ?? "");
      setBizIndustry(existing.industry ?? "");
      setBizAddress(existing.address ?? "");
      setBizCity(existing.city ?? "");
      setBizState(existing.state ?? "");
      setBizZip(existing.zip ?? "");
      setBizPhone(existing.phone ?? "");
      setBizEmail(existing.email ?? "");
      setBizWebsite(existing.website ?? "");
      setBizDescription(existing.description ?? "");
      setBizLat(existing.lat ?? null);
      setBizLng(existing.lng ?? null);
      setMapReady(!!(existing.lat && existing.lng));
      setContacts(existing.pointsOfContact ?? []);
      setInitialized(true);
    }
  }, [existing, initialized]);

  const saveMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/business-profile", data).then((r) => r.json()),
    onSuccess: (saved: BusinessProfile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-profile/me"] });
      toast({ title: "✅ Business profile saved!", description: "Your storefront is live." });
      navigate(`/business/${saved.id}`);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const geocodeAddress = async () => {
    const addr = [bizAddress, bizCity, bizState, bizZip].filter(Boolean).join(", ");
    if (!addr) return;
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`, {
        headers: { "Accept-Language": "en" },
      });
      const data = await res.json();
      if (data?.[0]) {
        setBizLat(parseFloat(data[0].lat));
        setBizLng(parseFloat(data[0].lon));
        setMapReady(true);
        toast({ title: "Location found!" });
      } else {
        toast({ title: "Address not found", description: "Try a more complete address.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Geocoding failed", variant: "destructive" });
    } finally {
      setGeocoding(false);
    }
  };

  const addContact = () => setContacts((c) => [...c, { title: "", name: "", phone: "", email: "" }]);
  const removeContact = (i: number) => setContacts((c) => c.filter((_, idx) => idx !== i));
  const updateContact = (i: number, field: keyof PointOfContact, val: string) =>
    setContacts((c) => c.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSave = () => {
    if (!bizName.trim()) { toast({ title: "Business name required", variant: "destructive" }); return; }
    const validContacts = contacts.filter((c) => c.title.trim() || c.name.trim());
    saveMutation.mutate({
      businessName: bizName.trim(),
      category: bizCategory,
      industry: bizIndustry.trim() || null,
      address: bizAddress.trim(),
      city: bizCity.trim(),
      state: bizState.trim(),
      zip: bizZip.trim(),
      phone: bizPhone.trim() || null,
      email: bizEmail.trim() || null,
      website: bizWebsite.trim() || null,
      description: bizDescription.trim() || null,
      pointsOfContact: validContacts.length ? validContacts : null,
      lat: bizLat,
      lng: bizLng,
    });
  };

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) { navigate("/auth?tab=register&tier=GZBusiness"); return null; }

  const tier = (user as any).user?.subscriptionTier ?? "";
  const isBusinessTier = tier === "GZBusiness" || tier === "GZEnterprise";
  const isAdmin = (user as any).user?.role === "ADMIN" || (user as any).user?.role === "SUPER_ADMIN";

  if (!isBusinessTier && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 px-4">
        <Store className="h-12 w-12 text-amber-400" />
        <h1 className="text-xl font-bold text-white text-center">GZBusiness Plan Required</h1>
        <p className="text-sm text-[#666] text-center max-w-xs">A Business storefront is available on the GZBusiness tier. Upgrade for free during Brand Build!</p>
        <Button onClick={() => navigate("/provider/me")} className="gap-1.5" style={{ background: "#f59e0b", color: "#000" }}>
          <Building2 className="h-4 w-4" /> Upgrade to GZBusiness
        </Button>
        <button onClick={() => navigate("/provider/me")} className="text-xs text-[#444] hover:text-[#888]">Back to dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-sm border-b border-[#111] px-4 py-2.5 flex items-center gap-3">
        <button onClick={() => navigate("/provider/me")} className="text-[#666] hover:text-white transition-colors" data-testid="button-setup-back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-white">Business Storefront Setup</span>
        {existing?.id && (
          <button onClick={() => navigate(`/business/${existing.id}`)}
            className="ml-auto text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1" data-testid="button-view-live">
            View live <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-5">
        {/* Banner */}
        <div className="rounded-xl p-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8 text-amber-400 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-amber-400">Your Business Storefront</h1>
              <p className="text-xs text-[#888] mt-0.5">
                {existing ? "Update your info — changes go live immediately." : "Fill in your details to launch your public storefront on Gigzito."}
              </p>
            </div>
          </div>
        </div>

        {/* Business Name */}
        <div className="space-y-1.5">
          <Label className="text-xs text-[#aaa]">Business Name <span className="text-[#ff2b2b]">*</span></Label>
          <Input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="e.g. Joe's Auto Shop"
            className="bg-[#0b0b0b] border-[#1e1e1e]" data-testid="input-setup-biz-name" />
        </div>

        {/* Category + Industry */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#aaa]">Category</Label>
            <select value={bizCategory} onChange={(e) => setBizCategory(e.target.value)}
              className="w-full h-10 rounded-md bg-[#0b0b0b] border border-[#1e1e1e] text-white text-sm px-3"
              data-testid="select-setup-category">
              <option value="">Select…</option>
              {BIZ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#aaa]">Industry</Label>
            <Input value={bizIndustry} onChange={(e) => setBizIndustry(e.target.value)}
              placeholder="e.g. HVAC, Hair, SaaS…"
              className="bg-[#0b0b0b] border-[#1e1e1e] text-sm" data-testid="input-setup-industry" />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label className="text-xs text-[#aaa]">Street Address</Label>
          <Input value={bizAddress} onChange={(e) => { setBizAddress(e.target.value); setMapReady(false); }}
            placeholder="123 Main St" className="bg-[#0b0b0b] border-[#1e1e1e]" data-testid="input-setup-address" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#aaa]">City</Label>
            <Input value={bizCity} onChange={(e) => { setBizCity(e.target.value); setMapReady(false); }}
              placeholder="City" className="bg-[#0b0b0b] border-[#1e1e1e] text-sm" data-testid="input-setup-city" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#aaa]">State</Label>
            <Input value={bizState} onChange={(e) => { setBizState(e.target.value); setMapReady(false); }}
              placeholder="OR" maxLength={2} className="bg-[#0b0b0b] border-[#1e1e1e] text-sm" data-testid="input-setup-state" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#aaa]">ZIP</Label>
            <Input value={bizZip} onChange={(e) => { setBizZip(e.target.value); setMapReady(false); }}
              placeholder="97123" className="bg-[#0b0b0b] border-[#1e1e1e] text-sm" data-testid="input-setup-zip" />
          </div>
        </div>

        {/* Geocode + map */}
        <div className="space-y-2">
          <Button type="button" variant="ghost" onClick={geocodeAddress}
            disabled={geocoding || !bizAddress.trim()}
            className="w-full h-9 text-xs border border-[#1e1e1e] text-[#aaa] hover:text-white gap-1.5"
            data-testid="button-setup-geocode">
            {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
            {mapReady ? "Map found — click to re-geocode" : "Find on map"}
          </Button>
          {mapReady && bizLat && bizLng && (
            <div className="rounded-xl overflow-hidden border border-amber-900/30" style={{ height: 160 }}>
              <iframe
                title="Business location"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bizLng - 0.005},${bizLat - 0.003},${bizLng + 0.005},${bizLat + 0.003}&layer=mapnik&marker=${bizLat},${bizLng}`}
                className="w-full h-full"
                style={{ border: 0, filter: "invert(0.88) hue-rotate(180deg) saturate(0.8)" }}
              />
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#aaa]"><Phone className="inline h-3 w-3 mr-1" />Telephone</Label>
            <Input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)}
              placeholder="(503) 555-0100" className="bg-[#0b0b0b] border-[#1e1e1e] text-sm" data-testid="input-setup-phone" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#aaa]"><Mail className="inline h-3 w-3 mr-1" />Email Address</Label>
            <Input value={bizEmail} onChange={(e) => setBizEmail(e.target.value)}
              placeholder="info@yourstore.com" type="email" className="bg-[#0b0b0b] border-[#1e1e1e] text-sm" data-testid="input-setup-email" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-[#aaa]"><Globe className="inline h-3 w-3 mr-1" />Web Address</Label>
          <Input value={bizWebsite} onChange={(e) => setBizWebsite(e.target.value)}
            placeholder="https://yoursite.com" className="bg-[#0b0b0b] border-[#1e1e1e] text-sm" data-testid="input-setup-website" />
        </div>

        {/* Points of Contact */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-[#aaa] flex items-center gap-1.5">
              <User className="h-3 w-3" /> Points of Contact
            </Label>
            <button onClick={addContact}
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
              data-testid="btn-add-contact">
              <PlusCircle className="h-3 w-3" /> Add Contact
            </button>
          </div>
          {contacts.length === 0 ? (
            <p className="text-[11px] text-[#444] py-2">No contacts added yet. Click "Add Contact" to add a person or department.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((c, i) => (
                <div key={i} className="rounded-xl border border-[#1e1e1e] bg-[#0b0b0b] p-3 space-y-2" data-testid={`contact-card-${i}`}>
                  <div className="flex items-center justify-between gap-2">
                    <Input value={c.title} onChange={(e) => updateContact(i, "title", e.target.value)}
                      placeholder="Title (e.g. Sales Manager, Owner, Booking)"
                      className="bg-[#111] border-[#222] text-sm flex-1" data-testid={`input-contact-title-${i}`} />
                    <button onClick={() => removeContact(i)} className="text-[#333] hover:text-[#ff2b2b] transition-colors shrink-0" data-testid={`btn-remove-contact-${i}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Input value={c.name} onChange={(e) => updateContact(i, "name", e.target.value)}
                    placeholder="Full name" className="bg-[#111] border-[#222] text-sm" data-testid={`input-contact-name-${i}`} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={c.phone ?? ""} onChange={(e) => updateContact(i, "phone", e.target.value)}
                      placeholder="Phone" className="bg-[#111] border-[#222] text-sm" data-testid={`input-contact-phone-${i}`} />
                    <Input value={c.email ?? ""} onChange={(e) => updateContact(i, "email", e.target.value)}
                      placeholder="Email" className="bg-[#111] border-[#222] text-sm" data-testid={`input-contact-email-${i}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-[#aaa]">About your business</Label>
          <Textarea value={bizDescription} onChange={(e) => setBizDescription(e.target.value)}
            placeholder="Tell customers what you do, your hours, specialties, what makes you unique…"
            className="bg-[#0b0b0b] border-[#1e1e1e] text-sm resize-none" rows={4}
            data-testid="input-setup-description" />
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={saveMutation.isPending || !bizName.trim()}
          className="w-full h-11 text-sm font-bold gap-2"
          style={{ background: "#f59e0b", color: "#000", border: "none" }}
          data-testid="button-save-business-profile">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {existing ? "Save Changes" : "Launch My Storefront"}
        </Button>

        {/* Ad Creator shortcuts (owner only, once profile is saved) */}
        {existing?.id && (
          <div className="space-y-2 pb-4">
            <p className="text-[10px] text-[#444] uppercase tracking-wider font-semibold pt-2">Marketing Tools</p>

            <button onClick={() => navigate("/gz-business")}
              className="w-full flex items-center gap-3 rounded-xl border border-[#1e1e1e] bg-[#0b0b0b] p-3 text-left hover:border-blue-900/50 transition-all group"
              data-testid="btn-flash-ad-creator">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.12)" }}>
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Flash AD Creator</p>
                <p className="text-[10px] text-[#555]">Create GZFlash limited-time offers in the Offer Center</p>
              </div>
            </button>

            <button onClick={() => navigate("/provider/new")}
              className="w-full flex items-center gap-3 rounded-xl border border-[#1e1e1e] bg-[#0b0b0b] p-3 text-left hover:border-emerald-900/50 transition-all group"
              data-testid="btn-video-ad-creator">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.12)" }}>
                <Video className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Video AD Creator</p>
                <p className="text-[10px] text-[#555]">Upload a video listing that appears in the main feed</p>
              </div>
            </button>

            <button
              className="w-full flex items-center gap-3 rounded-xl border border-[#1e1e1e] bg-[#0b0b0b] p-3 text-left opacity-60 cursor-not-allowed"
              data-testid="btn-preemptive-ad-creator" disabled>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.08)" }}>
                <Radio className="h-4 w-4 text-amber-400/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#666]">Preemptive AD Creator</p>
                <p className="text-[10px] text-[#444]">GPS proximity push-pin ads — coming soon</p>
              </div>
              <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>SOON</span>
            </button>
          </div>
        )}

        <p className="text-[10px] text-[#333] text-center pb-4">
          Your storefront will be publicly visible at /business/{existing?.id ?? "…"}
        </p>
      </div>
    </div>
  );
}
