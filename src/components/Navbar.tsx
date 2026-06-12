"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types";
import { useTheme } from "@/lib/theme-context";

interface NavbarProps {
  role: UserRole;
  userName?: string;
}

export default function Navbar({ role, userName }: NavbarProps) {
  const router = useRouter();
  const { theme, toggle } = useTheme();

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
    <nav className="sticky top-0 z-50 backdrop-blur-lg border-b transition-colors"
      style={{ background: "var(--nav-bg)", borderColor: "var(--card-border)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href={`/dashboard/${role}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">WT</span>
            </div>
            <span className="font-bold text-lg" style={{ color: "var(--foreground)" }}>WasteTrack</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks[role].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium rounded-lg transition-all"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.background = "rgba(22,163,74,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="p-2 rounded-lg transition-all"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(22,163,74,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${roleColors[role]}`}></div>
              <span className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{userName || role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
