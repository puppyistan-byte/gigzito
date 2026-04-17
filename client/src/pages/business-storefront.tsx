import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  MapPin, Phone, Globe, Store, Trash2, Clock, ChevronLeft,
  Send, Building2, Edit, ImageIcon, ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type BusinessProfile = {
  id: number;
  userId: number;
  businessName: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

type WallPost = {
  id: number;
  businessProfileId: number;
  authorUserId?: number | null;
  authorName: string;
  authorAvatar?: string | null;
  message: string;
  imageUrl?: string | null;
  createdAt: string;
};

function avatarInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function MapSliver({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height: 150 }}>
      <iframe
        title={`Map for ${address}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.006},${lat - 0.004},${lng + 0.006},${lat + 0.004}&layer=mapnik&marker=${lat},${lng}`}
        className="w-full h-full"
        style={{ border: 0, filter: "invert(0.88) hue-rotate(180deg) saturate(0.8)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-1.5"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
        <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <span className="text-xs text-white/80 truncate">{address}</span>
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`}
          target="_blank" rel="noopener noreferrer"
          className="ml-auto text-amber-400 hover:text-amber-300 transition-colors shrink-0">
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function WallComposer({ businessProfileId, onPosted }: { businessProfileId: number; onPosted: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!message.trim()) { toast({ title: "Write a message first", variant: "destructive" }); return; }
    setPosting(true);
    try {
      await apiRequest("POST", `/api/business/${businessProfileId}/wall`, {
        message: message.trim(),
        guestName: guestName.trim() || undefined,
      }).then((r) => r.json());
      setMessage("");
      setGuestName("");
      onPosted();
      toast({ title: "Posted!" });
    } catch {
      toast({ title: "Could not post", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#1e1e1e] p-3 space-y-2 bg-[#0b0b0b]">
      {!user && (
        <Input value={guestName} onChange={(e) => setGuestName(e.target.value)}
          placeholder="Your name (optional)" className="bg-[#111] border-[#1e1e1e] text-sm"
          data-testid="input-biz-wall-guest-name" />
      )}
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
        placeholder="Write on the wall…" rows={3}
        className="bg-[#111] border-[#1e1e1e] text-sm resize-none"
        data-testid="input-biz-wall-message" />
      <div className="flex justify-end">
        <Button size="sm" onClick={handlePost} disabled={posting || !message.trim()}
          className="gap-1.5" data-testid="button-biz-wall-post">
          <Send className="h-3.5 w-3.5" />
          {posting ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}

function WallPostCard({ post, canDelete, onDelete }: { post: WallPost; canDelete: boolean; onDelete: () => void }) {
  const initial = avatarInitials(post.authorName);
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0b0b0b] p-3"
      data-testid={`biz-wall-post-${post.id}`}>
      <div className="flex items-start gap-2.5">
        {post.authorAvatar ? (
          <img src={post.authorAvatar} alt={post.authorName}
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#222]" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#222] flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{post.authorName}</span>
            <span className="text-[10px] text-[#444] flex items-center gap-0.5 shrink-0">
              <Clock className="h-2.5 w-2.5" />{timeAgo}
            </span>
            {canDelete && (
              <button onClick={onDelete}
                className="ml-auto text-[#333] hover:text-[#ff2b2b] transition-colors shrink-0"
                data-testid={`delete-biz-post-${post.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-sm text-[#ccc] mt-1 leading-relaxed">{post.message}</p>
          {post.imageUrl && (
            <img src={post.imageUrl} alt="" className="mt-2 rounded-lg w-full max-h-48 object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function BusinessStorefrontPage() {
  const params = useParams<{ id?: string; username?: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const id = params.id;
  const username = params.username;

  const queryKey = username
    ? [`/api/business/by-username/${username}`]
    : [`/api/business/${id}`];

  const { data: business, isLoading } = useQuery<BusinessProfile>({
    queryKey,
    enabled: !!(id || username),
  });

  const wallKey = business ? [`/api/business/${business.id}/wall`] : null;
  const { data: posts = [], refetch: refetchWall } = useQuery<WallPost[]>({
    queryKey: wallKey ?? ["noop"],
    enabled: !!wallKey,
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: number) =>
      apiRequest("DELETE", `/api/business/${business!.id}/wall/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wallKey! });
      toast({ title: "Post deleted" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-3">
        <Store className="h-10 w-10 text-[#333]" />
        <p className="text-[#555] text-sm">Business not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Go home</Button>
      </div>
    );
  }

  const isOwner = user?.id === business.userId;
  const isAdmin = (user as any)?.role === "ADMIN" || (user as any)?.role === "SUPER_ADMIN";
  const hasAddress = business.address || business.city;
  const fullAddress = [business.address, business.city, business.state, business.zip].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-[#050505] pb-20">
      {/* Back */}
      <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-sm border-b border-[#111] px-4 py-2.5 flex items-center gap-3">
        <button onClick={() => navigate(-1 as any)} className="text-[#666] hover:text-white transition-colors"
          data-testid="button-biz-back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-white truncate">{business.businessName}</span>
        {isOwner && (
          <button onClick={() => navigate("/business-profile/settings")}
            className="ml-auto text-[#555] hover:text-amber-400 transition-colors"
            data-testid="button-biz-edit">
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Cover */}
      {business.coverUrl ? (
        <div className="w-full h-40 overflow-hidden">
          <img src={business.coverUrl} alt="cover" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-24" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0) 100%)" }} />
      )}

      <div className="px-4 -mt-8 space-y-4 max-w-lg mx-auto">
        {/* Logo + Name */}
        <div className="flex items-end gap-3">
          <div className="w-20 h-20 rounded-2xl border-2 border-amber-900/60 overflow-hidden bg-[#111] flex items-center justify-center shrink-0 shadow-xl">
            {business.logoUrl ? (
              <img src={business.logoUrl} alt={business.businessName} className="w-full h-full object-cover" />
            ) : (
              <Store className="h-8 w-8 text-amber-400" />
            )}
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-xl font-bold text-white leading-tight" data-testid="biz-name">{business.businessName}</h1>
            {business.category && (
              <span className="text-xs text-amber-400/80 font-medium">{business.category}</span>
            )}
          </div>
        </div>

        {/* Contact strip */}
        <div className="flex flex-wrap gap-2">
          {business.phone && (
            <a href={`tel:${business.phone}`}
              className="flex items-center gap-1.5 text-xs text-[#999] hover:text-white bg-[#111] border border-[#1e1e1e] rounded-full px-3 py-1 transition-colors"
              data-testid="biz-phone">
              <Phone className="h-3 w-3" />{business.phone}
            </a>
          )}
          {business.website && (
            <a href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#999] hover:text-white bg-[#111] border border-[#1e1e1e] rounded-full px-3 py-1 transition-colors"
              data-testid="biz-website">
              <Globe className="h-3 w-3" />Website
            </a>
          )}
          {hasAddress && !business.lat && (
            <div className="flex items-center gap-1.5 text-xs text-[#666] bg-[#111] border border-[#1e1e1e] rounded-full px-3 py-1">
              <MapPin className="h-3 w-3" />{fullAddress}
            </div>
          )}
        </div>

        {/* Map sliver */}
        {business.lat && business.lng && (
          <MapSliver lat={business.lat} lng={business.lng} address={fullAddress} />
        )}

        {/* Description */}
        {business.description && (
          <div className="rounded-xl border border-[#1a1a1a] bg-[#0b0b0b] p-3">
            <p className="text-sm text-[#bbb] leading-relaxed">{business.description}</p>
          </div>
        )}

        {/* Wall */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-amber-400" />
            <h2 className="text-sm font-bold text-white">Business Wall</h2>
          </div>

          <WallComposer businessProfileId={business.id} onPosted={() => refetchWall()} />

          <div className="mt-3 space-y-2">
            {posts.length === 0 && (
              <div className="text-center py-8 text-[#444] text-sm">
                No posts yet — be the first to write on the wall!
              </div>
            )}
            {posts.map((post) => (
              <WallPostCard
                key={post.id}
                post={post}
                canDelete={isOwner || isAdmin || user?.id === post.authorUserId}
                onDelete={() => deleteMutation.mutate(post.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
