"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { analyzeWasteImage } from "@/lib/ai";
import { calculateDistance, findNearestCleaner, mapAnalysisToDb } from "@/lib/utils";
import { AIAnalysis } from "@/types";
import Navbar from "@/components/Navbar";
import AIAnalysisResult from "@/components/AIAnalysisResult";

export default function NewReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"capture" | "analyze" | "submit">("capture");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("users").select("name").eq("id", user.id).single().then(({ data }) => {
          if (data) setUserName(data.name);
        });
      }
    });
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("GPS not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      },
      () => setError("Could not get location. Please enable GPS."),
      { enableHighAccuracy: true }
    );
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStep("analyze");
    setAnalyzing(true);

    try {
      const result = await analyzeWasteImage(file, description);
      setAnalysis(result);
      setStep("submit");
    } catch {
      setError("AI analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !analysis) return;
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("report-images")
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("report-images")
        .getPublicUrl(fileName);

      const dbFields = mapAnalysisToDb(analysis);

      const { data: newReport, error: reportError } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          description,
          latitude,
          longitude,
          address,
          waste_type: dbFields.waste_type,
          severity: dbFields.severity,
          priority: dbFields.priority,
          status: "pending",
        })
        .select()
        .single();

      if (reportError) throw reportError;

      const { data: availableCleaners } = await supabase
        .from("cleaners")
        .select("*")
        .eq("is_active", true);

      const connectedCleaners: any[] = (availableCleaners || []).filter(
        (c: any) => c.latitude && c.longitude
      );

      if (connectedCleaners.length > 0 && newReport) {
        let nearestId: string | null = null;
        let nearestDist = Infinity;
        for (const c of connectedCleaners) {
          const d = calculateDistance(latitude, longitude, c.latitude, c.longitude);
          if (d < nearestDist) { nearestDist = d; nearestId = c.id; }
        }

        if (nearestId) {
          await supabase.from("assignments").insert({
            report_id: newReport.id,
            cleaner_id: nearestId,
            status: "assigned",
            distance_km: Math.round(nearestDist * 100) / 100,
          });
        }
      }

      router.push(`/reports/${newReport.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar role="reporter" userName={userName} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-green-900 mb-2">Submit Waste Report</h1>
        <p className="text-gray-500 mb-8">AI will analyze your photo and classify the waste</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Step 1: Capture Location</h2>
            <button
              type="button"
              onClick={handleGetLocation}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-medium"
            >
              📍 {latitude ? `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : "Get GPS Location"}
            </button>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Step 2: Upload Waste Photo</h2>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Waste" className="w-full h-64 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 text-white text-sm rounded-lg"
                >
                  Change Photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-green-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-green-500 hover:bg-green-50/50 transition-all"
              >
                <span className="text-4xl">📸</span>
                <span className="text-sm text-gray-500">Tap to take a photo or upload</span>
              </button>
            )}
          </div>

          {analyzing && (
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500">AI is analyzing your waste image...</p>
            </div>
          )}

          {analysis && <AIAnalysisResult analysis={analysis} />}

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Step 3: Add Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the waste location, type, and any additional details..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address (optional)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, City"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !imageFile || !analysis}
            className="w-full py-4 text-white font-bold gradient-primary rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 text-lg"
          >
            {loading ? "Submitting Report..." : "🚀 Submit Waste Report"}
          </button>
        </form>
      </main>
    </div>
  );
}
