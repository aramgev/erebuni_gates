import * as THREE from "three"

export function createCrossbow() {
  const crossbow = new THREE.Group()
  crossbow.name = "player-crossbow"
  crossbow.position.set(0, -0.22, -0.98)
  const weapon = new THREE.Group()
  weapon.name = "crossbow-weapon"
  crossbow.add(weapon)
  const wood = new THREE.MeshStandardMaterial({ color: 0x825032, roughness: 0.75 })
  const metal = new THREE.MeshStandardMaterial({ color: 0x555b65, metalness: 0.65, roughness: 0.35 })
  const gold = new THREE.MeshStandardMaterial({ color: 0xcda34f, metalness: 0.55, roughness: 0.4 })
  const add = (geometry: any, material: any, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(geometry, material)
    object.position.set(x, y, z)
    weapon.add(object)
    return object
  }
  // Camera forward is -Z: the stock, rail, bolt and limbs share that axis.
  add(new THREE.BoxGeometry(0.075, 0.075, 0.62), wood, 0, -0.015, 0.07)
  add(new THREE.BoxGeometry(0.035, 0.018, 0.55), metal, 0, 0.035, 0.025)
  add(new THREE.BoxGeometry(0.065, 0.13, 0.1), wood, 0, -0.09, 0.2)
  add(new THREE.BoxGeometry(0.095, 0.085, 0.05), gold, 0, -0.01, -0.17)
  for (const side of [-1, 1]) {
    const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0.015, -0.2), new THREE.Vector3(side * 0.1, 0.025, -0.25), new THREE.Vector3(side * 0.2, 0.035, -0.24), new THREE.Vector3(side * 0.26, 0.025, -0.12))
    add(new THREE.TubeGeometry(curve, 16, 0.017, 5, false), wood, 0, 0, 0)
    add(new THREE.SphereGeometry(0.021, 6, 6), gold, side * 0.26, 0.025, -0.12)
  }
  const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.26, 0.025, -0.12), new THREE.Vector3(0, 0.025, 0.085), new THREE.Vector3(0.26, 0.025, -0.12)]), new THREE.LineBasicMaterial({ color: 0xe9d5aa }))
  weapon.add(string)
  const bolt = new THREE.Group()
  bolt.name = "crossbow-bolt"
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.46, 5), wood)
  shaft.rotation.x = -Math.PI / 2
  shaft.position.set(0, 0.065, -0.09)
  bolt.add(shaft)
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.08, 5), metal)
  tip.rotation.x = -Math.PI / 2
  tip.position.set(0, 0.065, -0.36)
  bolt.add(tip)
  weapon.add(bolt)
  const magazine = new THREE.Group()
  magazine.name = "storm-repeater-magazine"
  magazine.visible = false
  const stormMetal = new THREE.MeshStandardMaterial({ color: 0x55c8da, emissive: 0x17647b, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.35 })
  for (const side of [-1, 1]) {
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.3), stormMetal)
    inlay.position.set(side * 0.065, 0.012, 0.03)
    magazine.add(inlay)
  }
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.12), metal)
  chamber.position.set(0, -0.035, -0.13)
  magazine.add(chamber)
  weapon.add(magazine)
  function setWeapon(mode: "crossbow" | "repeater") {
    magazine.visible = mode === "repeater"
    gold.color.set(mode === "repeater" ? 0x7cdbe6 : 0xcda34f)
  }

  const hands = new THREE.Group()
  hands.name = "defender-hands"
  crossbow.add(hands)
  const skin = new THREE.MeshStandardMaterial({ color: 0xc58e68, roughness: 0.9 })
  const leather = new THREE.MeshStandardMaterial({ color: 0x4b3328, roughness: 0.9 })
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x682d27, roughness: 1 })
  const bronze = new THREE.MeshStandardMaterial({ color: 0x9c784a, roughness: 0.6, metalness: 0.35 })
  const segment = (from: any, to: any, radius: number, material: any, parent: any, endRadius = radius) => {
    const direction = to.clone().sub(from)
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, endRadius, direction.length(), 8), material)
    mesh.position.copy(from).add(to).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    parent.add(mesh)
    return mesh
  }
  const palm = (parent: any, x: number, y: number, z: number, scale: [number, number, number]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), leather)
    mesh.position.set(x, y, z)
    mesh.scale.set(...scale)
    parent.add(mesh)
  }
  const left = new THREE.Group()
  left.name = "left-support-hand"
  hands.add(left)
  palm(left, -0.035, -0.053, -0.095, [0.062, 0.035, 0.05])
  for (let i = 0; i < 4; i++) {
    const z = -0.13 + i * 0.021
    segment(new THREE.Vector3(-0.064, -0.05, z), new THREE.Vector3(-0.058, 0.003, z), 0.009, skin, left)
    segment(new THREE.Vector3(-0.058, 0.003, z), new THREE.Vector3(-0.015, 0.013, z), 0.009, skin, left)
  }
  segment(new THREE.Vector3(0.008, -0.05, -0.12), new THREE.Vector3(0.047, -0.008, -0.07), 0.013, skin, left)
  const right = new THREE.Group()
  right.name = "right-trigger-hand"
  hands.add(right)
  palm(right, 0.037, -0.08, 0.195, [0.034, 0.055, 0.043])
  for (let i = 0; i < 3; i++) {
    const y = -0.065 - i * 0.025
    segment(new THREE.Vector3(0.045, y, 0.155), new THREE.Vector3(-0.024, y, 0.15), 0.01, skin, right)
  }
  segment(new THREE.Vector3(0.047, -0.035, 0.17), new THREE.Vector3(0.034, -0.04, 0.105), 0.01, skin, right)
  segment(new THREE.Vector3(0.058, -0.056, 0.22), new THREE.Vector3(0.006, -0.02, 0.22), 0.013, skin, right)
  for (const [wrist, elbow] of [
    [new THREE.Vector3(-0.062, -0.078, -0.065), new THREE.Vector3(-0.31, -0.34, 0.52)],
    [new THREE.Vector3(0.055, -0.126, 0.21), new THREE.Vector3(0.3, -0.38, 0.64)],
  ]) {
    const cuff = wrist.clone().lerp(elbow, 0.24)
    segment(wrist, cuff, 0.034, skin, hands, 0.045)
    segment(cuff, elbow, 0.048, sleeve, hands, 0.068)
    segment(wrist.clone().lerp(elbow, 0.22), wrist.clone().lerp(elbow, 0.34), 0.052, bronze, hands)
  }

  let walkPhase = 0, walking = 0
  const aimDirection = new THREE.Vector3(), targetRotation = new THREE.Quaternion(), roll = new THREE.Quaternion()
  const forward = new THREE.Vector3(0, 0, -1), up = new THREE.Vector3(0, 0, 1)
  function updatePose({ time, dt, speed, aimX, aimY, aspect, recoil }: { time: number; dt: number; speed: number; aimX: number; aimY: number; aspect: number; recoil: number }) {
    walking += ((speed > 0.05 ? 1 : 0) - walking) * (1 - Math.exp(-dt * 12))
    walkPhase += speed * dt * 1.9
    const sway = Math.sin(walkPhase) * walking
    const step = Math.cos(walkPhase * 2) * walking
    crossbow.position.set(sway * 0.008, -0.22 + step * 0.007 + Math.sin(time * 0.0018) * 0.0015 + recoil * 0.004, -0.98 + step * 0.004 + recoil * 0.022)
    const tangent = Math.tan(Math.PI / 6)
    aimDirection.set(aimX * aspect * tangent, aimY * tangent, -1).normalize()
    targetRotation.setFromUnitVectors(forward, aimDirection)
    roll.setFromAxisAngle(up, -sway * 0.008)
    targetRotation.multiply(roll)
    crossbow.quaternion.slerp(targetRotation, 1 - Math.exp(-dt * 18))
    bolt.visible = recoil <= 0
  }
  return { crossbow, bolt, updatePose, setWeapon }
}
