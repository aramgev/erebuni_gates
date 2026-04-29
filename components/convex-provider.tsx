"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useMemo } from "react"

export function AppConvexProvider({ children }: { children: React.ReactNode }) {
  const convex = useMemo(() => {
    return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  }, [])
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
