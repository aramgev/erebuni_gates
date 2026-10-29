import * as THREE from "three"
import { batchScenery } from "./batch-scenery"

// The combat lane stays level. Relief rises around its edges and beyond the siege.
export function terrainHeight(x: number, z: number) {
  if (Math.abs(x) <= 46 && z >= -85) return 0
  const side = Math.max(0, Math.min(1, (Math.abs(x) - 46) / 45))
  const distance = Math.max(0, Math.min(1, (-z - 85) / 90))
  const hills = (side * side * 7 + distance * distance * 5) * (0.65 + Math.sin(x * 0.055 + z * 0.018) * 0.23 + Math.cos(z * 0.065) * 0.2)
  const river = z < -12 && z > -160 ? Math.exp(-Math.pow((x + 68) / 5, 2)) : 0
  return hills * (1 - river) - river * 0.2
}

export function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(400, 400, 80, 80)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const colors = []
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i) - 100
    position.setY(i, terrainHeight(x, z))
    const variation = 0.78 + Math.sin(x * 0.08) * Math.cos(z * 0.09) * 0.12 + Math.sin(x * 0.31 + z * 0.22) * 0.04
    colors.push(variation, variation * 0.98, variation * 0.84)
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function makeGrassGeometry() {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI / 3
    const x = Math.cos(angle) * 0.11, z = Math.sin(angle) * 0.11
    vertices.push(-x, 0, -z, x, 0, z, x * 0.7, 0.85 + i * 0.1, z * 0.7)
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function buildWorldScenery(scene: any, random: () => number) {
  const root = new THREE.Group()
  root.name = "volumetric-world-scenery"
  scene.add(root)
  const animatedCloth: { mesh: any; original: Float32Array }[] = []
  const water = new THREE.MeshStandardMaterial({ color: 0x528e9e, roughness: 0.24, metalness: 0.55, transparent: true, opacity: 0.8 })
  const paleStone = new THREE.MeshStandardMaterial({ color: 0xb29c79, roughness: 0.95, flatShading: true })
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x5f635b, roughness: 1, flatShading: true })
  const bark = new THREE.MeshStandardMaterial({ color: 0x5b4231, roughness: 1, flatShading: true })
  const leaf = new THREE.MeshStandardMaterial({ color: 0x68844b, roughness: 0.95, flatShading: true })
  const foliage = new THREE.IcosahedronGeometry(1, 0)

  const mesh = (geometry: any, material: any, x: number, y: number, z: number, parent = root) => {
    const object = new THREE.Mesh(geometry, material)
    object.position.set(x, y, z)
    object.castShadow = true
    object.receiveShadow = true
    parent.add(object)
    return object
  }

  // Radial meshes give both Ararat peaks lit ridges, depth and irregular snow lines.
  function mountain(x: number, z: number, radius: number, height: number, phase: number) {
    const positions: number[] = [], colors: number[] = [], indices: number[] = []
    const sides = 32, rings = 13
    const snow = new THREE.Color(0xe4e8e1), rock = new THREE.Color(0x667581), color = new THREE.Color()
    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings
      for (let side = 0; side <= sides; side++) {
        const angle = side / sides * Math.PI * 2
        const ridge = 1 + Math.sin(angle * 7 + phase) * 0.12 + Math.cos(angle * 11 - t * 2) * 0.05
        const r = radius * Math.pow(1 - t, 1.15) * ridge
        positions.push(Math.cos(angle) * r, height * t + Math.sin(angle * 5) * (1 - t) * 1.5, Math.sin(angle) * r * 0.72)
        const snowline = 0.64 + Math.sin(angle * 5 + phase) * 0.04 + Math.cos(angle * 9) * 0.025
        color.copy(t > snowline ? snow : rock)
        color.multiplyScalar(0.85 + Math.cos(angle + phase) * 0.13)
        colors.push(color.r, color.g, color.b)
        if (ring < rings && side < sides) {
          const a = ring * (sides + 1) + side, b = a + sides + 1
          indices.push(a, b, a + 1, a + 1, b, b + 1)
        }
      }
    }
    const indexed = new THREE.BufferGeometry()
    indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    indexed.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
    indexed.setIndex(indices)
    const geometry = indexed.toNonIndexed()
    indexed.dispose()
    geometry.computeVertexNormals()
    const object = mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, fog: false }), x, -1, z)
    object.name = "ararat-sculpted-peak"
    object.castShadow = false
    return object
  }
  mountain(44, -310, 100, 82, 0.4)
  mountain(-68, -280, 66, 52, 1.1)
  for (let i = 0; i < 8; i++) {
    const ridge = mesh(new THREE.ConeGeometry(26 + random() * 22, 15 + random() * 20, 7, 3), new THREE.MeshStandardMaterial({ color: 0x626f76, fog: false, roughness: 1, flatShading: true }), -185 + i * 53, 0, -250 - random() * 70)
    ridge.scale.z = 0.65
    ridge.castShadow = false
  }

  // Warm sun and translucent atmospheric halo behind the mountain range.
  const sun = new THREE.Group()
  sun.position.set(-140, 95, -360)
  mesh(new THREE.SphereGeometry(8, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffe6ae, fog: false }), 0, 0, 0, sun)
  for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(10 + i * 5, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffc27b, transparent: true, opacity: 0.035, depthWrite: false, fog: false, side: THREE.BackSide }), 0, 0, 0, sun)
  root.add(sun)

  // Worn hexagonal paving stones sit above the dirt, with gaps and broken edges.
  const paving = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.72, 0.78, 0.12, 6), paleStone, 420)
  paving.name = "ancient-paved-approach"
  const dummy = new THREE.Object3D(), shade = new THREE.Color()
  for (let i = 0; i < 420; i++) {
    const row = Math.floor(i / 7), column = i % 7
    const z = -6 - row * 1.85, bend = Math.sin(z * 0.045) * 1.1
    dummy.position.set((column - 3) * 1.35 + (row % 2) * 0.55 + bend, 0.04 + random() * 0.04, z)
    dummy.rotation.set((random() - 0.5) * 0.07, random() * 0.25, (random() - 0.5) * 0.07)
    const scale = random() > 0.1 ? 0.7 + random() * 0.3 : 0.01
    dummy.scale.setScalar(scale)
    dummy.updateMatrix()
    paving.setMatrixAt(i, dummy.matrix)
    shade.setHSL(0.1, 0.12, 0.45 + random() * 0.2)
    paving.setColorAt(i, shade)
  }
  paving.receiveShadow = true
  root.add(paving)

  // Layers of trees, branch forks and broad crowns replace solitary cone silhouettes.
  for (let i = 0; i < 32; i++) {
    const x = (i % 2 ? 1 : -1) * (35 + random() * 60), z = -22 - random() * 150
    const y = terrainHeight(x, z), h = 3.5 + random() * 4
    const tree = new THREE.Group()
    tree.position.set(x, y, z)
    mesh(new THREE.CylinderGeometry(0.13, 0.4, h, 6), bark, 0, h / 2, 0, tree)
    for (let j = 0; j < 4; j++) {
      const angle = j * Math.PI * 0.5 + random() * 0.5
      const branch = mesh(new THREE.CylinderGeometry(0.05, 0.15, 2.5, 5), bark, Math.cos(angle) * 0.6, h * 0.65, Math.sin(angle) * 0.6, tree)
      branch.rotation.z = Math.cos(angle) * 0.65
      branch.rotation.x = Math.sin(angle) * 0.65
      const crown = mesh(foliage, leaf, Math.cos(angle) * 1.4, h * 0.8 + random(), Math.sin(angle) * 1.4, tree)
      crown.scale.set(2.1, 1.5 + random(), 1.8)
    }
    tree.rotation.y = random() * Math.PI * 2
    root.add(tree)
  }

  // Ruined Urartian arches are built from individual voussoirs and stepped bases.
  function arch(x: number, z: number, scale: number, broken: boolean) {
    const group = new THREE.Group()
    group.name = "urartian-ruined-arch"
    group.position.set(x, terrainHeight(x, z), z)
    group.scale.setScalar(scale)
    group.rotation.y = x > 0 ? -0.15 : 0.25
    for (const side of [-1, 1]) {
      for (let step = 0; step < 3; step++) mesh(new THREE.BoxGeometry(3.2 - step * 0.45, 0.35, 3 - step * 0.3), paleStone, side * 3.1, step * 0.35, 0, group)
      for (let block = 0; block < (broken && side === 1 ? 3 : 5); block++) {
        const stone = mesh(new THREE.BoxGeometry(1.5, 0.9, 1.9), block % 2 ? paleStone : darkStone, side * 3.1, 1.2 + block * 0.93, 0, group)
        stone.rotation.y = (random() - 0.5) * 0.04
      }
    }
    for (let i = 0; i < (broken ? 6 : 11); i++) {
      const angle = i / 10 * Math.PI
      const wedge = mesh(new THREE.BoxGeometry(1, 1.4, 1.95), paleStone, Math.cos(angle) * 3.1, 5.2 + Math.sin(angle) * 3.1, 0, group)
      wedge.rotation.z = angle - Math.PI / 2
    }
    for (let i = 0; i < 6; i++) {
      const rubble = mesh(new THREE.DodecahedronGeometry(0.55 + random() * 0.35), paleStone, (random() - 0.5) * 10, 0.35, (random() - 0.5) * 5, group)
      rubble.scale.y = 0.6
      rubble.rotation.set(random(), random(), random())
    }
    root.add(group)
  }
  arch(-35, -56, 1.4, false)
  arch(39, -82, 1.8, true)
  arch(0, -142, 2.3, false)

  // A small reflecting watercourse occupies the side valley, away from attackers.
  const river = mesh(new THREE.PlaneGeometry(11, 135, 3, 20), water, -68, 0.1, -87)
  river.rotation.x = -Math.PI / 2
  river.rotation.z = -0.13
  river.castShadow = false

  for (const x of [-21, 21]) {
    for (let i = 0; i < 3; i++) {
      const z = -13 - i * 18
      mesh(new THREE.CylinderGeometry(0.055, 0.08, 6.5, 6), darkStone, x, 3.25, z)
      mesh(new THREE.SphereGeometry(0.13, 6, 6), paleStone, x, 6.6, z)
      const flag = mesh(new THREE.PlaneGeometry(1.8, 3, 5, 10), new THREE.MeshStandardMaterial({ color: 0x9d3225, side: THREE.DoubleSide, roughness: 1 }), x + 0.95, 4.8, z)
      flag.castShadow = false
      animatedCloth.push({ mesh: flag, original: new Float32Array(flag.geometry.attributes.position.array) })
      const sigil = mesh(new THREE.OctahedronGeometry(0.23), new THREE.MeshStandardMaterial({ color: 0xf0c66d, metalness: 0.6, roughness: 0.3 }), x + 0.95, 4.9, z + 0.12)
      sigil.scale.y = 2.5
    }
  }

  const regionColors = [0x68844b, 0x776042, 0x426f75, 0x535876]
  const flags = new Set(animatedCloth.map(flag => flag.mesh))
  batchScenery(root, object => {
    if (flags.has(object) || object.name === "ararat-sculpted-peak") return true
    for (let parent = object.parent; parent; parent = parent.parent) if (parent === sun) return true
    return false
  })
  let lastClothUpdate = -Infinity
  return {
    setRegion(region: number) {
      leaf.color.set(regionColors[region])
      water.color.set(region === 1 ? 0xb04e25 : region === 2 ? 0x56bdc5 : 0x528e9e)
      water.emissive.set(region === 1 ? 0x4c1607 : 0x000000)
      sun.visible = region < 2
      for (const flag of animatedCloth) flag.mesh.material.color.set([0x9d3225, 0x652620, 0x286d74, 0x4b3d7b][region])
    },
    update(time: number) {
      if (time - lastClothUpdate < 50) return
      lastClothUpdate = time
      for (const { mesh: flag, original } of animatedCloth) {
        const position = flag.geometry.attributes.position
        for (let i = 0; i < position.count; i++) {
          const x = original[i * 3], y = original[i * 3 + 1]
          position.setZ(i, Math.sin(time * 0.0025 + x * 2 + y) * 0.18 * (x + 0.9))
        }
        position.needsUpdate = true
        flag.geometry.computeVertexNormals()
      }
    },
  }
}
