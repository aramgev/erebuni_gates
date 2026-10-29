export type Trial = "fire" | "shadow" | "storm"
export type UpgradeId = "power" | "haste" | "nova" | "repair" | "ward" | "focus"
export type WeaponMode = "crossbow" | "repeater"

export function combatStats(damage: number, interval: number, weapon: WeaponMode, unlocked: boolean, overdrive: boolean) {
  return {
    damage: damage * (unlocked && weapon === "crossbow" ? 1.5 : 1) * (overdrive ? 1.25 : 1),
    interval: Math.max(45, interval * (unlocked && weapon === "repeater" ? 0.6 : 1) * (overdrive ? 0.6 : 1)),
  }
}

export function streakReward(hits: number) {
  return {
    charge: hits > 0 && hits % 5 === 0 ? 20 : 0,
    heal: hits > 0 && hits % 10 === 0 ? 10 : 0,
    overdrive: hits > 0 && hits % 20 === 0,
  }
}

export const REGIONS = [
  { name: "The Ararat Plains", subtitle: "Hold the outer walls", color: "#e8b86b", fog: 0x877661, sky: 0x8a6652, ground: 0x68733d, boss: "The Basalt Warden", tactic: "Blue armor resists arrows. Strike when it glows gold.", detail: "Ancient watchtowers guard the golden plains." },
  { name: "The Ember Necropolis", subtitle: "Awaken the buried kings", color: "#fb9361", fog: 0x63342e, sky: 0x742a22, ground: 0x4f382d, boss: "The Ash Sovereign", tactic: "Summons spirits. Aim the fortress cannon at clustered reinforcements.", detail: "Burning obelisks rise above a field of ash." },
  { name: "The Crystal Sanctum", subtitle: "Break the spirits' siege", color: "#87e5de", fog: 0x264c59, sky: 0x143847, ground: 0x304e4c, boss: "The Hollow Oracle", tactic: "A swift, weaving spirit that calls spectral reinforcements.", detail: "Luminous crystals pierce the ancient sanctuary." },
  { name: "The Storm Citadel", subtitle: "Survive Khaldi's final trial", color: "#beb0ff", fog: 0x202039, sky: 0x14142b, ground: 0x343548, boss: "The Tempest King", tactic: "Surges toward the walls and summons spirits. Keep firing.", detail: "Lightning crowns the last fortress of Urartu." },
] as const

export const UPGRADES: Record<UpgradeId, { name: string; icon: string; description: string }> = {
  power: { name: "Sunforged arrows", icon: "✦", description: "+35% base arrow damage. Stacks each time." },
  haste: { name: "Windstring", icon: "↠", description: "Shoot 12% faster. Hold fire to keep shooting." },
  nova: { name: "Siege engineering", icon: "◉", description: "+3 cannon blast damage and fully load the cannon." },
  repair: { name: "Sacred restoration", icon: "✚", description: "Restore 35 vitality before the next trial." },
  ward: { name: "Basalt aegis", icon: "⬡", description: "Take 12% less breach damage. Stacks each time." },
  focus: { name: "Siege crew", icon: "◎", description: "Gain 40% more cannon loading progress from every arrow hit." },
}

export function regionForWave(wave: number) {
  return REGIONS[Math.min(3, Math.floor((Math.max(1, wave) - 1) / 3))]
}

export function upgradeChoices(wave: number): UpgradeId[] {
  const pool: UpgradeId[] = ["power", "haste", "nova", "ward", "focus"]
  return [pool[(wave - 1) % pool.length], pool[(wave + 1) % pool.length], "repair"]
}

export function wavePlan(wave: number, trial: Trial | null) {
  const count = Math.min(28, 4 + Math.floor((wave - 1) * 1.4))
  return {
    count: trial === "shadow" ? count + (wave <= 3 ? 2 : 3) : trial === "fire" ? Math.max(3, count - 2) : count,
    speed: Math.min(4.2, 1.3 + wave * 0.15) * (trial === "fire" ? 1.2 : trial === "storm" ? 0.78 : 1),
    spawnDistance: wave <= 3 ? 56 : 60,
    graceSeconds: wave <= 2 ? 3 : 1.5,
    health: (1 + Math.floor((wave - 1) / 3) * 0.65) * (trial === "shadow" ? 0.7 : 1),
    damage: (4 + wave * 0.65) * (trial === "fire" ? 1.3 : 1),
    bossHealth: wave % 3 === 0 ? 12 + wave * 2 : 0,
  }
}

export function waveFormation(wave: number, trial: Trial | null, aspect: number) {
  const plan = wavePlan(wave, trial)
  // Keep the whole opening formation inside even a portrait viewport.
  const viewHalfWidth = plan.spawnDistance * Math.tan(Math.PI / 6) * aspect * 0.72
  const halfWidth = Math.min(wave <= 3 ? 14 : 22, viewHalfWidth) + (trial === "storm" ? Math.min(4, viewHalfWidth * 0.15) : 0)
  return Array.from({ length: plan.count }, (_, i) => ({
    x: (-1 + 2 * i / Math.max(1, plan.count - 1)) * halfWidth,
    z: -plan.spawnDistance - (i % 3) * 5 - Math.floor(i / 3) * 5,
  }))
}

export type ExpeditionStatus = {
  wave: number
  cleared: boolean
  selectionReady: boolean
  remaining: number
  total: number
  charge: number
  combo: number
  bestCombo: number
  shots: number
  hits: number
  bossHealth: number
  bossMaxHealth: number
  hit: boolean
  hurt: boolean
  damage: number
  relics: number
  weapon: WeaponMode
  arsenalUnlocked: boolean
  cannonMounted: boolean
  overdriveSeconds: number
  reward: { id: number; title: string; description: string } | null
}

export const INITIAL_STATUS: ExpeditionStatus = { wave: 1, cleared: false, selectionReady: false, remaining: 4, total: 4, charge: 40, combo: 0, bestCombo: 0, shots: 0, hits: 0, bossHealth: 0, bossMaxHealth: 0, hit: false, hurt: false, damage: 2, relics: 0, weapon: "crossbow", arsenalUnlocked: false, cannonMounted: false, overdriveSeconds: 0, reward: null }

export type ExpeditionCommand = { id: number; type: "advance"; upgrade: UpgradeId; trial: Trial } | { id: number; type: "cannon" } | { id: number; type: "weapon"; weapon: WeaponMode }

export type PersonalRecord = { runs: number; wave: number; kills: number; combo: number }
export const EMPTY_RECORD: PersonalRecord = { runs: 0, wave: 0, kills: 0, combo: 0 }

export function readRecord(): PersonalRecord {
  try {
    const value = JSON.parse(localStorage.getItem("erebuni-record-v1") || "null")
    if (!value || ![value.runs, value.wave, value.kills, value.combo].every((n) => Number.isSafeInteger(n) && n >= 0)) return EMPTY_RECORD
    return value
  } catch { return EMPTY_RECORD }
}

export function saveRecord(wave: number, kills: number, combo: number): PersonalRecord {
  const old = readRecord()
  const record = { runs: old.runs + 1, wave: Math.max(old.wave, wave), kills: Math.max(old.kills, kills), combo: Math.max(old.combo, combo) }
  try { localStorage.setItem("erebuni-record-v1", JSON.stringify(record)) } catch { /* Storage can be disabled. */ }
  return record
}
