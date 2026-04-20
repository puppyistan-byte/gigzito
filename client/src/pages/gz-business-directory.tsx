import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Store, MapPin, Phone, Globe, Search, Building2, ChevronLeft, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

type BizEntry = {
  id: number;
  userId: number;
  businessName: string;
  category: string;
  industry?: string | null;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

function BizCard({ biz, onClick }: { biz: BizEntry; onClick: () => void }) {
  const location = [biz.city, biz.state].filter(Boolean).join(", ");
  const label = biz.industry || biz.category;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden border border-[#1a1a1a] bg-[#0b0b0b] hover:border-amber-900/50 transition-all group"
      data-testid={`card-biz-${biz.id}`}
    >
      {biz.coverUrl ? (
        <div className="w-full h-24 overflow-hidden">
          <img src={biz.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="w-full h-16" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(0,0,0,0) 100%)" }} />
      )}

      <div className="p-3 -mt-6 relative">
        <div className="flex items-end gap-2.5 mb-2">
          <div className="w-14 h-14 rounded-xl border-2 border-amber-900/50 overflow-hidden bg-[#111] flex items-center justify-center shrink-0 shadow-lg">
            {biz.logoUrl ? (
              <img src={biz.logoUrl} alt={biz.businessName} className="w-full h-full object-cover" />
            ) : (
              <Store className="h-6 w-6 text-amber-400" />
            )}
          </div>
          <div className="flex-1 min-w-0 pb-0.5">
            <p className="text-sm font-bold text-white truncate leading-tight">{biz.businessName}</p>
            {label && <p className="text-[10px] text-amber-400/80 font-medium truncate">{label}</p>}
          </div>
        </div>

        <div className="space-y-1">
          {location && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#666]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {biz.phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#666]">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{biz.phone}</span>
            </div>
          )}
          {biz.website && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#666]">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{biz.website.replace(/^https?:\/\//, "")}</span>
            </div>
          )}
        </div>

        {biz.description && (
          <p className="mt-2 text-[11px] text-[#555] line-clamp-2 leading-relaxed">{biz.description}</p>
        )}
      </div>
    </button>
  );
}

export default function GzBusinessDirectoryPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const tier = user?.user?.subscriptionTier ?? "";
  const canAddBusiness = ["GZBusiness", "GZEnterprise", "SUPER_ADMIN", "ADMIN"].includes(tier) || user?.user?.role === "SUPER_ADMIN";

  const handleAddBusiness = () => {
    if (!user) {
      navigate("/auth");
    } else if (canAddBusiness) {
      navigate("/business-profile/setup");
    } else {
      navigate("/pricing");
    }
  };

  const { data: businesses = [], isLoading } = useQuery<BizEntry[]>({
    queryKey: ["/api/businesses/directory"],
  });

  const filtered = businesses.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.businessName.toLowerCase().includes(q) ||
      (b.category ?? "").toLowerCase().includes(q) ||
      (b.industry ?? "").toLowerCase().includes(q) ||
      (b.city ?? "").toLowerCase().includes(q) ||
      (b.state ?? "").toLowerCase().includes(q) ||
      (b.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-sm border-b border-[#111] px-4 py-2.5">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate("/")} className="text-[#666] hover:text-white transition-colors shrink-0" data-testid="btn-dir-back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm font-bold text-white">GZBusiness Directory</span>
          </div>
          {businesses.length > 0 && (
            <span className="text-[10px] text-[#555] shrink-0">{businesses.length} listed</span>
          )}
          <button
            onClick={handleAddBusiness}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-full transition-colors shrink-0"
            data-testid="btn-add-business"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Business
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {/* Hero banner */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Store className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-amber-400">GZBusiness™ Directory</h1>
              <p className="text-[11px] text-[#666] mt-0.5">Browse local businesses & service providers on Gigzito.</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, industry, city…"
            className="bg-[#0b0b0b] border-[#1e1e1e] pl-9 text-sm"
            data-testid="input-biz-search"
          />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-[#1a1a1a] bg-[#0b0b0b] h-48 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Store className="h-10 w-10 text-[#222] mx-auto mb-3" />
            <p className="text-[#444] text-sm">
              {search ? "No businesses match your search." : "No businesses listed yet."}
            </p>
            {!search && (
              <>
                <p className="text-[#333] text-xs mt-1 mb-4">Be the first to list your business on Gigzito.</p>
                <button
                  onClick={handleAddBusiness}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
                  data-testid="btn-add-business-empty"
                >
                  <Plus className="h-4 w-4" />
                  Add Your Business
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((biz) => (
              <BizCard
                key={biz.id}
                biz={biz}
                onClick={() => navigate(`/business/${biz.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
