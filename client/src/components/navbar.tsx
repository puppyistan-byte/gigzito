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

  return null;
}
