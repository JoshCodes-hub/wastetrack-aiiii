"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types";

interface NavbarProps {
  role: UserRole;
  userName?: string;
}

export default function Navbar({ role, userName }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const navLinks: Record<UserRole, { href: string; label: string }[]> = {
    reporter: [
      { href: "/dashboard/reporter", label: "Dashboard" },
      { href: "/reports/new", label: "New Report" },
      { href: "/map", label: "Map View" },
    ],
    cleaner: [
      { href: "/dashboard/cleaner", label: "Dashboard" },
      { href: "/map", label: "Map View" },
    ],
    admin: [
      { href: "/dashboard/admin", label: "Dashboard" },
      { href: "/dashboard/admin/reports", label: "Reports" },
      { href: "/dashboard/admin/cleaners", label: "Cleaners" },
      { href: "/dashboard/admin/bins", label: "Smart Bins" },
      { href: "/dashboard/admin/analytics", label: "Analytics" },
      { href: "/map", label: "Map View" },
    ],
  };

  const roleColors: Record<UserRole, string> = {
    reporter: "bg-green-500",
    cleaner: "bg-blue-500",
    admin: "bg-purple-500",
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-green-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href={`/dashboard/${role}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">WT</span>
            </div>
            <span className="font-bold text-lg text-green-900">WasteTrack</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks[role].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${roleColors[role]}`}></div>
              <span className="text-sm text-gray-600 capitalize">{userName || role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
