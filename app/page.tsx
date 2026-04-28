"use client"

import { useEffect, useState } from "react"
import { GameCanvas, MainMenu, GameHUD, GameOver } from "@/components/game"

type GameState = "menu" | "playing" | "gameover"
type GateType = "fire" | "shadow" | "storm"

export default function GatesOfErebuni() {
  const [gameState, setGameState] = useState<GameState>("menu")
  const [health, setHealth] = useState(100)
  const [gatesSurvived, setGatesSurvived] = useState(0)
  const [activeBlessing, setActiveBlessing] = useState<{
    name: string
    icon: string
  } | null>(null)
  const [interactionHint, setInteractionHint] = useState("")

  const handleStartGame = () => {
    setHealth(100)
    setGatesSurvived(0)
    setActiveBlessing(null)
    setInteractionHint("")
    setGameState("playing")
  }

  const handleShowLeaderboard = () => {
    // Placeholder for leaderboard functionality
    console.log("Show leaderboard")
  }

  const handlePlayAgain = () => {
    handleStartGame()
  }

  const handleReturnToMenu = () => {
    setGameState("menu")
  }

  const handlePlayerHit = (damage: number) => {
    setHealth((prev) => Math.max(prev - damage, 0))
  }

  useEffect(() => {
    if (gameState === "playing" && health <= 0) setGameState("gameover")
  }, [gameState, health])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background">
      {gameState === "playing" && (
        <GameCanvas
          onPlayerHit={handlePlayerHit}
          onEnemyKilled={() => setGatesSurvived((s) => s + 1)}
          onGateSelected={(gate: GateType | null) => {
            setActiveBlessing(
              gate === null
                ? null
                : gate === "fire"
                ? { name: "Fire Trial: Faster, fewer", icon: "🔥" }
                : gate === "shadow"
                  ? { name: "Shadow Trial: More, weaker", icon: "🌑" }
                  : { name: "Storm Trial: Slower, wider", icon: "⚡" },
            )
          }}
          onInteractionHintChange={setInteractionHint}
        />
      )}

      {/* Game HUD - Always visible during gameplay */}
      {gameState === "playing" && (
        <GameHUD
          health={health}
          maxHealth={100}
          gatesSurvived={gatesSurvived}
          activeBlessing={activeBlessing}
          interactionHint={interactionHint}
        />
      )}

      {/* UI Overlays based on game state */}
      {gameState === "menu" && (
        <MainMenu
          onStartGame={handleStartGame}
          onShowLeaderboard={handleShowLeaderboard}
        />
      )}

      {gameState === "gameover" && (
        <GameOver
          gatesSurvived={gatesSurvived}
          onPlayAgain={handlePlayAgain}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </main>
  )
}
