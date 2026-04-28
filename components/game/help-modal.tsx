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
            Fortress. Enemies march from the plains. Hold the wall as long as
            you can.
          </HelpSection>

          <HelpSection title="Controls">
            <ul className="space-y-2">
              <HelpItem label="WASD" text="Move along the fortress wall" />
              <HelpItem label="Mouse" text="Look around" />
              <HelpItem label="Left Click" text="Shoot arrow" />
              <HelpItem label="E" text="Choose a Gate Trial when gates appear" />
              <HelpItem label="Esc" text="Release mouse / pause" />
              <HelpItem label="?" text="Open help" />
            </ul>
          </HelpSection>

          <HelpSection title="Gate Trials">
            <p className="mb-3">
              After each wave, three gates appear. Choose one to shape the next
              battle.
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

          <HelpSection title="Goal">
            Survive as many waves as possible. Each gate choice changes the next
            wave.
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
