"use client"

import { Button } from "@/components/ui/button"

interface GameOverProps {
  gatesSurvived: number
  onPlayAgain: () => void
  onReturnToMenu: () => void
}

export function GameOver({ gatesSurvived, onPlayAgain, onReturnToMenu }: GameOverProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      {/* Dark overlay with vignette effect */}
      <div className="absolute inset-0 bg-background/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Decorative rune */}
        <div className="relative">
          <FallenRuneSymbol className="w-20 h-20 text-destructive/60" />
          <div className="absolute inset-0 blur-2xl bg-destructive/10" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-wider">
            The Trial Has Ended
          </h2>
          <div className="w-32 h-px bg-border mx-auto" />
        </div>

        {/* Score display */}
        <div className="flex flex-col items-center gap-2 py-6">
          <span className="text-sm text-muted-foreground tracking-widest uppercase">
            You Survived
          </span>
          <div className="relative">
            <span className="text-6xl md:text-8xl font-bold text-primary tabular-nums">
              {gatesSurvived}
            </span>
            <div className="absolute inset-0 blur-2xl bg-primary/20 -z-10" />
          </div>
          <span className="text-lg text-muted-foreground tracking-wider">
            {gatesSurvived === 1 ? "Gate" : "Gates"}
          </span>
        </div>

        {/* Achievement message based on score */}
        <p className="text-sm text-muted-foreground max-w-sm">
          {gatesSurvived === 0 && "The first step is always the hardest. Try again, warrior."}
          {gatesSurvived > 0 && gatesSurvived < 5 && "A promising start. The gods of Urartu are watching."}
          {gatesSurvived >= 5 && gatesSurvived < 10 && "Impressive! Khaldi himself would be proud."}
          {gatesSurvived >= 10 && "Legendary! You have proven yourself worthy of Erebuni."}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full max-w-sm">
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="flex-1 bg-primary/10 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 tracking-widest uppercase"
          >
            Play Again
          </Button>
          <Button
            onClick={onReturnToMenu}
            variant="outline"
            size="lg"
            className="flex-1 border-2 border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all duration-300 tracking-widest uppercase"
          >
            Main Menu
          </Button>
        </div>

        {/* Bottom text */}
        <p className="text-xs text-muted-foreground/40 tracking-[0.2em] uppercase mt-8">
          May the blessings of Khaldi guide you
        </p>
      </div>
    </div>
  )
}

function FallenRuneSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      {/* Broken/fallen rune symbol */}
      <path d="M32 8L32 28" strokeLinecap="round" />
      <path d="M32 36L32 56" strokeLinecap="round" />
      <path d="M20 20L32 8L44 20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 32L28 32" strokeLinecap="round" />
      <path d="M36 32L48 32" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}
