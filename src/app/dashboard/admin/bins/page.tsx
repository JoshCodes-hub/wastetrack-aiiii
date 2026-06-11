"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SmartBin } from "@/types";
import Navbar from "@/components/Navbar";
import SmartBinCard from "@/components/SmartBinCard";
import MapViewWrapper from "@/components/MapViewWrapper";

export default function AdminBinsPage() {
  const router = useRouter();
  const [bins, setBins] = useState<SmartBin[]>([]);
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

      const { data: allBins } = await supabase
        .from("smart_bins")
        .select("*");

      if (allBins) setBins(allBins);
    };

    init();

    const binsSub = supabase
      .channel("admin-bins")
      .on("postgres_changes", { event: "*", schema: "public", table: "smart_bins" }, (payload) => {
        if (payload.eventType === "INSERT") setBins(prev => [...prev, payload.new as SmartBin]);
        else if (payload.eventType === "DELETE") setBins(prev => prev.filter(b => b.id !== payload.old.id));
        else setBins(prev => prev.map(b => b.id === payload.new.id ? payload.new as SmartBin : b));
      })
      .subscribe();

    return () => { supabase.removeChannel(binsSub); };
  }, [router]);

  const fullBins = bins.filter(b => b.status === "full");
  const halfBins = bins.filter(b => b.status === "half_full");
  const emptyBins = bins.filter(b => b.status === "empty");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role="admin" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-green-900">Smart Bin Management</h1>
          <p className="text-gray-500">{bins.length} bins monitored</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-500">Full</p>
            <p className="text-3xl font-bold text-red-600">{fullBins.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Half Full</p>
            <p className="text-3xl font-bold text-yellow-600">{halfBins.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Empty</p>
            <p className="text-3xl font-bold text-green-600">{emptyBins.length}</p>
          </div>
        </div>

        <MapViewWrapper bins={bins} height="400px" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bins.map((bin) => (
            <SmartBinCard key={bin.id} bin={bin} />
          ))}
        </div>
      </main>
    </div>
  );
}
