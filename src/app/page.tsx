"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">WT</span>
          </div>
          <span className="font-bold text-xl text-green-900">WasteTrack AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-700 transition-colors">
            Login
          </Link>
          <Link href="/auth/register" className="px-5 py-2.5 text-sm font-medium text-white gradient-primary rounded-lg hover:opacity-90 transition-all shadow-md hover:shadow-lg">
            Get Started
          </Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft"></span>
              AI-Powered Waste Management
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-green-900 mb-6">
              Smart Waste{" "}
              <span className="text-transparent bg-clip-text gradient-primary">Management</span>
              {" "}for a Cleaner Future
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              WasteTrack AI leverages artificial intelligence, GPS tracking, and IoT-enabled smart bins
              to revolutionize waste management. Report, track, and manage waste in real-time.
            </p>
            <div className="flex gap-4">
              <Link href="/auth/register" className="px-8 py-3.5 text-white font-medium gradient-primary rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl">
                Start Reporting
              </Link>
              <Link href="/auth/login" className="px-8 py-3.5 text-green-700 font-medium border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all">
                Watch Demo
              </Link>
            </div>
            <div className="flex items-center gap-8 mt-12 pt-8 border-t border-green-100">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-900">1K+</div>
                <div className="text-sm text-gray-500">Reports Filed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">95%</div>
                <div className="text-sm text-gray-500">Resolution Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-900">50+</div>
                <div className="text-sm text-gray-500">Smart Bins</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-green-100">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50">
                  <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white">📸</div>
                  <div>
                    <div className="font-medium text-green-900">AI Waste Classification</div>
                    <div className="text-sm text-gray-500">Snap a photo, AI identifies waste type</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white">📍</div>
                  <div>
                    <div className="font-medium text-blue-900">GPS Tracking</div>
                    <div className="text-sm text-gray-500">Automatic location detection</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white">🗑️</div>
                  <div>
                    <div className="font-medium text-emerald-900">Smart Bin Monitoring</div>
                    <div className="text-sm text-gray-500">Real-time fill level tracking</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center text-white">📊</div>
                  <div>
                    <div className="font-medium text-indigo-900">Analytics Dashboard</div>
                    <div className="text-sm text-gray-500">Comprehensive waste insights</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-green-900 mb-12">
            Three Simple Roles, One Powerful Platform
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Reporters", desc: "Citizens & students report waste with photos, GPS, and AI classification", icon: "📱", color: "green" },
              { title: "Cleaners", desc: "Get assigned reports, navigate to locations, update status in real-time", icon: "🧹", color: "blue" },
              { title: "Administrators", desc: "Oversee operations, view analytics, manage smart bins and cleaners", icon: "⚙️", color: "emerald" },
            ].map((role) => (
              <div key={role.title} className="glass-card rounded-2xl p-8 hover:shadow-xl transition-all">
                <div className="text-4xl mb-4">{role.icon}</div>
                <h3 className="text-xl font-bold text-green-900 mb-3">{role.title}</h3>
                <p className="text-gray-600">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-gray-500 border-t border-green-100">
        <p>© 2026 WasteTrack AI. Built for a cleaner future.</p>
      </footer>
    </div>
  );
}
