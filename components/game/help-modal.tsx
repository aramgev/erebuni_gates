"use client"

import type React from "react"

import { Button } from "@/components/ui/button"

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050507]/80 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto border border-[#c99337]/45 bg-[#0d0b0b]/95 p-5 text-[#f4ead2] shadow-[0_0_50px_rgba(201,147,55,0.2)] md:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#c99337] to-transparent" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#d25b3d]">
              Gates of Erebuni
            </p>
            <h2 className="mt-1 text-3xl font-bold text-[#ffd98a] md:text-4xl">
              How to Play
            </h2>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            size="icon"
            className="border-[#c99337]/50 bg-[#160f0d] text-[#ffd98a] hover:bg-[#8e2f21]/40 hover:text-[#ffd98a]"
            aria-label="Close help"
          >
            ×
          </Button>
        </div>

        <div className="space-y-6 text-sm leading-7 text-[#eadfc7] md:text-base">
          <HelpSection title="Mission">
            You are a warrior of ancient Urartu defending the walls of Erebuni
            Fortress across four regions and twelve waves. Defeat each region's
            guardian, then face an endless siege if you choose to continue.
          </HelpSection>

          <HelpSection title="Controls">
            <ul className="space-y-2">
              <HelpItem label="WASD" text="Move along the fortress wall" />
              <HelpItem label="Mouse" text="Move the crosshair directly over enemies to aim" />
              <HelpItem label="Left-drag" text="Hold the left mouse button and drag to turn. Dragging does not shoot." />
              <HelpItem label="Click / Hold" text="Click to shoot; hold the mouse still to keep firing arrows" />
              <HelpItem label="E / Cannon" text="At 100% loading progress, mount the fortress cannon. Press E again to leave." />
              <HelpItem label="1 / 2" text="From wave 10: switch heavy crossbow / Storm repeater" />
              <HelpItem label="Esc" text="Pause the game; click Resume game to continue" />
              <HelpItem label="?" text="Open help" />
            </ul>
          </HelpSection>

          <HelpSection title="Gate Trials">
            <p className="mb-3">
              After the final kill, watch the wave-secured celebration. Then claim
              one blessing and enter a stone doorway in the gate hall. The doors
              open as you enter, and your gate determines the next wave. Blessings
              stack and last until the run ends.
            </p>
            <ul className="space-y-2">
              <HelpItem
                label="Fire Trial"
                text="Fewer enemies, but they are faster and more dangerous."
              />
              <HelpItem
                label="Storm Trial"
                text="Slower enemies, but they spread wider across the battlefield."
              />
              <HelpItem
                label="Shadow Trial"
                text="More enemies, but each enemy is weaker."
              />
            </ul>
          </HelpSection>

          <HelpSection title="Fortress cannon — how it works">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Arrow hits and kills fill the cannon loading meter at the bottom of the screen. Streak bonuses and Siege engineering load it faster.</li>
              <li>At 100%, press E or click Mount fortress cannon. You take position behind the cannon on the fortress wall.</li>
              <li>Point at a group of enemies and click. A visible cannonball travels to your target and explodes, damaging enemies within 14 metres. It does not hit the whole battlefield.</li>
              <li>One shot uses the full load. You return to your crossbow after the recoil. Land more arrows to load another shot. Press E to leave without firing and keep the load.</li>
            </ol>
            <p className="mt-3">The cannon is available from the first waves whenever the meter is full. Space no longer triggers an attack.</p>
          </HelpSection>
          <HelpSection title="Combat & blessings">
            Every consecutive arrow hit builds your
            streak; missing or taking breach damage resets it to zero. Golems are tough, spirits are fast and weave across the field,
            and guardians appear every third wave. Choose damage, faster fire,
            stronger cannon shots, armor, loading speed, or healing between battles.
            On touchscreens, drag the left side to move, drag the right side to aim,
            and tap the right side to shoot. Tap Mount fortress cannon when it is
            ready, then tap the right side to fire at the crosshair. Weapons also have on-screen buttons.
          </HelpSection>
          <HelpSection title="Streak rewards & Storm arsenal">
            <ul className="space-y-2">
              <HelpItem label="Every 5 hits" text="Bonus 20 cannon loading progress." />
              <HelpItem label="Every 10 hits" text="Restore 10 vitality and gain 50 cannon loading progress in total." />
              <HelpItem label="Every 20 hits" text="Also trigger 8 seconds of Overdrive: shoot faster and deal 25% more damage." />
              <HelpItem label="Guardians" text="Defeating a guardian restores 15 vitality and adds 40 cannon loading progress." />
              <HelpItem label="Wave 10" text="Unlock the Storm repeater (67% faster fire) and heavy crossbow (+50% damage). Fully load the cannon, then gain 25 loading progress each later wave." />
            </ul>
            <p className="mt-3">Cannon shots preserve your arrow streak but do not add hits to it. Earned Overdrive survives a miss. Its timer pauses during the wave celebration and gate selection.</p>
          </HelpSection>
          <HelpSection title="Your legend">
            Your best wave, kills, and streak are saved on this device when a run
            ends. Complete wave 12 to claim victory or continue into endless play.
          </HelpSection>
        </div>

        <div className="mt-7 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="border border-[#ffd98a]/50 bg-[#c99337] px-7 font-bold uppercase tracking-[0.18em] text-[#140d08] hover:bg-[#ffd98a]"
          >
            Return
          </Button>
        </div>
      </div>
    </div>
  )
}

function HelpSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-l border-[#c99337]/35 pl-4">
      <h3 className="mb-2 text-lg font-bold text-[#ffd98a]">{title}</h3>
      <div>{children}</div>
    </section>
  )
}

function HelpItem({ label, text }: { label: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="min-w-24 font-semibold text-[#d25b3d]">{label}</span>
      <span>{text}</span>
    </li>
  )
}
