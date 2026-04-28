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
    <div className="absolute inset-0 z-50 animate-in fade-in duration-300 bg-[#050507]/95 text-[#f4ead2]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,147,55,0.16),transparent_38%)]" />
      <Button
        type="button"
        onClick={onClose}
        variant="outline"
        size="icon"
        className="absolute right-5 top-5 z-20 border-[#c99337]/60 bg-[#120d0c]/80 text-[#ffd98a] hover:bg-[#8e2f21]/40 hover:text-[#ffd98a]"
        aria-label="Close story"
      >
        ×
      </Button>

      <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col px-5 py-8 md:px-10">
        <header className="border-b border-[#c99337]/30 pb-5 text-center font-serif">
          <p className="text-xs uppercase tracking-[0.35em] text-[#d25b3d]">
            Gates of Erebuni
          </p>
          <h2 className="mt-2 text-4xl font-bold text-[#ffd98a] md:text-5xl">
            The Story
          </h2>
        </header>

        <div className="mt-6 flex-1 overflow-y-auto pr-2 font-serif">
          <div className="space-y-10 pb-10">
            {storySections.map((section) => (
              <section
                key={section.title}
                className="border-l border-[#c99337]/35 pl-5"
              >
                <h3 className="mb-4 text-2xl font-bold text-[#ffd98a]">
                  {section.title}
                </h3>
                <div className="whitespace-pre-line text-lg leading-9 text-[#eadfc7]">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
