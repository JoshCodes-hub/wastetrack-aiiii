"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Cleaner } from "@/types";
import Navbar from "@/components/Navbar";
import MapViewWrapper from "@/components/MapViewWrapper";

export default function AdminCleanersPage() {
  const router = useRouter();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();
      if (profile) setUserName(profile.name);

      const { data: allCleaners } = await supabase
        .from("cleaners")
        .select("*");

      if (allCleaners) setCleaners(allCleaners);
    };

    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role="admin" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-green-900">Cleaner Management</h1>
          <p className="text-gray-500">{cleaners.length} registered cleaners</p>
        </div>

        <MapViewWrapper cleaners={cleaners} height="400px" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cleaners.map((cleaner) => (
            <div key={cleaner.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  cleaner.is_active ? "bg-green-100" : "bg-gray-100"
                }`}>
                  🧹
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{cleaner.name}</h3>
                  <p className="text-xs text-gray-500">{cleaner.email}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  cleaner.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                }`}>
                  {cleaner.is_active ? "Active" : "Offline"}
                </div>
              </div>
              {cleaner.phone && <p className="text-xs text-gray-500">📞 {cleaner.phone}</p>}
              {cleaner.latitude && cleaner.longitude && (
                <p className="text-xs text-gray-500">
                  📍 {cleaner.latitude.toFixed(4)}, {cleaner.longitude.toFixed(4)}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
