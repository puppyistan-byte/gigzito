import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Shield, LayoutDashboard, Sparkles, CreditCard, Layers, Flame, Zap, MapPin, Lock, Bell, Trophy, Users, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function NotificationBell() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30_000,
  });

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: false,
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const unread = countData?.count ?? 0;

  const handleOpen = () => {
    qc.invalidateQueries({ queryKey: ["/api/notifications"] });
    qc.fetchQuery({ queryKey: ["/api/notifications"] });
  };

  const handleNotifClick = (n: Notification) => {
    if (!n.isRead) markReadMut.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && handleOpen()}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex items-center justify-center rounded-full bg-black/60 border border-white/10 backdrop-blur-sm h-9 w-9 hover:bg-black/80 transition-colors focus:outline-none"
          data-testid="button-notification-bell"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-zinc-300" />
          {unread > 0 && (
            <span
              data-testid="badge-notification-count"
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 bg-[#0d0d0d] border-[#2a2a2a] text-white shadow-xl p-0"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => markAllMut.mutate()}
              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {notifs.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 py-6">No notifications yet</p>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                data-testid={`notification-item-${n.id}`}
                onClick={() => handleNotifClick(n)}
                className={`flex gap-2.5 px-3 py-2.5 cursor-pointer border-b border-[#1a1a1a] hover:bg-white/5 transition-colors ${n.isRead ? "opacity-60" : ""}`}
              >
                <div className="mt-0.5 shrink-0">
                  <div className={`h-2 w-2 rounded-full mt-1 ${n.isRead ? "bg-zinc-600" : "bg-red-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white leading-tight truncate">{n.title}</p>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  if (!user) return null;

  const role = user?.user?.role ?? "";
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(role);
  const isProvider = ["PROVIDER", "MARKETER", "INFLUENCER", "CORPORATE", "COORDINATOR", "ADMIN", "SUPER_ADMIN", "SUPERUSER"].includes(role);

  const myUserId = user?.user?.id ?? null;
  const displayName = user?.profile?.displayName || user?.profile?.username || user?.user?.email?.split("@")[0] || "Account";
  const email = user?.user?.email ?? "";
  const avatarUrl = user?.profile?.avatarUrl ?? "";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 12,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
      data-testid="navbar-profile"
    >
      {/* Notification Bell */}
      <NotificationBell />

      {/* Avatar dropdown for navigation */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-1.5 py-1 hover:bg-black/80 transition-colors focus:outline-none"
            data-testid="button-profile-menu"
          >
            <Avatar className="h-7 w-7">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-[11px] font-bold bg-[#ff2b2b]/20 text-[#ff2b2b]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-52 bg-[#0d0d0d] border-[#2a2a2a] text-white shadow-xl"
        >
          <DropdownMenuLabel className="pb-1">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-[11px] font-normal text-zinc-500 truncate">{email}</p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-[#1e1e1e]" />

          {isProvider && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-zinc-300"
              onClick={() => navigate("/provider/me")}
              data-testid="menu-item-dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-yellow-500/10 focus:bg-yellow-500/10 text-yellow-300"
            onClick={() => navigate("/activity")}
            data-testid="menu-item-activity"
          >
            <Bell className="h-4 w-4" />
            Activity Feed
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-zinc-300"
            onClick={() => navigate("/provider/profile")}
            data-testid="menu-item-settings"
          >
            <Settings className="h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>

          {myUserId && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-zinc-300"
              onClick={() => navigate(`/geezee/${myUserId}?section=security`)}
              data-testid="menu-item-security"
            >
              <Lock className="h-4 w-4" />
              Security Settings
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-purple-500/10 focus:bg-purple-500/10 text-purple-300"
            onClick={() => navigate("/geezees")}
            data-testid="menu-item-geezees"
          >
            <Sparkles className="h-4 w-4" />
            GeeZees Rolodex
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-400"
            onClick={() => navigate("/card-editor")}
            data-testid="menu-item-card-editor"
          >
            <CreditCard className="h-4 w-4" />
            GeeZee Social Cards
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-zinc-300"
            onClick={() => navigate("/pricing")}
            data-testid="menu-item-pricing"
          >
            <Layers className="h-4 w-4" />
            Membership Tiers
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-yellow-500/10 focus:bg-yellow-500/10 text-yellow-400"
            onClick={() => navigate("/most-loved")}
            data-testid="menu-item-most-loved"
          >
            <Trophy className="h-4 w-4" />
            Most Loved
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-blue-500/10 focus:bg-blue-500/10 text-blue-400"
            onClick={() => navigate("/groups")}
            data-testid="menu-item-groups"
          >
            <Users className="h-4 w-4" />
            GZGroups
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-orange-500/10 focus:bg-orange-500/10 text-orange-300"
            onClick={() => navigate("/keeping-it-geezee")}
            data-testid="menu-item-keeping-it-geezee"
          >
            <Flame className="h-4 w-4" />
            Keeping it Geezee
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-400"
            onClick={() => navigate("/what-is-gigjack")}
            data-testid="menu-item-what-is-gigjack"
          >
            <Zap className="h-4 w-4" />
            What is GigJack?
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-yellow-500/10 focus:bg-yellow-500/10 text-yellow-400"
            onClick={() => navigate("/preemptive-marketing")}
            data-testid="menu-item-preemptive-marketing"
          >
            <MapPin className="h-4 w-4" />
            Preemptive Marketing
          </DropdownMenuItem>

          {(isAdmin || user?.user?.subscriptionTier === "GZBusiness") && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer hover:bg-blue-500/10 focus:bg-blue-500/10 text-blue-400"
              onClick={() => navigate("/gz-business")}
              data-testid="menu-item-gzbusiness"
            >
              <Zap className="h-4 w-4" />
              GZBusiness Portal
            </DropdownMenuItem>
          )}

          {isAdmin && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-zinc-300"
              onClick={() => navigate("/admin")}
              data-testid="menu-item-admin"
            >
              <Shield className="h-4 w-4" />
              Admin Console
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="bg-[#1e1e1e]" />

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-400"
            onClick={handleLogout}
            data-testid="menu-item-signout"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}
