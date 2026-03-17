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
import { LogOut, Settings, Shield, LayoutDashboard, Sparkles, CreditCard, Layers, Flame, Zap, MapPin, Lock } from "lucide-react";

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
