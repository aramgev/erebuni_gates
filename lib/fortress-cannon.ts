import * as THREE from "three"

export function createFortressCannon() {
  const cannon = new THREE.Group()
  cannon.name = "fortress-cannon"
  const bronze = new THREE.MeshStandardMaterial({ color: 0x927048, metalness: 0.75, roughness: 0.4 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x252a2d, metalness: 0.8, roughness: 0.35 })
  const wood = new THREE.MeshStandardMaterial({ color: 0x483024, roughness: 0.9 })
  const glow = new THREE.MeshBasicMaterial({ color: 0x927048 })
  const add = (geometry: any, material: any, parent: any, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  add(new THREE.BoxGeometry(1.9, 0.35, 2.5), wood, cannon, 0, 0.45, 0)
  for (const side of [-1, 1]) {
    const wheel = add(new THREE.CylinderGeometry(0.68, 0.68, 0.23, 16), wood, cannon, side * 0.98, 0.68, 0.45)
    wheel.rotation.z = Math.PI / 2
    const rim = add(new THREE.TorusGeometry(0.59, 0.09, 6, 16), bronze, cannon, side * 1.11, 0.68, 0.45)
    rim.rotation.y = Math.PI / 2
    add(new THREE.BoxGeometry(0.25, 1, 0.7), bronze, cannon, side * 0.57, 0.9, -0.15)
  }
  const barrel = new THREE.Group()
  barrel.name = "cannon-aiming-barrel"
  barrel.position.set(0, 1.35, -0.1)
  cannon.add(barrel)
  const tube = add(new THREE.CylinderGeometry(0.32, 0.46, 2.8, 18, 1, true), dark, barrel, 0, 0, -0.7)
  tube.rotation.x = Math.PI / 2
  add(new THREE.SphereGeometry(0.43, 12, 8), bronze, barrel, 0, 0, 0.65)
  for (const z of [-2.1, -1.4, -0.1]) {
    add(new THREE.TorusGeometry(z < -2 ? 0.33 : 0.4, 0.07, 6, 18), bronze, barrel, 0, 0, z)
  }
  // Recessed dark bore makes the muzzle read as a hollow barrel.
  add(new THREE.CircleGeometry(0.27, 18), new THREE.MeshBasicMaterial({ color: 0x080809, side: THREE.DoubleSide }), barrel, 0, 0, -1.97)
  const sight = add(new THREE.BoxGeometry(0.08, 0.15, 0.12), glow, barrel, 0, 0.4, -1.65)
  sight.name = "cannon-ready-sight"
  const muzzle = new THREE.Object3D()
  muzzle.name = "cannon-muzzle"
  muzzle.position.set(0, 0, -2.25)
  barrel.add(muzzle)
  return {
    cannon, muzzle,
    update(target: any, ready: boolean, recoil: number) {
      cannon.updateMatrixWorld(true)
      barrel.lookAt(target)
      barrel.rotateY(Math.PI)
      barrel.position.z = -0.1 + recoil * 0.3
      glow.color.set(ready ? 0xffda78 : 0x665846)
    },
  }
}
