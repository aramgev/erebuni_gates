import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

const FALLBACK_USERNAME = "Anonymous Defender"
const mutation = mutationGeneric
const query = queryGeneric

export const submitScore = mutation({
  args: {
    username: v.string(),
    score: v.number(),
    wave: v.number(),
    gatesSurvived: v.number(),
  },
  handler: async (ctx, args) => {
    const username = args.username.trim().slice(0, 20) || FALLBACK_USERNAME
    const score = Math.max(0, args.score)
    const wave = Math.max(0, args.wave)
    const gatesSurvived = Math.max(0, args.gatesSurvived)

    await ctx.db.insert("scores", {
      username,
      score,
      wave,
      gatesSurvived,
      createdAt: Date.now(),
    })
  },
})

export const getTopScores = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("scores").collect()
    return rows.sort((a, b) => b.score - a.score).slice(0, 20)
  },
})
