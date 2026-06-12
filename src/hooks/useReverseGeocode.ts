"use client";

import { useEffect, useState, useRef } from "react";

const cache = new Map<string, string>();

export function useReverseGeocode(lat: number | null | undefined, lng: number | null | undefined): string {
  const [name, setName] = useState("");
  const pendingRef = useRef(false);

  useEffect(() => {
    if (lat == null || lng == null) { setName(""); return; }

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (cache.has(key)) { setName(cache.get(key)!); return; }

    if (pendingRef.current) return;
    pendingRef.current = true;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
          { headers: { "User-Agent": "WasteTrackAI/1.0" }, signal: controller.signal }
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const display = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        // Shorten: take first 2-3 comma parts
        const parts = display.split(",").slice(0, 3).join(",").trim();
        cache.set(key, parts);
        setName(parts);
      } catch {
        setName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        pendingRef.current = false;
      }
    }, 200);

    return () => { clearTimeout(timeout); controller.abort(); };
  }, [lat, lng]);

  return name;
}
