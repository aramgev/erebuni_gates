"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { GameCanvas, MainMenu, GameHUD, GameOver, HelpModal, StoryModal, LeaderboardScreen } from "@/components/game"

type GameState = "menu" | "playing" | "gameover" | "leaderboard"
type GateType = "fire" | "shadow" | "storm"

type PortalProfile = {
  portal: boolean
  username: string
  color?: string
  speed?: string
  ref?: string
}

const clampHp = (hp: number) => Math.max(1, Math.min(100, hp))

const readPortalProfile = (): { profile: PortalProfile; hp?: number } => {
  if (typeof window === "undefined") {
    return { profile: { portal: false, username: "Portal Defender" } }
  }
  const qs = new URLSearchParams(window.location.search)
  const portal = qs.get("portal") === "true" || qs.get("portal") === "1"
  const username = (qs.get("username") || "").trim() || "Portal Defender"
  const color = (qs.get("color") || "").trim() || undefined
  const speed = (qs.get("speed") || "").trim() || undefined
  const ref = (qs.get("ref") || "").trim() || undefined
  const hpStr = (qs.get("hp") || "").trim()
  const hpNum = hpStr ? Number(hpStr) : undefined
  const hp = Number.isFinite(hpNum as number) ? clampHp(hpNum as number) : undefined
  return { profile: { portal, username, color, speed, ref }, hp }
}

export default function GatesOfErebuni() {
  const initialPortal = readPortalProfile()
  const submitScore = useMutation(api.scores.submitScore)
  const [portalProfile, setPortalProfile] = useState<PortalProfile>(initialPortal.profile)
  const [playerUsername, setPlayerUsername] = useState(initialPortal.profile.portal ? initialPortal.profile.username : "")
  const [gameState, setGameState] = useState<GameState>(initialPortal.profile.portal ? "playing" : "menu")
  const [health, setHealth] = useState(initialPortal.hp ?? 100)
  const [gatesSurvived, setGatesSurvived] = useState(0)
  const [currentWave, setCurrentWave] = useState(1)
  const [activeBlessing, setActiveBlessing] = useState<{
    name: string
    icon: string
  } | null>(null)
  const [interactionHint, setInteractionHint] = useState("")
  const [helpOpen, setHelpOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const didSubmitGameOverScoreRef = useRef(false)

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
    const normalizedUsername = playerUsername.trim().slice(0, 20) || "Anonymous Defender"
    if (!portalProfile.portal) {
      setPortalProfile((prev) => ({ ...prev, username: normalizedUsername }))
    }
    setHealth(100)
    setGatesSurvived(0)
    setCurrentWave(1)
    setActiveBlessing(null)
    setInteractionHint("")
    setHelpOpen(false)
    setStoryOpen(false)
    didSubmitGameOverScoreRef.current = false
    startGameMusic()
    setGameState("playing")
  }

  const handleShowLeaderboard = () => {
    setGameState("leaderboard")
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
    if (gameState !== "gameover" || didSubmitGameOverScoreRef.current) return

    didSubmitGameOverScoreRef.current = true
    void submitScore({
      username: portalProfile.username,
      score: gatesSurvived,
      wave: currentWave,
      gatesSurvived,
    })
  }, [currentWave, gameState, gatesSurvived, portalProfile.username, submitScore])

  useEffect(() => {
    return () => stopGameMusic()
  }, [])

  // Detect portal params and auto-start instantly (no menu flash).
  useEffect(() => {
    const { profile, hp } = readPortalProfile()
    setPortalProfile(profile)
    if (profile.portal) {
      setPlayerUsername(profile.username)
      setHealth(hp ?? 100)
      setGatesSurvived(0)
      setCurrentWave(1)
      setActiveBlessing(null)
      setInteractionHint("")
      setHelpOpen(false)
      setStoryOpen(false)
      startGameMusic()
      setGameState("playing")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          onWaveChange={setCurrentWave}
          portalProfile={portalProfile}
          getCurrentHp={() => health}
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
          username={portalProfile.username}
          activeBlessing={activeBlessing}
          interactionHint={interactionHint}
          onShowHelp={handleOpenHelp}
        />
      )}

      {/* UI Overlays based on game state */}
      {gameState === "menu" && !portalProfile.portal && (
        <MainMenu
          username={playerUsername}
          onUsernameChange={setPlayerUsername}
          onStartGame={handleStartGame}
          onShowLeaderboard={handleShowLeaderboard}
          onShowHelp={handleOpenHelp}
          onShowStory={() => setStoryOpen(true)}
        />
      )}

      {gameState === "leaderboard" && !portalProfile.portal && (
        <LeaderboardScreen onBack={() => setGameState("menu")} />
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
