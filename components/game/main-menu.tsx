"use client"

import { Button } from "@/components/ui/button"

interface MainMenuProps {
  onStartGame: () => void
  onShowLeaderboard: () => void
}

export function MainMenu({ onStartGame, onShowLeaderboard }: MainMenuProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      {/* Dark overlay with stone texture feel */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      
      {/* Decorative rune border elements */}
      <div className="absolute top-8 left-8 w-24 h-24 border-l-2 border-t-2 border-primary/30" />
      <div className="absolute top-8 right-8 w-24 h-24 border-r-2 border-t-2 border-primary/30" />
      <div className="absolute bottom-8 left-8 w-24 h-24 border-l-2 border-b-2 border-primary/30" />
      <div className="absolute bottom-8 right-8 w-24 h-24 border-r-2 border-b-2 border-primary/30" />
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        {/* Decorative rune symbol */}
        <div className="relative">
          <RuneSymbol className="w-16 h-16 text-primary animate-pulse" />
          <div className="absolute inset-0 blur-xl bg-primary/20" />
        </div>
        
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-5xl md:text-7xl font-bold tracking-wider text-foreground drop-shadow-lg">
            <span className="text-primary">GATES</span> OF{" "}
            <span className="text-primary">EREBUNI</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground tracking-widest uppercase">
            Face the Trials of Khaldi
          </p>
        </div>
        
        {/* Menu buttons */}
        <div className="flex flex-col gap-4 mt-8 w-full max-w-xs">
          <Button
            onClick={onStartGame}
            size="lg"
            className="relative overflow-hidden bg-primary/10 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg tracking-widest uppercase py-6 group"
          >
            <span className="relative z-10">Start Game</span>
            <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Button>
          
          <Button
            onClick={onShowLeaderboard}
            variant="outline"
            size="lg"
            className="border-2 border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all duration-300 text-base tracking-widest uppercase py-5"
          >
            Leaderboard
          </Button>
        </div>
        
        {/* Bottom decorative text */}
        <p className="text-xs text-muted-foreground/50 tracking-[0.3em] uppercase mt-12">
          Ancient Urartu • 9th Century BC
        </p>
      </div>
    </div>
  )
}

function RuneSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      {/* Stylized cuneiform-inspired symbol */}
      <path d="M32 4L32 60" strokeLinecap="round" />
      <path d="M32 4L16 20" strokeLinecap="round" />
      <path d="M32 4L48 20" strokeLinecap="round" />
      <path d="M20 32L44 32" strokeLinecap="round" />
      <path d="M24 44L40 44" strokeLinecap="round" />
      <circle cx="32" cy="32" r="6" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="12" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}
