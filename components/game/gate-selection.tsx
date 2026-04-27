"use client"

import { cn } from "@/lib/utils"

export interface Gate {
  id: string
  name: string
  icon: string
  description: string
  difficulty?: "easy" | "medium" | "hard"
}

interface GateSelectionProps {
  gates: Gate[]
  onSelectGate: (gate: Gate) => void
}

export function GateSelection({ gates, onSelectGate }: GateSelectionProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-wider">
            Choose Your <span className="text-primary">Path</span>
          </h2>
          <p className="text-sm text-muted-foreground tracking-wide">
            Each gate holds a different trial
          </p>
        </div>

        {/* Gate cards */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {gates.map((gate, index) => (
            <GateCard
              key={gate.id}
              gate={gate}
              onSelect={() => onSelectGate(gate)}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground/60 tracking-wider">
          Click a gate to enter the trial
        </p>
      </div>
    </div>
  )
}

interface GateCardProps {
  gate: Gate
  onSelect: () => void
  delay?: number
}

function GateCard({ gate, onSelect, delay = 0 }: GateCardProps) {
  const difficultyColors = {
    easy: "text-blessing",
    medium: "text-accent",
    hard: "text-destructive",
  }

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative w-64 md:w-56 p-6 bg-card/50 border-2 border-border rounded-sm",
        "hover:border-primary hover:bg-card/80 transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "animate-in fade-in slide-in-from-bottom-4"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="absolute -inset-px bg-primary/20 blur-xl" />
      </div>

      {/* Card content */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Icon */}
        <div className="relative">
          <span className="text-4xl">{gate.icon}</span>
          <div className="absolute inset-0 blur-lg bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Gate name */}
        <h3 className="text-lg font-semibold text-foreground tracking-wide group-hover:text-primary transition-colors">
          {gate.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {gate.description}
        </p>

        {/* Difficulty indicator */}
        {gate.difficulty && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Difficulty:
            </span>
            <span
              className={cn(
                "text-xs uppercase tracking-wider font-medium",
                difficultyColors[gate.difficulty]
              )}
            >
              {gate.difficulty}
            </span>
          </div>
        )}
      </div>

      {/* Corner decorations */}
      <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-primary/30 group-hover:border-primary/60 transition-colors" />
      <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-primary/30 group-hover:border-primary/60 transition-colors" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-primary/30 group-hover:border-primary/60 transition-colors" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-primary/30 group-hover:border-primary/60 transition-colors" />
    </button>
  )
}
