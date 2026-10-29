import * as THREE from "three"

// Static scenery sharing a material can be drawn in one call, with all transforms
// baked into its vertices. Animated, instanced and independently hidden objects stay separate.
export function batchScenery(root: any, keep: (object: any) => boolean) {
  root.updateWorldMatrix(true, true)
  const groups = new Map<string, any[]>()
  root.traverse((object: any) => {
    if (!object.isMesh || object.isInstancedMesh || Array.isArray(object.material) || keep(object)) return
    const attributes = Object.keys(object.geometry.attributes).sort().join(",")
    const key = `${object.material.uuid}:${attributes}:${object.castShadow}:${object.receiveShadow}`
    const group = groups.get(key) ?? []
    group.push(object)
    groups.set(key, group)
  })
  const obsolete = new Set<any>()
  for (const objects of groups.values()) {
    if (objects.length < 2) continue
    const parts = objects.map(object => {
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
      geometry.applyMatrix4(object.matrixWorld)
      return geometry
    })
    const merged = new THREE.BufferGeometry()
    for (const name of Object.keys(parts[0].attributes)) {
      const first = parts[0].getAttribute(name)
      const length = parts.reduce((sum, part) => sum + part.getAttribute(name).array.length, 0)
      const values = new Float32Array(length)
      let offset = 0
      for (const part of parts) { const array = part.getAttribute(name).array; values.set(array, offset); offset += array.length }
      merged.setAttribute(name, new THREE.Float32BufferAttribute(values, first.itemSize, first.normalized))
    }
    const combined = new THREE.Mesh(merged, objects[0].material)
    combined.name = "batched-static-scenery"
    combined.castShadow = objects[0].castShadow
    combined.receiveShadow = objects[0].receiveShadow
    root.add(combined)
    for (const object of objects) { object.removeFromParent(); obsolete.add(object.geometry) }
    for (const part of parts) part.dispose()
  }
  for (const geometry of obsolete) geometry.dispose()
}
