"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"

interface LeaderboardScreenProps {
  onBack: () => void
}

type LeaderboardEntry = {
  _id: string
  username: string
  score: number
  wave: number
  createdAt: number
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const scores = useQuery(api.scores.getTopScores) as LeaderboardEntry[] | undefined

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-[#08090d]/95 text-[#f4ead2]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-[#ffd98a] md:text-4xl">Leaderboard</h2>
          <Button onClick={onBack} variant="outline" className="border-[#c99337]/60 text-[#ffd98a]">
            Back
          </Button>
        </div>

        <div className="rounded-xl border border-[#c99337]/30 bg-[#12141d]/70">
          <div className="grid grid-cols-[3rem_1.3fr_1fr_0.8fr_1fr] gap-2 border-b border-[#c99337]/20 px-4 py-3 text-xs uppercase tracking-widest text-[#c99337] md:text-sm">
            <span>#</span>
            <span>Username</span>
            <span>Score</span>
            <span>Wave</span>
            <span>Date</span>
          </div>

          <div className="divide-y divide-[#c99337]/10">
            {(scores ?? []).map((entry, index) => (
              <div
                key={entry._id}
                className="grid grid-cols-[3rem_1.3fr_1fr_0.8fr_1fr] gap-2 px-4 py-3 text-sm md:text-base"
              >
                <span className="text-[#c99337]">{index + 1}</span>
                <span className="truncate">{entry.username}</span>
                <span>{entry.score}</span>
                <span>{entry.wave}</span>
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {scores !== undefined && scores.length === 0 && (
              <div className="px-4 py-10 text-center text-[#c9bca0]">No scores yet. Be the first defender.</div>
            )}
            {scores === undefined && (
              <div className="px-4 py-10 text-center text-[#c9bca0]">Loading scores...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
