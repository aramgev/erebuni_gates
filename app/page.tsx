"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { GameCanvas, MainMenu, GameHUD, GameOver, HelpModal, StoryModal, LeaderboardScreen } from "@/components/game"
import { ExpeditionHUD, WaveReward } from "@/components/game/expedition-interface"
import { INITIAL_STATUS, EMPTY_RECORD, readRecord, saveRecord, type ExpeditionCommand, type UpgradeId, type Trial } from "@/lib/expedition"

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
  const [enemiesDefeated, setEnemiesDefeated] = useState(0)
  const [currentWave, setCurrentWave] = useState(1)
  const [muted, setMuted] = useState(false)
  const [expedition, setExpedition] = useState(INITIAL_STATUS)
  const [command, setCommand] = useState<ExpeditionCommand | null>(null)
  const [record, setRecord] = useState(EMPTY_RECORD)
  const [controlsActive, setControlsActive] = useState(true)
  const [victorious, setVictorious] = useState(false)
  const commandId = useRef(0)
  const recordedRun = useRef(false)
  useEffect(() => { setRecord(readRecord()) }, [])
  const recordRun = () => {
    if (recordedRun.current) return
    recordedRun.current = true
    setRecord(saveRecord(currentWave, enemiesDefeated, expedition.bestCombo))
  }
  const resumeBattle = () => {
    setControlsActive(true)
  }
  const advanceWave = useCallback((upgrade: UpgradeId, trial: Trial) => {
    setControlsActive(true)
    setCommand({ id: ++commandId.current, type: "advance", upgrade, trial })
  }, [])
  const [activeBlessing, setActiveBlessing] = useState<{
    name: string
    icon: string
  } | null>(null)
  const [interactionHint, setInteractionHint] = useState("")
  const [helpOpen, setHelpOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const [pendingPortalUrl, setPendingPortalUrl] = useState<string | null>(null)
  const [portalRedirectUrl, setPortalRedirectUrl] = useState<string | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const musicModeRef = useRef<"menu" | "game" | null>(null)
  const musicEndedRef = useRef(false)
  const didSubmitGameOverScoreRef = useRef(false)

  const playLoopingMusic = (src: string, volume: number, mode: "menu" | "game") => {
    if (musicModeRef.current === mode && musicRef.current && musicRef.current.src.includes(src)) {
      if (musicRef.current.paused) {
        void musicRef.current.play().catch((error) => {
          console.warn("Could not start background music", error)
        })
      }
      return
    }

    if (!musicRef.current) {
      const music = new Audio(src)
      music.loop = false
      music.volume = muted ? 0 : volume
      musicRef.current = music

      music.addEventListener("ended", () => {
        if (musicModeRef.current === "game" && musicRef.current?.src.includes("ErebuniDefense.mp3") && !musicRef.current.src.includes("ErebuniDefense2")) {
          playLoopingMusic("/ErebuniDefense2.mp3", 0.45, "game")
        } else if (musicModeRef.current === "game" && musicRef.current?.src.includes("ErebuniDefense2.mp3")) {
          playLoopingMusic("/ErebuniDefense.mp3", 0.45, "game")
        } else if (musicModeRef.current === "menu" && musicRef.current) {
          musicRef.current.currentTime = 0
          void musicRef.current.play().catch(() => {})
        }
      })
    } else {
      musicRef.current.pause()
      musicRef.current.currentTime = 0
      if (!musicRef.current.src.includes(src)) {
        musicRef.current.src = src
        musicRef.current.load()
      }
      musicRef.current.loop = false
      musicRef.current.volume = muted ? 0 : volume
    }

    musicRef.current.currentTime = 0
    void musicRef.current.play().catch((error) => {
      console.warn("Could not start background music", error)
    })

    musicModeRef.current = mode
  }

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = muted ? 0 : 0.45
    }
  }, [muted])

  const startMenuMusic = () => {
    playLoopingMusic("/ErebuniDefenseIntro.mp3", 0.45, "menu")
  }

  const startGameMusic = () => {
    playLoopingMusic("/ErebuniDefense.mp3", 0.45, "game")
  }

  const stopGameMusic = () => {
    if (!musicRef.current) return
    musicRef.current.pause()
    musicRef.current.currentTime = 0
    musicModeRef.current = null
  }

  const handleStartGame = () => {
    const normalizedUsername = playerUsername.trim().slice(0, 20) || "Anonymous Defender"
    if (!portalProfile.portal) {
      setPortalProfile((prev) => ({ ...prev, username: normalizedUsername }))
    }
    setHealth(100)
    setExpedition(INITIAL_STATUS)
    setCommand(null)
    setVictorious(false)
    setControlsActive(true)
    recordedRun.current = false
    setPendingPortalUrl(null)
    setPortalRedirectUrl(null)
    setEnemiesDefeated(0)
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
    if (musicModeRef.current === "game") startMenuMusic()
    setGameState("menu")
  }

  const handleQuitGame = () => {
    recordRun()
    if (document.pointerLockElement) document.exitPointerLock()
    handleReturnToMenu()
  }

  const handlePlayerHit = (damage: number) => {
    setHealth((prev) => Math.max(prev - damage, 0))
  }

  useEffect(() => {
    if (gameState === "playing" && health <= 0) {
      recordRun()
      stopGameMusic()
      setGameState("gameover")
    }
  }, [gameState, health])

  // Start menu music after the first user interaction (autoplay policies).
  useEffect(() => {
    if (portalProfile.portal) return
    if (gameState !== "menu" && gameState !== "leaderboard") return

    const tryStart = () => startMenuMusic()
    const onFirstInteraction = () => {
      tryStart()
      window.removeEventListener("pointerdown", onFirstInteraction)
      window.removeEventListener("keydown", onFirstInteraction)
    }

    // Attempt immediately (works if the browser allows it), but also
    // guarantee it will start on the first interaction.
    tryStart()
    window.addEventListener("pointerdown", onFirstInteraction, { once: true })
    window.addEventListener("keydown", onFirstInteraction, { once: true })

    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction)
      window.removeEventListener("keydown", onFirstInteraction)
    }
  }, [gameState, portalProfile.portal])

  useEffect(() => {
    if (gameState !== "gameover" || didSubmitGameOverScoreRef.current) return

    didSubmitGameOverScoreRef.current = true
    void submitScore({
      username: portalProfile.username,
      score: enemiesDefeated,
      wave: currentWave,
      gatesSurvived: currentWave - 1 + Number(expedition.cleared),
    }).catch((error) => console.warn("Score could not be submitted; personal record is saved on this device.", error))
  }, [currentWave, gameState, enemiesDefeated, portalProfile.username, submitScore])

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
      setEnemiesDefeated(0)
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
      if (event.key === "Escape") { setControlsActive(false); return }
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
          onHeal={(amount) => setHealth((value) => Math.min(100, value + amount))}
          onStatus={setExpedition}
          command={command}
          onControlChange={setControlsActive}
          onEnemyKilled={() => setEnemiesDefeated((s) => s + 1)}
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
          onPortalEnterRequest={(url) => {
            if (document.pointerLockElement) document.exitPointerLock()
            setPendingPortalUrl(url)
          }}
          portalRedirectUrl={portalRedirectUrl}
          isPaused={helpOpen || pendingPortalUrl !== null || expedition.selectionReady || (!controlsActive && !portalRedirectUrl)}
          muted={muted}
        />
      )}

      {/* Game HUD - Always visible during gameplay */}
      {gameState === "playing" && (
        <GameHUD
          health={health}
          maxHealth={100}
          gatesSurvived={currentWave - 1 + Number(expedition.cleared)}
          enemiesDefeated={enemiesDefeated}
          currentWave={currentWave}
          username={portalProfile.username}
          activeBlessing={activeBlessing}
          interactionHint={interactionHint}
          onShowHelp={handleOpenHelp}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onQuit={handleQuitGame}
        />
      )}

      {/* UI Overlays based on game state */}
      {gameState === "playing" && <ExpeditionHUD status={expedition} onCannon={() => setCommand({ id: ++commandId.current, type: "cannon" })} onWeaponChange={weapon => setCommand({ id: ++commandId.current, type: "weapon", weapon })} />}
      {gameState === "playing" && expedition.selectionReady && !helpOpen && !pendingPortalUrl && <WaveReward key={expedition.wave} status={expedition} health={health} onAdvance={advanceWave} onFinish={() => { recordRun(); setVictorious(true); stopGameMusic(); setGameState("gameover") }} />}
      {gameState === "playing" && !controlsActive && !expedition.selectionReady && !helpOpen && !pendingPortalUrl && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-5 backdrop-blur-[2px]">
        <div className="max-w-md rounded-xl border border-amber-200/25 bg-stone-950/90 p-8 text-center shadow-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Take a breath</p>
          <h2 className="mt-3 text-3xl font-bold text-amber-100">Game paused</h2>
          <p className="my-5 text-sm leading-7 text-stone-400">Click an enemy to shoot. Hold still for rapid fire, or drag with the left mouse button to look around. WASD moves along the wall.</p>
          <button onClick={resumeBattle} className="w-full rounded bg-amber-300 px-5 py-3 font-bold text-stone-950 hover:bg-amber-100">Resume game</button>
          <p className="mt-4 text-xs text-stone-500">Hits and kills load the fortress cannon. At 100%, press E to mount it, then aim and click to fire.</p>
        </div>
      </div>}
      {gameState === "menu" && !portalProfile.portal && (
        <MainMenu
          bestWave={record.wave}
          username={playerUsername}
          onUsernameChange={setPlayerUsername}
          onStartGame={handleStartGame}
          onShowLeaderboard={handleShowLeaderboard}
          onShowHelp={handleOpenHelp}
          onShowStory={() => setStoryOpen(true)}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
        />
      )}

      {gameState === "leaderboard" && !portalProfile.portal && (
        <LeaderboardScreen onBack={() => setGameState("menu")} />
      )}

      {gameState === "gameover" && (
        <GameOver
          victorious={victorious}
          bestWave={record.wave}
          bestCombo={expedition.bestCombo}
          accuracy={expedition.shots ? Math.round(100 * expedition.hits / expedition.shots) : 0}
          gatesSurvived={currentWave - 1 + Number(expedition.cleared)}
          enemiesDefeated={enemiesDefeated}
          currentWave={currentWave}
          onPlayAgain={handlePlayAgain}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <StoryModal open={storyOpen} onClose={() => setStoryOpen(false)} />

      {/* Portal confirmation dialog */}
      {pendingPortalUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-2xl border border-amber-900/40 bg-gradient-to-b from-stone-900 to-stone-950 p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-900/30">
                <span className="text-2xl">🌀</span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-amber-100">
                Enter the Portal?
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-stone-400">
                You are about to leave the Gates of Erebuni and travel to another game.
                Your progress here will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingPortalUrl(null)}
                  className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-5 py-2.5 text-sm font-semibold text-stone-300 transition-colors hover:bg-stone-700 hover:text-stone-100"
                >
                  Stay Here
                </button>
                <button
                  onClick={() => {
                    setPortalRedirectUrl(pendingPortalUrl)
                    setPendingPortalUrl(null)
                  }}
                  className="flex-1 rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 px-5 py-2.5 text-sm font-semibold text-amber-50 transition-colors hover:from-amber-600 hover:to-amber-500"
                >
                  Enter Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
