"use client"

import { Button } from "@/components/ui/button"

interface StoryModalProps {
  open: boolean
  onClose: () => void
}

const storySections = [
  {
    title: "1 - The Last Watch of Erebuni",
    body: `Year 702 BC.

The kingdom of Urartu stands strong beneath the shadow of the mountains. At its heart rises the fortress of Erebuni Fortress — a bastion of stone, painted in red and white, watching over the fertile plains.

From its walls, kings once ruled. Armies marched under its banners. Priests called upon the gods.

Now… the fortress stands quiet.

The wind moves through the grass below. The distant peaks remain unmoved, eternal. And yet, something is wrong.

From beyond the horizon, shadows gather.`,
  },
  {
    title: "2 - The Warrior",
    body: `You are not a king.
You are not a general.

You are the one who remains.

A warrior of Urartu. A defender of the wall.

There is no army behind you. No reinforcements will come. The gates are sealed. The torches burn low.

And still — you stand.

The god Khaldi watches over those who do not yield. It is said he grants strength to those who choose their trials wisely.

You feel it in your hands — in the bow you carry.

Each decision will shape the battle. Each trial will change what comes next.

You are not meant to survive forever.

Only long enough.`,
  },
  {
    title: "3 - The Siege",
    body: `They do not come as men.

From the plains emerge forms of dust, stone, and shadow — things forgotten, things buried, things that should never have risen.

They do not speak.
They do not fear.
They only advance.

Wave after wave, they climb toward the walls of Erebuni.

You strike them down. Again. And again.

Between battles, the gates appear.

Three paths. Three trials. Three choices.

Power comes at a cost.
Strength demands sacrifice.

And every choice makes the next wave harder… or worse.`,
  },
  {
    title: "4 - The Oath",
    body: `Behind you lies everything.

The land. The people. The memory of what once was.

Before you — only the endless advance.

The wall is your line.

If it falls, nothing remains.

So you stand.

You aim.

You choose.

You endure.

Defend Erebuni. Hold the wall. Survive the night.`,
  },
]

export function StoryModal({ open, onClose }: StoryModalProps) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex animate-in items-center justify-center bg-[#050507]/80 px-4 py-6 text-[#f4ead2] backdrop-blur-sm duration-300 fade-in">
      <div className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto border border-[#c99337]/45 bg-[#0d0b0b]/95 p-5 shadow-[0_0_50px_rgba(201,147,55,0.2)] md:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#c99337] to-transparent" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="font-serif">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#d25b3d]">
              Gates of Erebuni
            </p>
            <h2 className="mt-1 text-3xl font-bold text-[#ffd98a] md:text-4xl">
              The Story
            </h2>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            size="icon"
            className="border-[#c99337]/50 bg-[#160f0d] text-[#ffd98a] hover:bg-[#8e2f21]/40 hover:text-[#ffd98a]"
            aria-label="Close story"
          >
            ×
          </Button>
        </div>

        <div className="space-y-8 font-serif text-sm leading-7 text-[#eadfc7] md:text-base">
          {storySections.map((section) => (
            <section key={section.title} className="border-l border-[#c99337]/35 pl-4">
              <h3 className="mb-3 text-lg font-bold text-[#ffd98a] md:text-xl">
                {section.title}
              </h3>
              <div className="whitespace-pre-line leading-8 md:leading-9">
                {section.body}
              </div>
            </section>
          ))}
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
