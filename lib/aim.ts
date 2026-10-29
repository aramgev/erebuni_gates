export function pointerAim(x: number, y: number, width: number, height: number) {
  return { x: Math.max(-1, Math.min(1, x / width * 2 - 1)), y: Math.max(-1, Math.min(1, 1 - y / height * 2)) }
}

// Small near-misses still count, but scenery in front of an enemy blocks the shot.
export function assistedEnemy(ray: any, enemies: any[], blockerDistance: number) {
  let best: any = null, bestError = Infinity
  for (const enemy of enemies) {
    const offset = enemy.mesh.position.clone().sub(ray.origin)
    const distance = offset.dot(ray.direction)
    if (distance <= 0 || distance > blockerDistance + 0.2) continue
    const radius = enemy.mesh.scale.x * 0.4 + Math.min(1, distance * 0.012)
    const error = ray.distanceSqToPoint(enemy.mesh.position) / (radius * radius)
    if (error <= 1 && error < bestError) { best = enemy; bestError = error }
  }
  return best
}
