"use client"

import { cn } from "@/lib/utils"

interface GameHUDProps {
  health: number
  maxHealth: number
  gatesSurvived: number
  enemiesDefeated: number
  currentWave: number
  username?: string
  activeBlessing: {
    name: string
    icon: string
  } | null
  interactionHint?: string
  onShowHelp?: () => void
  muted?: boolean
  onToggleMute?: () => void
  onQuit?: () => void
}

export function GameHUD({
  health,
  maxHealth,
  gatesSurvived,
  enemiesDefeated,
  currentWave,
  username,
  activeBlessing,
  interactionHint,
  onShowHelp,
  muted = false,
  onToggleMute,
  onQuit,
}: GameHUDProps) {
  const healthPercentage = (health / maxHealth) * 100

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4 md:p-6">
        {/* Health bar - Top left */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <HealthIcon className="w-5 h-5 text-destructive" />
            <span className="text-xs text-muted-foreground tracking-wider uppercase">
              Vitality
            </span>
          </div>
          <div className="relative w-40 md:w-56 h-3 bg-secondary/50 rounded-sm overflow-hidden border border-border">
            <div
              className={cn(
                "absolute inset-y-0 left-0 transition-all duration-500",
                healthPercentage > 60 && "bg-destructive",
                healthPercentage <= 60 && healthPercentage > 30 && "bg-accent",
                healthPercentage <= 30 && "bg-destructive animate-pulse"
              )}
              style={{ width: `${healthPercentage}%` }}
            />
            {/* Glow effect */}
            <div
              className="absolute inset-y-0 left-0 blur-sm opacity-50"
              style={{
                width: `${healthPercentage}%`,
                backgroundColor: healthPercentage > 30 ? "var(--destructive)" : "var(--destructive)",
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {health} / {maxHealth}
          </span>
          {username && (
            <span className="text-xs text-muted-foreground tracking-wide">
              {username}
            </span>
          )}
        </div>

        {/* Score - Top center */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Wave {currentWave}
          </span>
          <div className="relative">
            <span className="text-4xl md:text-5xl font-bold text-primary tabular-nums">
              {enemiesDefeated}
            </span>
            <div className="absolute inset-0 blur-lg bg-primary/20 -z-10" />
          </div>
          <span className="text-xs text-muted-foreground">
            {gatesSurvived} gates survived
          </span>
        </div>

        {/* Active blessing - Top right */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-sm border border-primary/40 bg-secondary/60 text-sm font-bold text-primary backdrop-blur-sm transition-colors hover:bg-primary/20"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round"/>
                  <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" strokeLinecap="round"/>
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={onShowHelp}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-sm border border-primary/40 bg-secondary/60 text-sm font-bold text-primary backdrop-blur-sm transition-colors hover:bg-primary/20"
              aria-label="Open help"
            >
              ?
            </button>
          </div>
          {activeBlessing ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border border-border rounded-sm">
              <span className="text-lg">{activeBlessing.icon}</span>
              <span className="text-sm text-foreground tracking-wide">
                {activeBlessing.name}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-secondary/30 border border-border/50 rounded-sm">
              <span className="text-sm text-muted-foreground">None</span>
            </div>
          )}
        </div>
      </div>

      {/* Crosshair - Center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Crosshair className="w-6 h-6 text-primary/70" />
      </div>

      {/* Interaction hint - Bottom center */}
      {interactionHint && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/70 border border-border rounded-sm backdrop-blur-sm">
            <kbd className="px-2 py-0.5 bg-primary/20 text-primary text-sm font-mono rounded border border-primary/30">
              E
            </kbd>
            <span className="text-sm text-foreground">{interactionHint}</span>
          </div>
        </div>
      )}

      {/* Decorative corner runes */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3">
        <CornerRune className="w-8 h-8 text-primary opacity-30" />
        {onQuit && (
          <button
            type="button"
            onClick={onQuit}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-primary/30 bg-secondary/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm transition-colors hover:bg-primary/15 hover:text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
            </svg>
            Quit
          </button>
        )}
      </div>
      <div className="absolute bottom-4 right-4 opacity-30 scale-x-[-1]">
        <CornerRune className="w-8 h-8 text-primary" />
      </div>
    </div>
  )
}

function HealthIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function Crosshair({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      {/* Simple rune-style crosshair */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6" strokeLinecap="round" />
    </svg>
  )
}

function CornerRune({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M4 28L4 4L28 4" strokeLinecap="round" />
      <path d="M8 24L8 8L24 8" strokeLinecap="round" opacity="0.5" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  )
}
