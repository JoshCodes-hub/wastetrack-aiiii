"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface LeaderboardEntry {
  name: string;
  report_count: number;
  avatar_url?: string;
}

const BADGES: [number, string, string][] = [
  [1, "🥇", "Gold"],
  [2, "🥈", "Silver"],
  [3, "🥉", "Bronze"],
];

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("users").select("name").eq("id", user.id).single().then(({ data }) => {
          if (data) setCurrentUser(data.name);
        });
      }
    });

    supabase
      .from("reports")
      .select("user_id")
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const r of data) { counts[r.user_id] = (counts[r.user_id] || 0) + 1; }
        const userIds = Object.keys(counts);
        if (userIds.length === 0) return;

        supabase
          .from("users")
          .select("id, name")
          .in("id", userIds)
          .then(({ data: users }) => {
            if (!users) return;
            const sorted = users
              .map(u => ({ name: u.name, report_count: counts[u.id] || 0 }))
              .sort((a, b) => b.report_count - a.report_count)
              .slice(0, 10);
            setEntries(sorted);
          });
      });
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏆</span>
        <h3 className="font-semibold text-gray-900 dark:text-white">Reporter Leaderboard</h3>
      </div>
      <div className="space-y-2">
        {entries.map((e, i) => {
          const badge = BADGES.find(b => b[0] === i + 1);
          const isMe = e.name === currentUser;
          return (
            <div
              key={e.name}
              className={`flex items-center justify-between p-3 rounded-xl ${
                isMe
                  ? "bg-green-100 dark:bg-green-900/30 ring-1 ring-green-400"
                  : "bg-gray-50 dark:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-gray-400">
                  {badge ? badge[1] : `#${i + 1}`}
                </span>
                <span className={`font-medium ${isMe ? "text-green-800 dark:text-green-300" : "text-gray-700 dark:text-gray-200"}`}>
                  {e.name} {isMe && "(you)"}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {e.report_count} reports
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
