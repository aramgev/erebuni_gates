"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type Enemy = {
  mesh: any
  speed: number
  breachDamage: number
  health: number
  radius: number
  lastDamageAtMs: number
  baseY: number
  floatPhase: number
  breached: boolean
}

type GateType = "fire" | "shadow" | "storm"
type Gate = {
  type: GateType
  label: string
  mesh: any
  radius: number
  glow?: any
  labelSprite?: any
  hitArea?: any
}

export function GameCanvas({
  onPlayerHit,
  onEnemyKilled,
  onGateSelected,
  onInteractionHintChange,
}: {
  onPlayerHit?: (damage: number) => void
  onEnemyKilled?: () => void
  onGateSelected?: (gate: GateType | null) => void
  onInteractionHintChange?: (hint: string) => void
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

    // Fortress defense environment
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
    const whitePaintMat = new THREE.MeshStandardMaterial({
      color: 0xd8d0b4,
      roughness: 0.95,
      metalness: 0,
    })
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x242421,
      roughness: 1,
      metalness: 0,
    })
    const basaltLightMat = new THREE.MeshStandardMaterial({
      color: 0x3c3b36,
      roughness: 1,
      metalness: 0,
    })
    const grassGroundMat = new THREE.MeshStandardMaterial({
      color: 0x425f3d,
      roughness: 1,
      metalness: 0,
    })
    const distantGrassMat = new THREE.MeshStandardMaterial({
      color: 0x31472f,
      roughness: 1,
      metalness: 0,
    })
    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0x5f4a32,
      roughness: 1,
      metalness: 0,
    })
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x4c5148,
      roughness: 1,
      metalness: 0,
    })

    const seededRandom = (() => {
      let seed = 1337
      return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
      }
    })()

    // Ground plane below (outside battlefield)
    const outsideGround = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400, 1, 1),
      grassGroundMat,
    )
    outsideGround.name = "outside-ground"
    outsideGround.rotation.x = -Math.PI / 2
    outsideGround.position.set(0, 0, -100)
    scene.add(outsideGround)

    const distantGround = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 130, 1, 1),
      distantGrassMat,
    )
    distantGround.name = "distant-grass-field"
    distantGround.rotation.x = -Math.PI / 2
    distantGround.position.set(0, 0.015, -205)
    scene.add(distantGround)

    const approachPath = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 145, 1, 1),
      dirtMat,
    )
    approachPath.name = "fortress-approach-path"
    approachPath.rotation.x = -Math.PI / 2
    approachPath.position.set(0, 0.03, -70)
    scene.add(approachPath)

    const grassBladeGeo = new THREE.PlaneGeometry(0.18, 1.15, 1, 1)
    grassBladeGeo.translate(0, 0.575, 0)
    const grassBladeMat = new THREE.MeshStandardMaterial({
      color: 0x5f8f46,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
      vertexColors: true,
    })
    const grassCount = 950
    const grassBlades = new THREE.InstancedMesh(grassBladeGeo, grassBladeMat, grassCount)
    grassBlades.name = "outside-grass-blades"
    grassBlades.frustumCulled = false

    const grassMatrix = new THREE.Matrix4()
    const grassPosition = new THREE.Vector3()
    const grassQuaternion = new THREE.Quaternion()
    const grassScale = new THREE.Vector3()
    const grassColor = new THREE.Color()
    const grassEuler = new THREE.Euler()

    for (let i = 0; i < grassCount; i++) {
      let x = 0
      let z = 0
      for (let attempts = 0; attempts < 8; attempts++) {
        x = (seededRandom() - 0.5) * 135
        z = -8 - seededRandom() * 150
        if (Math.abs(x) > 7 || z < -38) break
      }

      const height = 0.55 + seededRandom() * 1.05
      const width = 0.5 + seededRandom() * 0.9
      const lean = (seededRandom() - 0.5) * 0.28
      grassPosition.set(x, 0.025, z)
      grassEuler.set(lean, seededRandom() * Math.PI * 2, (seededRandom() - 0.5) * 0.18)
      grassQuaternion.setFromEuler(grassEuler)
      grassScale.set(width, height, width)
      grassMatrix.compose(grassPosition, grassQuaternion, grassScale)
      grassBlades.setMatrixAt(i, grassMatrix)
      grassColor.setHSL(0.26 + seededRandom() * 0.06, 0.35 + seededRandom() * 0.18, 0.25 + seededRandom() * 0.16)
      grassBlades.setColorAt(i, grassColor)
    }
    grassBlades.instanceMatrix.needsUpdate = true
    if (grassBlades.instanceColor) grassBlades.instanceColor.needsUpdate = true
    scene.add(grassBlades)

    const rockGeo = new THREE.DodecahedronGeometry(1, 0)
    for (let i = 0; i < 18; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat)
      rock.name = `field-stone-${i + 1}`
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (12 + seededRandom() * 48)
      const z = -16 - seededRandom() * 135
      const s = 0.35 + seededRandom() * 0.9
      rock.position.set(x, 0.12 + s * 0.22, z)
      rock.rotation.set(seededRandom() * Math.PI, seededRandom() * Math.PI, seededRandom() * Math.PI)
      rock.scale.set(s * 1.35, s * 0.48, s)
      scene.add(rock)
    }

    // Elevated fortress wall platform
    const platformHeight = 8
    const platformWidth = 40
    const platformDepth = 10
    const platformZ = 5 // front edge sits at z=0
    const platformTopY = platformHeight + 0.5 // thickness=1
    const eyeHeightAbovePlatform = 1.6
    const playerHeightY = platformTopY + eyeHeightAbovePlatform

    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth + 8, platformHeight, 3.2),
      basaltMat,
    )
    frontWall.name = "erebuni-front-wall"
    frontWall.position.set(0, platformHeight / 2, 0.2)
    scene.add(frontWall)

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth, 1, platformDepth),
      basaltLightMat,
    )
    platform.name = "wall-platform"
    platform.position.set(0, platformHeight, platformZ)
    scene.add(platform)

    const walkway = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth - 5, 0.12, platformDepth - 2.2),
      stoneMat,
    )
    walkway.name = "raised-wall-walkway"
    walkway.position.set(0, platformTopY + 0.07, platformZ + 0.35)
    scene.add(walkway)

    const redBand = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth + 8.4, 0.55, 0.08),
      redMat,
    )
    redBand.name = "urartu-red-wall-band"
    redBand.position.set(0, platformHeight - 1.35, -1.44)
    scene.add(redBand)

    const whiteBand = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth + 8.2, 0.38, 0.09),
      whitePaintMat,
    )
    whiteBand.name = "urartu-white-wall-band"
    whiteBand.position.set(0, platformHeight - 2.05, -1.48)
    scene.add(whiteBand)

    const blockGeo = new THREE.BoxGeometry(3.4, 0.55, 0.14)
    for (let row = 0; row < 7; row++) {
      const y = 1.15 + row * 0.92
      const stagger = row % 2 === 0 ? 0 : 1.7
      for (let x = -22; x <= 22; x += 3.4) {
        const block = new THREE.Mesh(blockGeo, row % 2 === 0 ? basaltLightMat : darkStoneMat)
        block.name = `basalt-wall-block-${row}-${x}`
        block.position.set(x + stagger, y, -1.5)
        scene.add(block)
      }
    }

    // Front battlement parapet (waist-height so player can see over it)
    const defenseLineHeight = 0.9
    const defenseLineThickness = 1
    const defenseLine = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth + 1.5, defenseLineHeight, defenseLineThickness),
      basaltMat,
    )
    defenseLine.name = "defense-line"
    defenseLine.position.set(
      0,
      platformTopY + defenseLineHeight / 2,
      0 + defenseLineThickness / 2,
    )
    scene.add(defenseLine)

    const rearParapet = new THREE.Mesh(
      new THREE.BoxGeometry(platformWidth + 1.5, 1.1, 0.9),
      basaltMat,
    )
    rearParapet.name = "rear-parapet"
    rearParapet.position.set(0, platformTopY + 0.55, platformZ + platformDepth / 2 - 0.45)
    scene.add(rearParapet)

    const crenelGeo = new THREE.BoxGeometry(1.15, 1.05, 0.95)
    for (let i = 0; i < 17; i++) {
      const x = -platformWidth / 2 + 1.2 + i * 2.35
      const frontCrenel = new THREE.Mesh(crenelGeo, basaltLightMat)
      frontCrenel.name = `front-crenel-${i + 1}`
      frontCrenel.position.set(x, platformTopY + defenseLineHeight + 0.5, 0.5)
      scene.add(frontCrenel)

      const rearCrenel = new THREE.Mesh(crenelGeo, basaltLightMat)
      rearCrenel.name = `rear-crenel-${i + 1}`
      rearCrenel.position.set(x, platformTopY + 1.6, platformZ + platformDepth / 2 - 0.45)
      scene.add(rearCrenel)
    }

    const makeTower = (name: string, x: number, z: number, width: number, depth: number, height: number) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), basaltMat)
      tower.name = name
      tower.position.set(x, height / 2, z)
      scene.add(tower)

      const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.7, depth + 0.8), redMat)
      cap.name = `${name}-red-cap`
      cap.position.set(x, height + 0.35, z)
      scene.add(cap)

      const whiteInset = new THREE.Mesh(new THREE.BoxGeometry(width + 0.95, 0.32, 0.08), whitePaintMat)
      whiteInset.name = `${name}-white-band`
      whiteInset.position.set(x, height - 2.1, z - depth / 2 - 0.05)
      scene.add(whiteInset)

      for (let i = 0; i < 3; i++) {
        const crenel = new THREE.Mesh(crenelGeo, basaltLightMat)
        crenel.name = `${name}-crenel-${i + 1}`
        crenel.position.set(x - width / 3 + i * width / 3, height + 1.15, z - depth / 2)
        scene.add(crenel)
      }
    }

    makeTower("tower-left-rect", -platformWidth / 2 - 1.5, 1.2, 6.2, 5.4, 12.5)
    makeTower("tower-right-rect", platformWidth / 2 + 1.5, 1.2, 6.2, 5.4, 12.5)
    makeTower("tower-rear-left-rect", -platformWidth / 2 + 3, platformZ + platformDepth / 2 - 0.6, 5, 4.8, 11)
    makeTower("tower-rear-right-rect", platformWidth / 2 - 3, platformZ + platformDepth / 2 - 0.6, 5, 4.8, 11)

    const sideWallGeo = new THREE.BoxGeometry(2.2, platformHeight - 0.5, platformDepth + 1.6)
    const leftReturnWall = new THREE.Mesh(sideWallGeo, basaltMat)
    leftReturnWall.name = "left-return-wall"
    leftReturnWall.position.set(-platformWidth / 2 - 1.1, (platformHeight - 0.5) / 2, platformZ + 0.5)
    scene.add(leftReturnWall)

    const rightReturnWall = new THREE.Mesh(sideWallGeo, basaltMat)
    rightReturnWall.name = "right-return-wall"
    rightReturnWall.position.set(platformWidth / 2 + 1.1, (platformHeight - 0.5) / 2, platformZ + 0.5)
    scene.add(rightReturnWall)

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

    const gatePlaneGeo = new THREE.PlaneGeometry(4.8, 6.2)
    const gateGlowGeo = new THREE.PlaneGeometry(6.1, 7.7)
    const gateHitGeo = new THREE.PlaneGeometry(6.6, 8.4)

    const makeLabelTexture = (label: string) => {
      const labelCanvas = document.createElement("canvas")
      labelCanvas.width = 256
      labelCanvas.height = 96
      const ctx = labelCanvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height)
        ctx.font = "700 38px serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.lineWidth = 7
        ctx.strokeStyle = "rgba(7, 10, 18, 0.92)"
        ctx.fillStyle = "#fff1c7"
        ctx.strokeText(label, 128, 48)
        ctx.fillText(label, 128, 48)
      }
      const texture = new THREE.CanvasTexture(labelCanvas)
      texture.colorSpace = THREE.SRGBColorSpace
      return texture
    }

    const gates: Gate[] = []
    const spawnGate = (type: GateType, label: string, x: number, z: number) => {
      const group = new THREE.Group()
      group.name = `gate-${type}`
      group.position.set(x, platformTopY + 3.6, z)

      const baseMat = new THREE.MeshBasicMaterial({
        map: gateTextures[type],
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const base = new THREE.Mesh(gatePlaneGeo, baseMat)
      base.name = `gate-plane-${type}`
      base.position.set(0, 0, 0)
      group.add(base)

      const glowMat = new THREE.MeshBasicMaterial({
        color: type === "fire" ? 0xff5b3b : type === "shadow" ? 0x7a6cff : 0x56c7ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const glow = new THREE.Mesh(gateGlowGeo, glowMat)
      glow.name = `gate-glow-${type}`
      glow.position.set(0, 0, -0.04)
      group.add(glow)

      const hitArea = new THREE.Mesh(
        gateHitGeo,
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      )
      hitArea.name = `gate-hit-area-${type}`
      hitArea.position.set(0, 0, 0.03)
      group.add(hitArea)

      const labelTexture = makeLabelTexture(label)
      const labelSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
          depthWrite: false,
        }),
      )
      labelSprite.name = `gate-label-${type}`
      labelSprite.position.set(0, 4.45, 0)
      labelSprite.scale.set(4.9, 1.85, 1)
      group.add(labelSprite)

      scene.add(group)
      gates.push({ type, label, mesh: group, glow, labelSprite, hitArea, radius: 4.1 })
      console.log(
        "[gate spawned]",
        type,
        "position",
        group.position.toArray(),
        "label",
        label,
      )
    }

    // Spawn 3 readable gates on the inner fortress wall, behind the player.
    const gateWallZ = platformZ - 0.8
    spawnGate("fire", "Fire", -11, gateWallZ)
    spawnGate("storm", "Storm", 0, gateWallZ)
    spawnGate("shadow", "Shadow", 11, gateWallZ)

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
    const spawnEnemy = (
      name: string,
      x: number,
      z: number,
      speed: number,
      breachDamage: number,
      health: number,
    ) => {
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
        breachDamage,
        health,
        radius: 0.9,
        lastDamageAtMs: 0,
        baseY: 1.5,
        floatPhase: Math.random() * Math.PI * 2,
        breached: false,
      })
    }

    const destroyEnemy = (mesh: any) => {
      const idx = enemies.findIndex((e) => e.mesh === mesh)
      if (idx === -1) return false
      const [enemy] = enemies.splice(idx, 1)
      scene.remove(enemy.mesh)

      const mat = enemy.mesh.material
      if (mat?.dispose) mat.dispose()
      onEnemyKilled?.()
      console.log("enemy killed")

      // Wave clear check
      if (phase.mode === "PLAYING_WAVE" && enemies.length === 0) {
        completeWave()
      }
      return true
    }

    const damageEnemy = (enemy: Enemy, damage: number) => {
      enemy.health -= damage
      console.log("[enemy damaged]", enemy.mesh.name, "health:", enemy.health)
      if (enemy.health <= 0) {
        destroyEnemy(enemy.mesh)
      }
    }

    const clearEnemies = () => {
      for (const e of enemies) scene.remove(e.mesh)
      enemies.length = 0
    }

    type Phase = { mode: "PLAYING_WAVE" } | { mode: "GATE_SELECTION" }
    let phase: Phase = { mode: "PLAYING_WAVE" }
    let waveNumber = 1
    let pendingGate: GateType | null = null
    let activeModifier: GateType | null = null
    const interactionDistance = 7.5
    let lastInteractionHint = ""
    let lastGateDebugAtMs = 0

    const setInteractionHint = (hint: string) => {
      if (hint === lastInteractionHint) return
      lastInteractionHint = hint
      onInteractionHintChange?.(hint)
    }

    const getNearestGate = () => {
      let nearestGate: Gate | null = null
      let nearestDistance = Infinity
      for (const gate of gates) {
        const dx = gate.mesh.position.x - camera.position.x
        const dz = gate.mesh.position.z - camera.position.z
        const distance = Math.hypot(dx, dz)
        if (distance < nearestDistance) {
          nearestGate = gate
          nearestDistance = distance
        }
      }
      return { nearestGate, nearestDistance }
    }

    const completeWave = () => {
      phase = { mode: "GATE_SELECTION" }
      activeModifier = null
      setGatesVisible(true)
      onGateSelected?.(null)
      console.log("wave complete")
      console.log("gate selection active")
      console.log("current gamePhase", phase.mode)
    }

    const startWave = (wave: number, gate: GateType | null) => {
      phase = { mode: "PLAYING_WAVE" }
      waveNumber = wave
      pendingGate = gate
      activeModifier = gate
      setGatesVisible(false)
      setInteractionHint("")
      clearEnemies()

      const baseEnemyCount = 5 + (wave - 1) * 2
      const baseEnemySpeed = 1.5 + (wave - 1) * 0.22
      const baseBreachDamage = 5 + (wave - 1) * 1.25
      const baseEnemyHealth = 1 + Math.floor((wave - 1) / 4)
      const enemyCount =
        gate === "fire"
          ? Math.max(3, baseEnemyCount - 2)
          : gate === "shadow"
            ? baseEnemyCount + 3
            : baseEnemyCount
      const enemySpeed =
        gate === "fire"
          ? baseEnemySpeed * 1.28
          : gate === "storm"
            ? baseEnemySpeed * 0.74
            : baseEnemySpeed
      const breachDamage =
        gate === "fire" ? baseBreachDamage * 1.35 : baseBreachDamage
      const enemyHealth =
        gate === "shadow" ? Math.max(0.65, baseEnemyHealth * 0.65) : baseEnemyHealth
      const spreadBonus = gate === "storm" ? 12 : 0
      const xLeft = -platformWidth / 2 - 12 - spreadBonus
      const xRight = platformWidth / 2 + 12 + spreadBonus
      const zStart = platformZ - 90

      for (let i = 0; i < enemyCount; i++) {
        const t = enemyCount === 1 ? 0.5 : i / (enemyCount - 1)
        const row = Math.floor(i / 5)
        const x = xLeft + t * (xRight - xLeft)
        const z = zStart - (i % 2) * 8 - row * 7
        spawnEnemy(`wave-${wave}-enemy-${i + 1}`, x, z, enemySpeed, breachDamage, enemyHealth)
      }

      console.log(`wave started: ${wave}`, "modifier:", activeModifier ?? "none")
      console.log("current gamePhase", phase.mode)
    }

    const setGatesVisible = (visible: boolean) => {
      for (const g of gates) {
        g.mesh.visible = visible
        if (g.labelSprite?.material) g.labelSprite.material.opacity = 1
      }
      console.log(visible ? "gates shown" : "gates hidden")
    }

    startWave(1, null)

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
      const enemy = enemies.find((e) => e.mesh === obj)
      if (enemy) {
        spawnHitFlash(hit.point)
        console.log("[shot enemy]", obj.name || obj.uuid)
        damageEnemy(enemy, 1)
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
        console.log("E pressed")
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
            onPlayerHit?.(e.breachDamage)
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

      for (const gate of gates) {
        gate.mesh.lookAt(camera.position.x, gate.mesh.position.y, camera.position.z)
      }

      const { nearestGate, nearestDistance } = getNearestGate()
      const nearestGateInRange =
        phase.mode === "GATE_SELECTION" &&
        nearestGate !== null &&
        nearestDistance <= interactionDistance

      if (phase.mode === "GATE_SELECTION" && now - lastGateDebugAtMs > 1000) {
        lastGateDebugAtMs = now
        console.log("current gamePhase", phase.mode)
        console.log(
          "nearestGate",
          nearestGate?.label ?? "none",
          "distance",
          Number.isFinite(nearestDistance) ? nearestDistance.toFixed(2) : "n/a",
        )
      }

      setInteractionHint(
        nearestGateInRange && nearestGate
          ? `Press E to choose ${nearestGate.label}`
          : "",
      )

      for (const gate of gates) {
        if (!gate.glow) continue
        const mat: any = gate.glow.material
        const isFocused = nearestGateInRange && nearestGate?.type === gate.type
        const isForced = highlightedGate === gate.type && now < gateHighlightUntilMs
        mat.opacity = isForced ? 0.65 : isFocused ? 0.4 : 0.25
      }

      // Gate interaction (press E near gate) - only between waves.
      if (interactPressed) {
        interactPressed = false
        console.log("current gamePhase", phase.mode)
        console.log(
          "nearestGate",
          nearestGate?.label ?? "none",
          "distance",
          Number.isFinite(nearestDistance) ? nearestDistance.toFixed(2) : "n/a",
        )
        if (nearestGateInRange && nearestGate) {
          highlightedGate = nearestGate.type
          gateHighlightUntilMs = now + 250
          onGateSelected?.(nearestGate.type)
          console.log(`gate selected: ${nearestGate.label}`)

          // Begin next wave immediately after selection
          startWave(waveNumber + 1, nearestGate.type)
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

