"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { REGIONS, UPGRADES, regionForWave, upgradeChoices, type ExpeditionStatus, type Trial, type UpgradeId, type WeaponMode } from "@/lib/expedition"

export function ExpeditionHUD({ status, onCannon, onWeaponChange }: { status: ExpeditionStatus; onCannon: () => void; onWeaponChange: (weapon: WeaponMode) => void }) {
  const region = regionForWave(status.wave)
  const chapter = Math.min(4, Math.ceil(status.wave / 3))
  const [showChapter, setShowChapter] = useState(true)
  useEffect(() => {
    setShowChapter(true)
    const timer = setTimeout(() => setShowChapter(false), 4000)
    return () => clearTimeout(timer)
  }, [chapter])
  const progress = status.total ? ((status.total - status.remaining) / status.total) * 100 : 0
  const nextStreakReward = status.combo < 5 ? 5 - status.combo : 10 - status.combo % 10
  return <>
    {status.hurt && <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_140px_35px_rgba(210,35,30,0.5)]" />}
    {showChapter && <div aria-label="Chapter introduction" className="pointer-events-none absolute left-4 top-36 z-10 max-w-[52vw] rounded-lg bg-black/45 p-3 backdrop-blur-sm md:left-6 md:top-40">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/55">{status.wave > 12 ? "Endless siege" : `Chapter ${Math.min(4, Math.ceil(status.wave / 3))} / 4`}</p>
      <h2 className="mt-1 text-base font-semibold md:text-xl" style={{ color: region.color }}>{region.name}</h2>
      <p className="mt-1 text-xs text-white/65">{status.remaining} enemies remaining · {status.relics} blessings</p>
      <p className="mt-1 text-[10px] text-white/50">{status.damage.toFixed(1)} damage · {status.hits}/{status.shots} hits</p>
      <div className="mt-3 h-1 w-44 max-w-full overflow-hidden rounded bg-white/15"><div className="h-full transition-[width] duration-300" style={{ width: `${progress}%`, backgroundColor: region.color }} /></div>
      <div className="mt-3 flex gap-1.5" aria-label={`Campaign wave ${status.wave} of 12`}>
        {Array.from({ length: 12 }, (_, i) => <span key={i} className={`h-1.5 w-2.5 rounded-sm ${i + 1 < status.wave || status.cleared && i + 1 === status.wave ? "bg-amber-300" : i + 1 === status.wave ? "animate-pulse bg-white" : "bg-white/15"}`} />)}
      </div>
    </div>}
    {!showChapter && <p className="pointer-events-none absolute left-1/2 top-28 z-10 -translate-x-1/2 rounded bg-black/45 px-2 py-1 text-[10px] text-white/80">{status.remaining} enemies remaining</p>}
    <div className={`pointer-events-none absolute left-4 z-10 rounded bg-black/45 px-2 py-1 ${status.arsenalUnlocked ? "bottom-40" : "bottom-24"}`}>
      <p className={`text-lg font-bold ${status.combo > 0 ? "text-amber-200" : "text-white/55"}`}>{status.combo}× streak</p>
      <p className="text-[10px] text-white/55">{nextStreakReward} {nextStreakReward === 1 ? "hit" : "hits"} to {status.combo < 5 ? "cannon bonus" : "healing + cannon bonus"}</p>
      {status.overdriveSeconds > 0 && <p className="mt-1 text-xs font-bold text-cyan-200">Overdrive · {status.overdriveSeconds}s</p>}
    </div>
    {status.reward && !status.cleared && <div role="status" aria-live="polite" className="pointer-events-none absolute left-1/2 top-40 z-20 w-[min(86vw,420px)] -translate-x-1/2 rounded-lg border border-amber-300/40 bg-stone-950/90 px-4 py-3 text-center shadow-lg">
      <p className="text-sm font-bold text-amber-200">{status.reward.title}</p>
      <p className="mt-1 text-xs text-stone-300">{status.reward.description}</p>
    </div>}
    {status.bossHealth > 0 && <div className="pointer-events-none absolute right-4 top-36 z-10 w-[40vw] rounded-lg bg-black/60 p-3 text-center md:left-1/2 md:right-auto md:top-28 md:w-[380px] md:-translate-x-1/2">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">{region.boss}</p>
      <div className="h-2 overflow-hidden rounded bg-black/70 ring-1 ring-orange-300/30"><div className="h-full bg-gradient-to-r from-red-600 to-orange-300 transition-[width]" style={{ width: `${100 * status.bossHealth / status.bossMaxHealth}%` }} /></div>
      <p className="mt-2 hidden text-[10px] text-white/65 md:block">{region.tactic}</p>
    </div>}
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
      {status.arsenalUnlocked && !status.cannonMounted && <div className="flex rounded border border-cyan-200/30 bg-stone-950/85 p-1" aria-label="Weapon selection">
        {([{ id: "crossbow", name: "Heavy crossbow", key: "1" }, { id: "repeater", name: "Storm repeater", key: "2" }] as const).map(item => <button key={item.id} onClick={() => onWeaponChange(item.id)} aria-pressed={status.weapon === item.id} className={`rounded px-3 py-2 text-[10px] transition ${status.weapon === item.id ? "bg-cyan-300/20 text-cyan-100" : "text-stone-400 hover:text-white"}`}>
          <span className="mr-1 opacity-50">{item.key}</span>{item.name}
        </button>)}
      </div>}
      <button onClick={onCannon} disabled={status.cleared || !status.cannonMounted && status.charge < 100} className="w-64 rounded border border-amber-200/40 bg-stone-950/90 px-4 py-2.5 text-xs text-amber-100 backdrop-blur transition enabled:hover:bg-amber-900/60 disabled:text-stone-400" aria-label={status.cannonMounted ? "Leave fortress cannon" : `Mount fortress cannon, ${status.charge}% loaded`}>
        <span className="mr-2">◉</span>{status.cannonMounted ? "E · Leave cannon" : status.charge >= 100 ? "E · Mount fortress cannon" : `Fortress cannon · ${status.charge}% loaded`}
        <div className="mt-1.5 h-1 overflow-hidden rounded bg-white/10"><div className={`h-full bg-amber-300 transition-[width] ${status.charge >= 100 ? "animate-pulse" : ""}`} style={{ width: `${status.charge}%` }} /></div>
      </button>
      <p className="text-center text-[10px] text-amber-100/65">{status.cannonMounted ? "Aim and click · One shot · Blast hits nearby enemies" : "Arrow hits & kills load the cannon. Mount at 100%."}</p>
      <p className="hidden whitespace-nowrap text-[10px] uppercase tracking-[0.08em] text-white/55 md:block">Click · Shoot &nbsp; / &nbsp; Left-drag · Look &nbsp; / &nbsp; WASD · Move</p>
    </div>
    {status.cannonMounted && <p className="pointer-events-none absolute left-1/2 top-1/2 z-10 mt-8 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-3 py-1 text-xs text-orange-100">{status.charge >= 100 ? "Cannon ready · Click a cluster of enemies" : "Cannon fired · Returning to your crossbow"}</p>}
    {status.cleared && !status.selectionReady && <div aria-live="polite" role="status" className="wave-victory pointer-events-none absolute inset-x-0 top-[22%] z-20 text-center">
      <div className="wave-victory-line mx-auto h-px w-48 bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
      <p className="mt-4 text-xs uppercase tracking-[0.35em] text-amber-200">Erebuni stands</p>
      <h2 className="mt-2 text-3xl font-bold text-amber-100 drop-shadow-lg md:text-5xl">Wave {status.wave} secured</h2>
      <p className="mt-3 text-xs text-stone-200">{status.wave % 3 === 0 ? "Guardian defeated. The gates await." : "The last attacker has fallen. The gates await."}</p>
    </div>}
  </>
}

const GATE_TRIALS = [
  { id: "fire", name: "Gate of Fire", color: "#f3945c", symbol: "✦", description: "Fewer attackers. Faster and deadlier.", landscape: "The burning road" },
  { id: "shadow", name: "Gate of Shadow", color: "#b4a0e6", symbol: "◐", description: "A larger horde with weaker bodies.", landscape: "The veiled passage" },
  { id: "storm", name: "Gate of Storm", color: "#87d7e1", symbol: "ϟ", description: "Slower attackers across a wider front.", landscape: "The thunder path" },
] as const

export function WaveReward({ status, health, onAdvance, onFinish }: { status: ExpeditionStatus; health: number; onAdvance: (upgrade: UpgradeId, trial: Trial) => void; onFinish: () => void }) {
  const [selected, setSelected] = useState<UpgradeId | null>(null)
  const [entering, setEntering] = useState<Trial | null>(null)
  useEffect(() => {
    if (!entering || !selected) return
    const timer = setTimeout(() => onAdvance(selected, entering), 1100)
    return () => clearTimeout(timer)
  }, [entering, selected, onAdvance])
  const next = regionForWave(status.wave + 1)
  const victory = status.wave === 12
  const chosenGate = GATE_TRIALS.find(gate => gate.id === entering)
  return <div className={"gate-hall absolute inset-0 z-30 overflow-y-auto px-4 py-6 text-stone-100 " + (entering ? "gate-hall-entering" : "")} role="dialog" aria-modal="true" aria-labelledby="reward-title">
    <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center py-4">
      <div className="mb-5 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400">{victory ? "The twelve trials are complete" : "The gates of Erebuni"}</p>
        <h2 id="reward-title" className="mt-2 text-3xl font-bold text-amber-100 md:text-4xl">{victory ? "Erebuni stands." : "Choose your next gate"}</h2>
        <p className="mt-2 text-xs text-stone-300">Wave {status.wave} secured · Vitality {Math.ceil(health)} / 100 · {status.relics} blessings</p>
        {status.wave % 3 === 0 && <p className="mt-2 text-xs text-amber-200">Guardian bounty: +15 vitality · +40 cannon loading progress</p>}
        {status.wave === 9 && <p className="mx-auto mt-3 max-w-lg text-xs leading-5 text-cyan-100">Beyond these gates: the Storm repeater, heavy crossbow and a fully loaded cannon. Switch weapons with 1 / 2.</p>}
      </div>
      <p className="mb-2 text-center text-[10px] uppercase tracking-[0.18em] text-amber-200/60">1 · Claim a blessing for this run</p>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {upgradeChoices(status.wave).map(id => <button key={id} disabled={!!entering} onClick={() => setSelected(id)} aria-pressed={selected === id} className={"rounded-lg border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-amber-300 md:p-4 " + (selected === id ? "border-amber-300 bg-amber-400/10 ring-1 ring-amber-300" : "border-white/15 bg-stone-950/70 hover:border-amber-200/60")}>
          <span className="text-xl text-amber-300">{UPGRADES[id].icon}</span>
          <h3 className="mb-1 mt-2 text-xs font-bold text-amber-100 md:text-sm">{UPGRADES[id].name}</h3>
          <p className="text-[10px] leading-4 text-stone-400 md:text-xs md:leading-5">{UPGRADES[id].description}</p>
          <p className="mt-2 text-[9px] uppercase tracking-wider text-amber-400">{selected === id ? "Blessing claimed ✓" : "Select blessing"}</p>
        </button>)}
      </div>
      <div className="mt-5 text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/60">2 · {selected ? "Enter a gate to shape the next wave" : "Choose a blessing to open the gates"}</p>
        <p className="mt-1 text-xs" style={{ color: next.color }}>Wave {status.wave + 1} · {next.name}</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 md:gap-6">
        {GATE_TRIALS.map(gate => <button key={gate.id} disabled={!selected || !!entering} onClick={() => setEntering(gate.id)} aria-label={"Enter " + gate.name} className={"trial-gate group relative rounded-t-full px-1 pb-3 text-center transition focus-visible:outline-2 focus-visible:outline-amber-200 md:px-3 " + (selected ? "gate-unlocked " : "gate-locked ") + (entering === gate.id ? "gate-chosen" : "")} style={{ "--gate-color": gate.color } as CSSProperties}>
          <span aria-hidden="true" className="gate-art">
            <span className="gate-foundation" />
            <span className="gate-stone-arch">
              <span className="gate-opening">
                <span className="gate-corridor" />
                <span className="gate-door gate-door-left"><span className="gate-door-stud" /></span>
                <span className="gate-door gate-door-right"><span className="gate-door-stud" /></span>
                <span className="gate-sigil">{gate.symbol}</span>
              </span>
            </span>
            <span className="gate-torch gate-torch-left" /><span className="gate-torch gate-torch-right" />
            <span className="gate-path" />
          </span>
          <span className="relative block text-[10px] font-bold md:text-base" style={{ color: gate.color }}>{gate.name}</span>
          <span className="mx-auto mt-1 block max-w-52 text-[9px] leading-4 text-stone-300 md:text-xs md:leading-5">{gate.description}</span>
          <span className="mt-2 block text-[9px] uppercase tracking-wider text-amber-100/60">{entering === gate.id ? "Entering…" : selected ? "Enter gate →" : "Awaiting blessing"}</span>
        </button>)}
      </div>
      {victory && <button disabled={!!entering} onClick={onFinish} className="mx-auto mt-4 rounded border border-amber-300 bg-amber-300 px-6 py-3 text-sm font-bold text-stone-950 hover:bg-amber-100">Celebrate victory & view results</button>}
    </div>
    {entering && <div className="gate-travel pointer-events-none fixed inset-0 z-40 flex items-center justify-center" style={{ "--gate-color": chosenGate?.color } as CSSProperties} role="status" aria-live="polite"><div className="gate-travel-label text-center"><p className="text-xs uppercase tracking-[0.3em] text-amber-100">Entering {chosenGate?.name}</p><p className="mt-3 text-lg text-white">{next.name}</p></div></div>}
  </div>
}

export function CampaignPreview({ bestWave }: { bestWave: number }) {
  return <div className="space-y-3 border-y border-amber-300/15 py-4">
    <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-amber-200/60"><span>The twelve trials</span><span>4 regions · 4 guardians</span></div>
    <div className="grid grid-cols-4 gap-2">{REGIONS.map((region, i) => <div key={region.name} className="space-y-2 border-l-2 pl-2" style={{ borderColor: region.color }}><p className="text-[10px]" style={{ color: region.color }}>{String(i + 1).padStart(2, "0")}</p><p className="text-[10px] leading-4 text-stone-300">{region.name.replace("The ", "")}</p></div>)}</div>
    <p className="text-xs text-stone-400">Choose your blessings. Build your bow. Conquer the siege.{bestWave > 0 && <span className="ml-2 text-amber-200">Personal best: wave {bestWave}</span>}</p>
  </div>
}

