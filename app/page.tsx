"use client"

import { useEffect, useRef, useState } from "react"
import { GameCanvas, MainMenu, GameHUD, GameOver, HelpModal, StoryModal } from "@/components/game"

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
  const [helpOpen, setHelpOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const musicRef = useRef<HTMLAudioElement | null>(null)

  const startGameMusic = () => {
    if (!musicRef.current) {
      const music = new Audio("/ErebuniDefense.mp3")
      music.loop = true
      music.volume = 0.45
      musicRef.current = music
    }

    musicRef.current.currentTime = 0
    void musicRef.current.play().catch((error) => {
      console.warn("Could not start background music", error)
    })
  }

  const stopGameMusic = () => {
    if (!musicRef.current) return
    musicRef.current.pause()
    musicRef.current.currentTime = 0
  }

  const handleStartGame = () => {
    setHealth(100)
    setGatesSurvived(0)
    setActiveBlessing(null)
    setInteractionHint("")
    setHelpOpen(false)
    setStoryOpen(false)
    startGameMusic()
    setGameState("playing")
  }

  const handleShowLeaderboard = () => {
    // Placeholder for leaderboard functionality
    console.log("Show leaderboard")
  }

  const handleOpenHelp = () => {
    if (document.pointerLockElement) document.exitPointerLock()
    setHelpOpen(true)
  }

  const handlePlayAgain = () => {
    handleStartGame()
  }

  const handleReturnToMenu = () => {
    setHelpOpen(false)
    setStoryOpen(false)
    stopGameMusic()
    setGameState("menu")
  }

  const handlePlayerHit = (damage: number) => {
    setHealth((prev) => Math.max(prev - damage, 0))
  }

  useEffect(() => {
    if (gameState === "playing" && health <= 0) {
      stopGameMusic()
      setGameState("gameover")
    }
  }, [gameState, health])

  useEffect(() => {
    return () => stopGameMusic()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?") return
      event.preventDefault()
      handleOpenHelp()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

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
          isPaused={helpOpen}
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
          onShowHelp={handleOpenHelp}
        />
      )}

      {/* UI Overlays based on game state */}
      {gameState === "menu" && (
        <MainMenu
          onStartGame={handleStartGame}
          onShowLeaderboard={handleShowLeaderboard}
          onShowHelp={handleOpenHelp}
          onShowStory={() => setStoryOpen(true)}
        />
      )}

      {gameState === "gameover" && (
        <GameOver
          gatesSurvived={gatesSurvived}
          onPlayAgain={handlePlayAgain}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <StoryModal open={storyOpen} onClose={() => setStoryOpen(false)} />
    </main>
  )
}
