"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useMemo } from "react"

export function AppConvexProvider({ children }: { children: React.ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const convex = useMemo(() => {
    if (!convexUrl) return null
    return new ConvexReactClient(convexUrl)
  }, [convexUrl])

  // Avoid crashing prerender/build when NEXT_PUBLIC_CONVEX_URL isn't configured.
  // The app will still require this env var at runtime to use Convex features.
  if (!convex) {
    if (typeof window !== "undefined") {
      console.error(
        "Missing NEXT_PUBLIC_CONVEX_URL. Set it (e.g. in Vercel Project Settings → Environment Variables) to your deployed Convex URL.",
      )
    }
    return children
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
