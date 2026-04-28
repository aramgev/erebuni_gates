"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"

interface MainMenuProps {
  onStartGame: () => void
  onShowLeaderboard: () => void
  onShowHelp: () => void
  onShowStory: () => void
}

export function MainMenu({
  onStartGame,
  onShowLeaderboard,
  onShowHelp,
  onShowStory,
}: MainMenuProps) {
  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-[#08090d] text-[#f4ead2]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(190,92,32,0.22),transparent_36%),linear-gradient(180deg,rgba(12,13,18,0.25),#08090d_78%)]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#c99337] to-transparent" />
      <div className="absolute -left-16 top-24 h-72 w-72 rotate-45 border border-[#c99337]/15" />
      <div className="absolute -right-20 bottom-20 h-80 w-80 rotate-45 border border-[#8e2f21]/20" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 md:px-10 lg:px-14">
        <header className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-4 text-[#c99337]/80">
            <RuneMark className="h-7 w-7" />
            <div className="h-px w-16 bg-[#c99337]/45 md:w-28" />
            <RuneMark className="h-7 w-7 rotate-180" />
          </div>
          <h1 className="text-4xl font-bold tracking-wide text-[#ffd98a] drop-shadow-[0_0_24px_rgba(201,147,55,0.35)] md:text-6xl lg:text-7xl">
            Gates of Erebuni
          </h1>
          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-[#d25b3d] md:text-base">
            Face the Trials of Khaldi
          </p>
        </header>

        <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-8 py-8 md:grid-cols-[0.95fr_1.05fr] md:gap-12 lg:gap-16">
          <section className="relative flex min-h-[320px] items-end justify-center md:min-h-[560px]">
            <div className="absolute bottom-0 h-[76%] w-[78%] rounded-full bg-[#c99337]/10 blur-3xl" />
            <div className="absolute bottom-8 h-40 w-72 border-t border-[#c99337]/25 bg-gradient-to-t from-[#8e2f21]/20 to-transparent" />
            <Image
              src="/player.png"
              alt="Ancient Urartu warrior"
              width={720}
              height={960}
              priority
              className="relative z-10 max-h-[48vh] w-auto object-contain drop-shadow-[0_28px_40px_rgba(0,0,0,0.65)] md:max-h-[68vh]"
            />
          </section>

          <section className="relative">
            <div className="absolute -left-4 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-[#c99337]/45 to-transparent md:block" />
            <div className="space-y-7">
              <div className="space-y-5 text-base leading-8 text-[#eadfc7] md:text-lg">
                <p>You are a warrior of ancient Urartu.</p>
                <p>
                  From the walls of Erebuni, you stand as the last line of
                  defense. Waves of shadow and stone march across the plains.
                </p>
                <p>
                  Choose your trials. Embrace the blessings of Khaldi. Hold the
                  wall. Survive the night.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  onClick={onStartGame}
                  size="lg"
                  className="h-14 border border-[#ffd98a]/50 bg-[#c99337] px-8 text-base font-bold uppercase tracking-[0.2em] text-[#140d08] shadow-[0_0_30px_rgba(201,147,55,0.36)] hover:bg-[#ffd98a]"
                >
                  Start Game
                </Button>
                <Button
                  onClick={onShowLeaderboard}
                  variant="outline"
                  size="lg"
                  className="h-14 border-[#8e2f21]/80 bg-[#150d0d]/55 px-8 text-base font-semibold uppercase tracking-[0.18em] text-[#f4ead2] hover:border-[#c99337] hover:bg-[#8e2f21]/30 hover:text-[#ffd98a]"
                >
                  Leaderboard
                </Button>
                <Button
                  onClick={onShowHelp}
                  variant="outline"
                  size="lg"
                  className="h-14 border-[#c99337]/50 bg-[#150d0d]/45 px-8 text-base font-semibold uppercase tracking-[0.18em] text-[#ffd98a] hover:border-[#ffd98a] hover:bg-[#c99337]/15 hover:text-[#ffd98a]"
                >
                  How to Play
                </Button>
                <Button
                  onClick={onShowStory}
                  variant="outline"
                  size="lg"
                  className="h-14 border-[#c99337]/50 bg-[#150d0d]/45 px-8 text-base font-semibold uppercase tracking-[0.18em] text-[#ffd98a] hover:border-[#ffd98a] hover:bg-[#c99337]/15 hover:text-[#ffd98a]"
                >
                  The Story
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 text-[#c99337]/70">
                <Motif />
                <Motif />
                <Motif />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function RuneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path
        d="M24 4L34 18L24 44L14 18L24 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M24 14V36M17 23H31" stroke="currentColor" strokeWidth="2" />
      <path d="M24 20L29 25L24 30L19 25L24 20Z" fill="currentColor" />
    </svg>
  )
}

function Motif() {
  return (
    <div className="flex items-center justify-center gap-2 border-y border-[#c99337]/20 py-2">
      <span className="h-2 w-2 rotate-45 bg-[#c99337]" />
      <span className="h-px w-8 bg-[#8e2f21]" />
      <span className="h-2 w-2 rotate-45 border border-[#f4ead2]/70" />
    </div>
  )
}
