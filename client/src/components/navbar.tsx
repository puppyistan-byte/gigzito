import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Settings, LogOut, Shield, LayoutDashboard, PlusCircle } from "lucide-react";

import logoImg from "@assets/file_00000000e17471fdb85cd1f020d6f5a2_1772560922928.png";

export function Navbar() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const initials = user?.profile?.displayName
    ? user.profile.displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/95 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/">
          <a data-testid="link-logo" className="flex items-center">
            <img src={logoImg} alt="Gigzito" className="h-10 w-auto" />
          </a>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="button-user-menu" className="p-2 text-white/60 hover:text-white outline-none">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-black border-white/10 text-white">
                <DropdownMenuItem asChild>
                  <Link href="/provider/new"><a className="flex items-center gap-2 w-full cursor-pointer"><PlusCircle className="h-4 w-4" />Post Video</a></Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/provider/me"><a className="flex items-center gap-2 w-full cursor-pointer"><LayoutDashboard className="h-4 w-4" />Dashboard</a></Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/provider/profile"><a className="flex items-center gap-2 w-full cursor-pointer"><Settings className="h-4 w-4" />Edit Profile</a></Link>
                </DropdownMenuItem>
                {user.user?.role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin"><a className="flex items-center gap-2 w-full cursor-pointer"><Shield className="h-4 w-4" />Admin</a></Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  data-testid="button-logout"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <button className="p-2 text-white/60 hover:text-white">
                <MoreVertical className="h-5 w-5" />
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
