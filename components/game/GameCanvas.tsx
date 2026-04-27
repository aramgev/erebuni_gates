"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type Enemy = {
  mesh: any
  speed: number
  radius: number
  lastDamageAtMs: number
  baseY: number
  floatPhase: number
  breached: boolean
}

type GateType = "fire" | "shadow" | "storm"
type Gate = {
  type: GateType
  mesh: any
  radius: number
  glow?: any
}

export function GameCanvas({
  onPlayerHit,
  onEnemyKilled,
  onGateSelected,
}: {
  onPlayerHit?: (damage: number) => void
  onEnemyKilled?: () => void
  onGateSelected?: (gate: GateType) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const scene = new THREE.Scene()
    const fogColor = new THREE.Color(0x0b1430) // dark blue fog
    scene.fog = new THREE.Fog(fogColor.getHex(), 10, 80)

    // "Gradient-style" sky via a lightweight skydome (no shaders)
    scene.background = new THREE.Color(0x050914)
    const skyGeo = new THREE.SphereGeometry(500, 20, 14)
    const skyPos = skyGeo.attributes.position
    const skyColors: number[] = []
    const skyTop = new THREE.Color(0x050914)
    const skyHorizon = new THREE.Color(0x142a5a)
    const skyTmp = new THREE.Color()
    for (let i = 0; i < skyPos.count; i++) {
      const y = skyPos.getY(i)
      const t = (y + 500) / 1000
      skyTmp.copy(skyHorizon).lerp(skyTop, Math.min(1, Math.max(0, t)))
      skyColors.push(skyTmp.r, skyTmp.g, skyTmp.b)
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3))
    const skyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: true,
      fog: false,
      depthWrite: false,
    })
    const skyDome = new THREE.Mesh(skyGeo, skyMat)
    skyDome.name = "sky-dome"
    scene.add(skyDome)

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    )
    camera.rotation.order = "YXZ"
    camera.position.set(0, 10.1, 1)
    camera.lookAt(0, 0, -20)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.shadowMap.enabled = false
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55)
    scene.add(ambientLight)

    // Soft directional light from above
    const directionalLight = new THREE.DirectionalLight(0xcad8ff, 0.9)
    directionalLight.position.set(0, 30, 10)
    scene.add(directionalLight)

    const hemi = new THREE.HemisphereLight(0x86b6ff, 0x1b140f, 0.4)
    scene.add(hemi)

    // Fortress defense environment (simple layout-focused geometry)
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x6b6a63,
      roughness: 1,
      metalness: 0,
    })
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: 0x2e2d2a,
      roughness: 1,
      metalness: 0,
    })
    const redMat = new THREE.MeshStandardMaterial({
      color: 0x7a1f1a,
      roughness: 0.9,
      metalness: 0,
    })

    // Ground plane below (outside battlefield)
    const outsideGround = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x6e7f92,
        roughness: 1,
        metalness: 0,
      }),
    )
    outsideGround.name = "outside-ground"
    outsideGround.rotation.x = -Math.PI / 2
    outsideGround.position.set(0, 0, -100)
    scene.add(outsideGround)

    // Elevated fortress wall platform
    const platformHeight = 8
    const platformWidth = 40
    const platformDepth = 10
    const platformZ = 5 // front edge sits at z=0
    const platformTopY = platformHeight + 0.5 // thickness=1
    const eyeHeightAbovePlatform = 1.6
    const playerHeightY = platformTopY + eyeHeightAbovePlatform

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth, 1, platformDepth),
      darkStoneMat,
    )
    platform.name = "wall-platform"
    // thickness=1, so y=6 means the wall's center is at y=6 (top at 6.5)
    platform.position.set(0, platformHeight, platformZ)
    scene.add(platform)

    // Front battlement parapet (waist-height so player can see over it)
    const defenseLineHeight = 0.8
    const defenseLineThickness = 1
    const defenseLine = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth, defenseLineHeight, defenseLineThickness),
      darkStoneMat,
    )
    defenseLine.name = "defense-line"
    defenseLine.position.set(
      0,
      platformTopY + defenseLineHeight / 2,
      0 + defenseLineThickness / 2,
    )
    scene.add(defenseLine)

    const towerGeo = new THREE.CylinderGeometry(2.8, 3.4, 12, 14, 1, false)
    const towerTopGeo = new THREE.CylinderGeometry(3.6, 3.6, 1.2, 14)

    const makeTower = (name: string, x: number, z: number) => {
      const tower = new THREE.Mesh(towerGeo, darkStoneMat)
      tower.name = name
      tower.position.set(x, platformHeight + 6, z)
      scene.add(tower)

      const top = new THREE.Mesh(towerTopGeo, redMat)
      top.name = `${name}-cap`
      top.position.set(x, platformHeight + 12.6, z)
      scene.add(top)
    }

    makeTower("tower-left", -platformWidth / 2 + 2, platformZ - platformDepth / 2 + 1)
    makeTower("tower-right", platformWidth / 2 - 2, platformZ - platformDepth / 2 + 1)
    makeTower("tower-center", 0, platformZ + platformDepth / 2 - 1)

    const textureLoader = new THREE.TextureLoader()

    // Gates (textured planes + additive glow)
    const gateTexturePaths: Record<GateType, string> = {
      fire: "/assets/gates/gate1.png",
      shadow: "/assets/gates/gate2.png",
      storm: "/assets/gates/gate3.png",
    }
    const gateTextures: Record<GateType, any> = {
      fire: textureLoader.load(gateTexturePaths.fire),
      shadow: textureLoader.load(gateTexturePaths.shadow),
      storm: textureLoader.load(gateTexturePaths.storm),
    }

    const gatePlaneGeo = new THREE.PlaneGeometry(3.2, 4.2)
    const gateGlowGeo = new THREE.PlaneGeometry(3.9, 5.1)

    const gates: Gate[] = []
    const spawnGate = (type: GateType, x: number, z: number) => {
      const group = new THREE.Group()
      group.name = `gate-${type}`
      group.position.set(x, 0, z)

      const baseMat = new THREE.MeshBasicMaterial({
        map: gateTextures[type],
        transparent: true,
        depthWrite: false,
      })
      const base = new THREE.Mesh(gatePlaneGeo, baseMat)
      base.name = `gate-plane-${type}`
      base.position.set(0, platformHeight + 2.2, 0)
      group.add(base)

      const glowMat = new THREE.MeshBasicMaterial({
        color: type === "fire" ? 0xff5b3b : type === "shadow" ? 0x7a6cff : 0x56c7ff,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const glow = new THREE.Mesh(gateGlowGeo, glowMat)
      glow.name = `gate-glow-${type}`
      glow.position.set(0, platformHeight + 2.2, -0.02)
      group.add(glow)

      scene.add(group)
      gates.push({ type, mesh: group, glow, radius: 3.0 })
    }

    // Spawn 3 gates on the wall/platform
    spawnGate("fire", -8, platformZ)
    spawnGate("shadow", 0, platformZ)
    spawnGate("storm", 8, platformZ)

    // Enemies (sprites; always face camera automatically)
    const enemyTexturePaths = [
      "/assets/enemies/enemy1.png",
      "/assets/enemies/enemy2.png",
      "/assets/enemies/enemy3.png",
      "/assets/enemies/enemy4.png",
      "/assets/enemies/enemy5.png",
    ]
    const enemyTextures = enemyTexturePaths.map((p) => textureLoader.load(p))

    const enemies: Enemy[] = []
    const spawnEnemy = (name: string, x: number, z: number, speed: number) => {
      const tex = enemyTextures[Math.floor(Math.random() * enemyTextures.length)]
      const material = new THREE.SpriteMaterial({
        map: tex,
        // alphaTest: 0.5,
      })
      const sprite = new THREE.Sprite(material)
      sprite.name = name
      sprite.position.set(x, 1.5, z)
      sprite.scale.set(3, 3, 1)
      sprite.castShadow = false
      sprite.receiveShadow = false
      scene.add(sprite)
      console.log("enemy spawned", name, "pos", sprite.position.toArray())
      enemies.push({
        mesh: sprite,
        speed,
        radius: 0.9,
        lastDamageAtMs: 0,
        baseY: 1.5,
        floatPhase: Math.random() * Math.PI * 2,
        breached: false,
      })
    }

    const destroyEnemy = (mesh: any) => {
      const idx = enemies.findIndex((e) => e.mesh === mesh)
      if (idx === -1) return
      const [enemy] = enemies.splice(idx, 1)
      scene.remove(enemy.mesh)

      const mat = enemy.mesh.material
      if (mat?.dispose) mat.dispose()
      onEnemyKilled?.()

      // Wave clear check
      if (phase.mode === "combat" && enemies.length === 0) {
        phase = { mode: "gate-selection" }
        setGatesVisible(true)
        console.log("[wave cleared]", waveNumber)
      }
    }

    const clearEnemies = () => {
      for (const e of enemies) scene.remove(e.mesh)
      enemies.length = 0
    }

    // Basic enemy spawn on initialization
    type Phase = { mode: "combat" } | { mode: "gate-selection" }
    let phase: Phase = { mode: "combat" }
    let waveNumber = 1
    let pendingGate: GateType | null = null

    const spawnWave = (wave: number, gate: GateType | null) => {
      // Simple placeholder: spawn 5 enemies (outside) for now.
      // (The user requested basic init spawn; waves can be expanded later.)
      clearEnemies()
      const xLeft = -platformWidth / 2 - 12
      const xRight = platformWidth / 2 + 12
      const zStart = platformZ - 90
      for (let i = 0; i < 5; i++) {
        const x = xLeft + (i / 4) * (xRight - xLeft)
        const z = zStart - (i % 2) * 8
        spawnEnemy(`wave-${wave}-enemy-${i + 1}`, x, z, 2.2)
      }
    }

    const setGatesVisible = (visible: boolean) => {
      for (const g of gates) g.mesh.visible = visible
    }

    // Immediately spawn 5 enemies OUTSIDE the fortress (far from player)
    setGatesVisible(false)
    clearEnemies()
    {
      const forwardDir = new THREE.Vector3()
      camera.getWorldDirection(forwardDir)
      forwardDir.y = 0
      if (forwardDir.lengthSq() === 0) forwardDir.set(0, 0, -1)
      forwardDir.normalize()

      // If "forward" is behaving backwards for any reason, invert it.
      const testPos = camera.position.clone().add(forwardDir.clone().multiplyScalar(20))
      const isBehind = testPos.clone().sub(camera.position).dot(forwardDir) < 0
      if (isBehind) forwardDir.multiplyScalar(-1)

      const count = 5
      const spacing = 5
      const rightDir = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize()

      for (let i = 0; i < count; i++) {
        const dist = 40 // spawn far out so they're visible approaching
        const offsetX = (i - (count - 1) / 2) * spacing
        const pos = camera.position
          .clone()
          .add(forwardDir.clone().multiplyScalar(dist))
          .add(rightDir.clone().multiplyScalar(offsetX))
        // y is set inside spawnEnemy
        spawnEnemy(`enemy-${i + 1}`, pos.x, pos.z, 1.5)
      }
    }

    // Shooting (raycast from camera center)
    const raycaster = new THREE.Raycaster()
    const aim = new THREE.Vector2(0, 0)
    const shootables = [outsideGround, platform, defenseLine].concat(
      scene.children.filter((o: any) => typeof o?.name === "string" && o.name.startsWith("tower")),
    )

    const effects: { obj: any; expiresAtMs: number }[] = []

    const spawnShotRay = (from: any, to: any) => {
      const geo = new THREE.BufferGeometry().setFromPoints([from, to])
      const mat = new THREE.LineBasicMaterial({ color: 0xffd6a3, transparent: true, opacity: 0.9 })
      const line = new THREE.Line(geo, mat)
      line.name = "shot-ray"
      scene.add(line)
      effects.push({ obj: line, expiresAtMs: performance.now() + 50 })
    }

    const spawnHitFlash = (point: any) => {
      const mat = new THREE.SpriteMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
      const s = new THREE.Sprite(mat)
      s.name = "hit-flash"
      s.position.copy(point)
      s.scale.set(0.8, 0.8, 1)
      scene.add(s)
      effects.push({ obj: s, expiresAtMs: performance.now() + 120 })
    }

    const shoot = () => {
      raycaster.setFromCamera(aim, camera)
      const enemyMeshes = enemies.map((e) => e.mesh)
      const hits = raycaster.intersectObjects(enemyMeshes.concat(shootables), false)
      const hit = hits[0]
      const from = camera.position.clone()
      const to = hit ? hit.point.clone() : from.clone().add(forward.clone().multiplyScalar(14))
      spawnShotRay(from, to)
      if (!hit) return

      const obj: any = hit.object
      const isEnemy = enemies.some((e) => e.mesh === obj)
      if (isEnemy) {
        spawnHitFlash(hit.point)
        destroyEnemy(obj)
        console.log("[shot enemy]", obj.name || obj.uuid)
        return
      }

      console.log("[shot hit]", obj.name || obj.uuid)
    }

    // Simple first-person controller (no external libs)
    const keys = new Set<string>()
    let interactPressed = false
    let gateHighlightUntilMs = 0
    let highlightedGate: GateType | null = null
    // Initialize yaw/pitch from the fixed starting look direction.
    let yaw = camera.rotation.y
    let pitch = camera.rotation.x
    const move = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    const worldUp = new THREE.Vector3(0, 1, 0)
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    const playerFloorY = playerHeightY
    const moveSpeed = 6
    const mouseSensitivity = 0.002
    const maxPitch = Math.PI / 2 - 0.01

    // Mouse look stays disabled until pointer lock (click).

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      e.preventDefault()

      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock()
        return
      }

      shoot()
    }

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      yaw -= e.movementX * mouseSensitivity
      pitch -= e.movementY * mouseSensitivity
      pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch))
      camera.rotation.set(pitch, yaw, 0, "YXZ")
    }

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.code)
      if (e.code === "KeyE") {
        interactPressed = true
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
    }

    canvas.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)

    const resize = () => {
      const { innerWidth: width, innerHeight: height, devicePixelRatio } = window

      camera.aspect = width / height
      camera.updateProjectionMatrix()

      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
      renderer.setSize(width, height, false)
    }

    resize()
    window.addEventListener("resize", resize)

    let rafId = 0
    let lastT = performance.now()
    const render = () => {
      rafId = window.requestAnimationFrame(render)

      const now = performance.now()
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now

      // Direction vectors from yaw (keep movement on the XZ plane)
      forward.set(0, 0, -1).applyAxisAngle(worldUp, yaw).normalize()
      right.copy(forward).cross(up).normalize()

      move.set(0, 0, 0)
      if (keys.has("KeyW")) move.add(forward)
      if (keys.has("KeyS")) move.sub(forward)
      if (keys.has("KeyD")) move.add(right)
      if (keys.has("KeyA")) move.sub(right)
      if (move.lengthSq() > 0) move.normalize()

      // Move + clamp (can't go outside platform / fall off edges)
      const halfW = platformWidth / 2 - 1.2
      const halfD = platformDepth / 2 - 1.2

      const nextX = camera.position.x + move.x * moveSpeed * dt
      const nextZ = camera.position.z + move.z * moveSpeed * dt

      camera.position.x = Math.max(-halfW, Math.min(halfW, nextX))
      camera.position.z = Math.max(platformZ - halfD, Math.min(platformZ + halfD, nextZ))

      // Lock player to wall height (no gravity/jump for now)
      camera.position.y = playerFloorY

      // Enemy updates (move toward wall; once reached, deal DOT)
      const playerPos = camera.position
      for (const e of enemies) {
        const wallZ = platformZ - platformDepth / 2
        if (!e.breached) {
          const dz = wallZ - e.mesh.position.z
          if (dz <= 0.15) {
            e.breached = true
            e.mesh.position.z = wallZ
          } else {
            e.mesh.position.z += Math.min(dz, e.speed * dt)
          }
        } else {
          const tickMs = 900
          if (now - e.lastDamageAtMs > tickMs) {
            e.lastDamageAtMs = now
            onPlayerHit?.(5)
            console.log("[breach damage]", e.mesh.name)
          }
        }

        // Slight floating animation
        const floatAmp = 0.18
        const floatSpeed = 2.2
        e.mesh.position.y = e.baseY + Math.sin(now * 0.001 * floatSpeed + e.floatPhase) * floatAmp
      }

      // Cleanup transient effects
      for (let i = effects.length - 1; i >= 0; i--) {
        const fx = effects[i]
        if (now < fx.expiresAtMs) continue
        scene.remove(fx.obj)
        if (fx.obj instanceof THREE.Line) {
          fx.obj.geometry.dispose()
          fx.obj.material.dispose()
        } else if (fx.obj instanceof THREE.Sprite) {
          fx.obj.material.dispose()
        }
        effects.splice(i, 1)
      }

      // Gate look highlight (raycast from camera)
      let lookedGate: Gate | null = null
      raycaster.setFromCamera(aim, camera)
      const gatePlanes = gates.map((g) => g.mesh)
      const gateHits = raycaster.intersectObjects(gatePlanes, true)
      if (gateHits[0]) {
        const hitObj: any = gateHits[0].object
        lookedGate =
          gates.find((g) => g.mesh === hitObj || g.mesh.children.includes(hitObj)) ?? null
      }

      for (const gate of gates) {
        if (!gate.glow) continue
        const mat: any = gate.glow.material
        const isFocused = lookedGate?.type === gate.type
        const isForced = highlightedGate === gate.type && now < gateHighlightUntilMs
        mat.opacity = isForced ? 0.65 : isFocused ? 0.4 : 0.25
      }

      // Gate interaction (press E while looking at gate) — only between waves
      if (interactPressed) {
        interactPressed = false
        if (phase.mode === "gate-selection" && lookedGate) {
          highlightedGate = lookedGate.type
          gateHighlightUntilMs = now + 250
          pendingGate = lookedGate.type
          onGateSelected?.(lookedGate.type)

          // Begin next wave immediately after selection
          phase = { mode: "combat" }
          setGatesVisible(false)
          waveNumber += 1
          spawnWave(waveNumber, pendingGate)
          console.log("[wave start]", waveNumber, pendingGate)
        }
      }

      renderer.render(scene, camera)
    }
    render()

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)

      clearEnemies()

        ; (Object.values(gateTextures) as any[]).forEach((t) => t.dispose?.())
      enemyTextures.forEach((t: any) => t.dispose?.())

      scene.traverse((obj: any) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
          return
        }
        if (obj instanceof THREE.Sprite) {
          const mat = obj.material
          if (mat?.map?.dispose) mat.map.dispose()
          if (mat?.dispose) mat.dispose()
        }
      })
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        display: "block",
      }}
    />
  )
}

