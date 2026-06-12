"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Report, Cleaner, SmartBin, Assignment } from "@/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-2xl flex items-center justify-center" style={{ background: "var(--card-bg)" }}>
      <div style={{ color: "var(--text-secondary)" }}>Loading map...</div>
    </div>
  ),
});

interface MapViewWrapperProps {
  reports?: Report[];
  cleaners?: Cleaner[];
  bins?: SmartBin[];
  assignments?: Assignment[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  liveBinId?: string;
}

export default function MapViewWrapper(props: MapViewWrapperProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return <MapView {...props} />;
}
