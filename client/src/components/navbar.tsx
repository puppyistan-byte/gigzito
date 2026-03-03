import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Zap, User, Settings, LogOut, Shield, PlusCircle, LayoutDashboard } from "lucide-react";

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto flex h-12 items-center justify-between px-4">
        <Link href="/">
          <a data-testid="link-logo" className="flex items-center gap-1.5 font-bold text-lg text-foreground">
            <Zap className="h-5 w-5 text-primary" />
            <span>Gigzito</span>
          </a>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/provider/new">
                <Button size="sm" variant="ghost" data-testid="button-post-video" className="h-8 text-xs font-semibold">
                  Post Video
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="button-user-menu" className="rounded-full outline-none focus:ring-1 focus:ring-primary transition-all">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={user.profile?.avatarUrl ?? ""} alt={user.profile?.displayName ?? ""} />
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/provider/me"><a data-testid="link-dashboard" className="flex items-center gap-2 w-full cursor-pointer"><LayoutDashboard className="h-4 w-4" />Dashboard</a></Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/provider/profile"><a data-testid="link-profile" className="flex items-center gap-2 w-full cursor-pointer"><Settings className="h-4 w-4" />Edit Profile</a></Link>
                  </DropdownMenuItem>
                  {user.user?.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin"><a data-testid="link-admin" className="flex items-center gap-2 w-full cursor-pointer"><Shield className="h-4 w-4" />Admin</a></Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
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
            </>
          ) : (
            <Link href="/auth">
              <Button size="sm" variant="ghost" data-testid="button-login" className="h-8 text-xs font-semibold">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
