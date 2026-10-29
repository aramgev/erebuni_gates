"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { wavePlan, waveFormation, regionForWave, combatStats, streakReward, type ExpeditionCommand, type ExpeditionStatus, type UpgradeId, type WeaponMode } from "@/lib/expedition"
import { buildWorldScenery, makeTerrainGeometry, makeGrassGeometry, terrainHeight } from "@/lib/world-scenery"
import { createCrossbow } from "@/lib/crossbow"
import { createFortressCannon } from "@/lib/fortress-cannon"
import { pointerAim, assistedEnemy } from "@/lib/aim"

type Enemy = {
  mesh: any
  kind: EnemyKind
  speed: number
  breachDamage: number
  health: number
  radius: number
  lastDamageAtMs: number
  baseY: number
  floatPhase: number
  breached: boolean
  maxHealth: number
  boss: boolean
  healthBar: any
  targetX: number
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

type GateType = "fire" | "shadow" | "storm"
type EnemyKind = "shadow-warrior" | "stone-golem" | "spirit"
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
  onWaveChange,
  portalProfile,
  getCurrentHp,
  onGateSelected,
  onInteractionHintChange,
  onPortalEnterRequest,
  portalRedirectUrl,
  isPaused = false,
  muted = false,
  command,
  onStatus,
  onHeal,
  onControlChange,
}: {
  command?: ExpeditionCommand | null
  onStatus?: (status: ExpeditionStatus) => void
  onHeal?: (amount: number) => void
  onControlChange?: (locked: boolean) => void
  onPlayerHit?: (damage: number) => void
  onEnemyKilled?: () => void
  onWaveChange?: (wave: number) => void
  portalProfile?: {
    portal: boolean
    username: string
    color?: string
    speed?: string
    ref?: string
  }
  getCurrentHp?: () => number
  onGateSelected?: (gate: GateType | null) => void
  onInteractionHintChange?: (hint: string) => void
  onPortalEnterRequest?: (url: string) => void
  portalRedirectUrl?: string | null
  isPaused?: boolean
  muted?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reticleRef = useRef<SVGSVGElement | null>(null)
  const pausedRef = useRef(isPaused)
  const mutedRef = useRef(muted)
  const portalCallbackRef = useRef(onPortalEnterRequest)
  const portalRedirectUrlRef = useRef(portalRedirectUrl)
  const liveRef = useRef({ onPlayerHit, onEnemyKilled, onWaveChange, getCurrentHp, onGateSelected, onInteractionHintChange, onStatus, onHeal, onControlChange })
  liveRef.current = { onPlayerHit, onEnemyKilled, onWaveChange, getCurrentHp, onGateSelected, onInteractionHintChange, onStatus, onHeal, onControlChange }
  const commandRef = useRef(command)
  commandRef.current = command

  useEffect(() => {
    pausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  useEffect(() => {
    portalCallbackRef.current = onPortalEnterRequest
  }, [onPortalEnterRequest])

  useEffect(() => {
    portalRedirectUrlRef.current = portalRedirectUrl
  }, [portalRedirectUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    type GameSound = "bow" | "hit" | "enemyDeath" | "waveStart" | "gateSelect" | "cannon"
    let audioContext: AudioContext | null = null

    const getAudioContext = () => {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      if (!AudioContextCtor) return null
      if (!audioContext) audioContext = new AudioContextCtor()
      if (audioContext.state === "suspended") void audioContext.resume()
      return audioContext
    }

    const playTone = (
      ctx: AudioContext,
      frequency: number,
      duration: number,
      type: OscillatorType,
      gain: number,
      delay = 0,
    ) => {
      const osc = ctx.createOscillator()
      const amp = ctx.createGain()
      const start = ctx.currentTime + delay
      const end = start + duration
      osc.type = type
      osc.frequency.setValueAtTime(frequency, start)
      amp.gain.setValueAtTime(0.0001, start)
      amp.gain.exponentialRampToValueAtTime(gain, start + 0.01)
      amp.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(amp)
      amp.connect(ctx.destination)
      osc.start(start)
      osc.stop(end + 0.02)
    }

    const playSound = (sound: GameSound) => {
      if (mutedRef.current) return
      const ctx = getAudioContext()
      if (!ctx) return
      if (sound === "cannon") {
        playTone(ctx, 65, 0.65, "sawtooth", 0.13)
        playTone(ctx, 38, 0.8, "triangle", 0.15, 0.03)
        return
      }

      if (sound === "bow") {
        playTone(ctx, 180, 0.07, "triangle", 0.08)
        playTone(ctx, 520, 0.035, "sine", 0.035, 0.015)
        return
      }
      if (sound === "hit") {
        playTone(ctx, 820, 0.055, "square", 0.045)
        playTone(ctx, 240, 0.08, "triangle", 0.035, 0.02)
        return
      }
      if (sound === "enemyDeath") {
        playTone(ctx, 190, 0.16, "sawtooth", 0.06)
        playTone(ctx, 95, 0.2, "triangle", 0.045, 0.04)
        return
      }
      if (sound === "waveStart") {
        playTone(ctx, 220, 0.12, "triangle", 0.055)
        playTone(ctx, 330, 0.12, "triangle", 0.05, 0.11)
        playTone(ctx, 440, 0.16, "triangle", 0.045, 0.22)
        return
      }
      if (sound === "gateSelect") {
        playTone(ctx, 392, 0.1, "sine", 0.055)
        playTone(ctx, 588, 0.12, "sine", 0.05, 0.09)
        playTone(ctx, 784, 0.18, "sine", 0.045, 0.18)
      }
    }

    const scene = new THREE.Scene()
    const fogColor = new THREE.Color(0x263049)
    scene.fog = new THREE.Fog(fogColor.getHex(), 24, 135)

    // "Gradient-style" sky via a lightweight skydome (no shaders)
    scene.background = new THREE.Color(0x1a2237)
    const skyGeo = new THREE.SphereGeometry(500, 20, 14)
    const skyPos = skyGeo.attributes.position
    const skyColors: number[] = []
    const skyTop = new THREE.Color(0x11182b)
    const skyHorizon = new THREE.Color(0xd28b5b)
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
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    scene.add(camera)
    const { crossbow: bow, updatePose, setWeapon: setWeaponVisual } = createCrossbow()
    camera.add(bow)

    const ambientLight = new THREE.AmbientLight(0xffead0, 0.48)
    scene.add(ambientLight)

    // Warm sunrise/sunset light from over the battlefield.
    const directionalLight = new THREE.DirectionalLight(0xffb36f, 1.15)
    directionalLight.position.set(-45, 70, -65)
    directionalLight.castShadow = renderer.shadowMap.enabled
    directionalLight.shadow.mapSize.set(1024, 1024)
    Object.assign(directionalLight.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 1, far: 220 })
    directionalLight.shadow.normalBias = 0.08
    directionalLight.shadow.bias = -0.0003
    directionalLight.target.position.set(0, 0, -40)
    scene.add(directionalLight.target)
    scene.add(directionalLight)

    const hemi = new THREE.HemisphereLight(0xffd5a2, 0x211711, 0.45)
    scene.add(hemi)

    // Fortress defense environment — Urartu tuff and basalt stone
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x5a534a,
      roughness: 1,
      metalness: 0,
    })
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: 0x1e1c18,
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
    const redClothMat = new THREE.MeshBasicMaterial({
      color: 0x8b241c,
      side: THREE.DoubleSide,
    })
    const goldFlatMat = new THREE.MeshBasicMaterial({
      color: 0xd2a33f,
      side: THREE.DoubleSide,
    })
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x2a2520,
      roughness: 1,
      metalness: 0,
    })
    const basaltLightMat = new THREE.MeshStandardMaterial({
      color: 0x3d3832,
      roughness: 1,
      metalness: 0,
    })
    const grassGroundMat = new THREE.MeshStandardMaterial({
      color: 0x425f3d,
      roughness: 1,
      metalness: 0,
      vertexColors: true,
      flatShading: true,
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
      makeTerrainGeometry(),
      grassGroundMat,
    )
    outsideGround.name = "outside-ground"
    outsideGround.position.set(0, 0, -100)
    outsideGround.receiveShadow = true
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

    const grassBladeGeo = makeGrassGeometry()
    const windUniform = { value: 0 }
    const grassBladeMat = new THREE.MeshStandardMaterial({
      color: 0xa3b581,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    })
    grassBladeMat.onBeforeCompile = (shader: any) => {
      shader.uniforms.windTime = windUniform
      shader.vertexShader = `uniform float windTime;\n${shader.vertexShader}`.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.x += sin(windTime + instanceMatrix[3].x * 0.4 + instanceMatrix[3].z * 0.2) * 0.16 * position.y * position.y;")
    }
    const grassCount = 2200
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
      grassPosition.set(x, terrainHeight(x, z) + 0.025, z)
      grassEuler.set(lean, seededRandom() * Math.PI * 2, (seededRandom() - 0.5) * 0.18)
      grassQuaternion.setFromEuler(grassEuler)
      grassScale.set(width, height, width)
      grassMatrix.compose(grassPosition, grassQuaternion, grassScale)
      grassBlades.setMatrixAt(i, grassMatrix)
      grassColor.setHSL(0.2 + seededRandom() * 0.08, 0.25 + seededRandom() * 0.2, 0.42 + seededRandom() * 0.16)
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

    const worldScenery = buildWorldScenery(scene, seededRandom)

    // Distant clouds — high up, drift slowly
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0x3a4560, transparent: true, opacity: 0.12, fog: false, depthWrite: false })
    for (let i = 0; i < 8; i++) {
      const cloudGroup = new THREE.Group()
      cloudGroup.name = `cloud-${i}`
      const numPuffs = 3 + Math.floor(seededRandom() * 3)
      for (let j = 0; j < numPuffs; j++) {
        const r = 5 + seededRandom() * 7
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), cloudMat)
        puff.position.set(seededRandom() * 8 - 4, seededRandom() * 1.5 - 0.5, seededRandom() * 5 - 2.5)
        puff.scale.y = 0.3
        cloudGroup.add(puff)
      }
      cloudGroup.position.set(
        seededRandom() * 280 - 140,
        55 + seededRandom() * 35,
        -70 - seededRandom() * 180,
      )
      cloudGroup.userData.speed = 0.04 + seededRandom() * 0.12
      scene.add(cloudGroup)
    }

    // Small scattered rocks on the sides
    for (let i = 0; i < 25; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1, 0),
        rockMat,
      )
      rock.name = `scatter-rock-${i}`
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (9 + seededRandom() * 50)
      const z = -10 - seededRandom() * 140
      const s = 0.15 + seededRandom() * 0.5
      rock.position.set(x, 0.08 + s * 0.15, z)
      rock.rotation.set(seededRandom() * Math.PI, seededRandom() * Math.PI, seededRandom() * Math.PI)
      rock.scale.set(s * 1.3, s * 0.4, s * 0.9)
      scene.add(rock)
    }

    // Dry bushes — low and spread on the sides, never blocking the center view
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x4a5a30, roughness: 1, metalness: 0 })
    const bushMatDark = new THREE.MeshStandardMaterial({ color: 0x3a4a25, roughness: 1, metalness: 0 })
    for (let i = 0; i < 15; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (10 + seededRandom() * 45)
      const z = -12 - seededRandom() * 100
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.6 + seededRandom() * 0.8, 1),
        seededRandom() > 0.5 ? bushMat : bushMatDark,
      )
      bush.name = `bush-${i}`
      bush.position.set(x, terrainHeight(x, z) + 0.3, z)
      bush.scale.y = 0.55
      scene.add(bush)
    }

    // Small pine trees on the far sides only — keep them short and away from center
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 1, metalness: 0 })
    const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2d4a1e, roughness: 0.9, metalness: 0 })
    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (22 + seededRandom() * 55)
      const z = -18 - seededRandom() * 120
      const treeGroup = new THREE.Group()
      treeGroup.name = `pine-${i}`

      const trunkH = 1.5 + seededRandom() * 2
      const trunkR = 0.15 + seededRandom() * 0.15
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 5), treeTrunkMat)
      trunk.position.y = trunkH / 2
      treeGroup.add(trunk)

      const fH = 2 + seededRandom() * 3
      const fR = 1 + seededRandom() * 1.2
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(fR, fH, 6), treeFoliageMat)
      foliage.position.y = trunkH + fH / 2 - 0.4
      treeGroup.add(foliage)

      if (seededRandom() > 0.5) {
        const f2 = new THREE.Mesh(new THREE.ConeGeometry(fR * 0.7, fH * 0.7, 6), treeFoliageMat)
        f2.position.y = trunkH + fH - 0.3
        treeGroup.add(f2)
      }

      treeGroup.position.set(x, terrainHeight(x, z), z)
      scene.add(treeGroup)
    }

    // Elevated fortress wall platform
    const platformHeight = 8
    const platformWidth = 40
    const platformDepth = 10
    const platformZ = 5 // front edge sits at z=0
    const platformTopY = platformHeight + 0.5 // thickness=1
    const eyeHeightAbovePlatform = 1.6
    const playerHeightY = platformTopY + eyeHeightAbovePlatform
    // Spawn a bit closer to the front wall so the exit portal (near the rear)
    // can't be triggered immediately at game start.
    const spawnZ = 1.6
    camera.position.set(0, playerHeightY, spawnZ)
    camera.lookAt(0, 1.5, -56)

    const fortressCannon = createFortressCannon()
    fortressCannon.cannon.position.set(-3.8, platformTopY, 0.6)
    scene.add(fortressCannon.cannon)

    // Vibe Jam portals (native implementation; no external script required).
    // - Exit portal always exists and sends players to vibej.am portal webring.
    // - Return portal only exists when arriving with ?portal=true&ref=...
    const portalGroup = new THREE.Group()
    portalGroup.name = "vibejam-portals"
    scene.add(portalGroup)

    const makePortal = (name: string, color: number, label: string, position: any) => {
      const group = new THREE.Group()
      group.name = name
      group.position.copy(position)

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.18, 14, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
      )
      ring.name = `${name}-ring`
      ring.rotation.x = Math.PI / 2
      group.add(ring)

      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.95, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      )
      disc.name = `${name}-disc`
      disc.rotation.x = Math.PI / 2
      disc.position.y = 0.01
      group.add(disc)

      // Label as a sprite (cheap + always readable)
      const labelCanvas = document.createElement("canvas")
      labelCanvas.width = 512
      labelCanvas.height = 128
      const ctx = labelCanvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height)
        ctx.font = "800 44px system-ui, -apple-system, Segoe UI, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.lineWidth = 10
        ctx.strokeStyle = "rgba(0,0,0,0.75)"
        ctx.fillStyle = "#ffd98a"
        ctx.strokeText(label, labelCanvas.width / 2, labelCanvas.height / 2)
        ctx.fillText(label, labelCanvas.width / 2, labelCanvas.height / 2)
      }
      const tex = new THREE.CanvasTexture(labelCanvas)
      tex.colorSpace = THREE.SRGBColorSpace
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
      )
      sprite.name = `${name}-label`
      sprite.position.set(0, 1.25, 0)
      sprite.scale.set(3.5, 0.9, 1)
      group.add(sprite)

      return group
    }

    // Exit portal (original placement near the rear parapet).
    const exitPortalPos = new THREE.Vector3(0, platformTopY + 0.08, platformZ + platformDepth / 2 - 1.8)
    const exitPortal = makePortal("vibejam-exit-portal", 0x3cff7e, "VIBE JAM PORTAL", exitPortalPos)
    portalGroup.add(exitPortal)

    const spawnPos = new THREE.Vector3(0, platformTopY + 0.08, spawnZ)
    const shouldAddReturnPortal = Boolean(portalProfile?.portal && portalProfile?.ref)
    const returnPortal = shouldAddReturnPortal
      ? makePortal("vibejam-return-portal", 0xff5b3b, "RETURN", spawnPos.clone().add(new THREE.Vector3(3.2, 0, 0)))
      : null
    if (returnPortal) portalGroup.add(returnPortal)

    const portalTriggerRadius = 2.35
    let portalRedirecting = false
    let portalEnterStartedAtMs = 0
    let portalRedirectAtMs = 0
    let portalFade = 0
    let portalTargetUrl: string | null = null
    let portalPromptShown = false
    // Prevent accidental portal triggers right at start (spawn jitter, initial touch, etc.)
    const portalArmedAtMs = 1200
    const portalFadePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({
        color: 0x0a0b10,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    )
    portalFadePlane.name = "portal-fade-overlay"
    portalFadePlane.renderOrder = 9999
    scene.add(portalFadePlane)

    const horizontalDistanceTo = (a: any, b: any) => {
      const dx = a.x - b.x
      const dz = a.z - b.z
      return Math.hypot(dx, dz)
    }

    const buildExitPortalUrl = () => {
      const params = new URLSearchParams()
      const username = (portalProfile?.username || "").trim() || "Portal Defender"
      params.set("username", username)
      // Vibe Jam requirement for this game: always pass a stable ref URL.
      params.set("ref", `${window.location.origin}/`)
      return `https://vibej.am/portal/2026?${params.toString()}`
    }

    const buildReturnPortalUrl = () => {
      const ref = (portalProfile?.ref || "").trim()
      if (!ref) return null
      const base = /^https?:\/\//i.test(ref) ? ref : `https://${ref}`
      // Prevent infinite loops if ref points back to this same site.
      try {
        const baseUrl = new URL(base)
        if (baseUrl.hostname === window.location.hostname) return null
      } catch {
        return null
      }
      const params = new URLSearchParams()
      params.set("portal", "true")
      const username = (portalProfile?.username || "").trim() || "Portal Defender"
      params.set("username", username)
      const color = (portalProfile?.color || "").trim()
      if (color) params.set("color", color)
      const hp = Math.max(1, Math.min(100, Math.round(liveRef.current.getCurrentHp?.() ?? 100)))
      params.set("hp", String(hp))
      // Keep their ref chain: when returning, set ref to this game.
      params.set("ref", window.location.hostname)
      const s = params.toString()
      return `${base}?${s}`
    }

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

    const addFacadePlane = (
      name: string,
      width: number,
      height: number,
      x: number,
      y: number,
      mat: any,
      rotationZ = 0,
    ) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat)
      plane.name = name
      plane.position.set(x, y, -1.64)
      plane.rotation.z = rotationZ
      scene.add(plane)
      return plane
    }

    const motifXs = [-18, -12, -6, 6, 12, 18]
    for (const x of motifXs) {
      addFacadePlane(`urartu-red-triangle-left-${x}`, 0.12, 1.05, x - 0.34, platformHeight - 2.92, redMat, Math.PI / 4)
      addFacadePlane(`urartu-red-triangle-right-${x}`, 0.12, 1.05, x + 0.34, platformHeight - 2.92, redMat, -Math.PI / 4)
      addFacadePlane(`urartu-gold-diamond-${x}`, 0.45, 0.45, x, platformHeight - 3.55, goldFlatMat, Math.PI / 4)
      addFacadePlane(`urartu-white-divider-${x}`, 0.08, 1.5, x, platformHeight - 3.02, whitePaintMat)
    }

    for (const y of [platformHeight - 4.45, platformHeight - 5.15]) {
      addFacadePlane(`gold-horizontal-wall-strip-${y}`, platformWidth + 5, 0.09, 0, y, goldFlatMat)
      addFacadePlane(`white-horizontal-wall-strip-${y}`, platformWidth + 4.2, 0.08, 0, y - 0.18, whitePaintMat)
    }

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

    const addBanner = (x: number, y: number, name: string) => {
      const banner = addFacadePlane(`${name}-red-banner`, 2.3, 3.1, x, y, redClothMat)
      banner.position.z = -1.72

      const pole = addFacadePlane(`${name}-gold-top-rod`, 2.65, 0.1, x, y + 1.58, goldFlatMat)
      pole.position.z = -1.74

      const runeStem = addFacadePlane(`${name}-gold-rune-stem`, 0.16, 1.55, x, y + 0.05, goldFlatMat)
      runeStem.position.z = -1.76
      const runeCross = addFacadePlane(`${name}-gold-rune-cross`, 1.0, 0.14, x, y + 0.38, goldFlatMat)
      runeCross.position.z = -1.76
      const runeDiamond = addFacadePlane(`${name}-gold-rune-diamond`, 0.55, 0.55, x, y - 0.55, goldFlatMat, Math.PI / 4)
      runeDiamond.position.z = -1.76
    }

    addBanner(-15.5, 3.9, "left-urartu")
    addBanner(0, 3.9, "center-urartu")
    addBanner(15.5, 3.9, "right-urartu")

    const stairMat = new THREE.MeshStandardMaterial({
      color: 0x4a4941,
      roughness: 1,
      metalness: 0,
    })
    for (let i = 0; i < 6; i++) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(12 - i * 0.8, 0.35, 2.2), stairMat)
      stair.name = `outer-stone-stair-${i + 1}`
      stair.position.set(0, 0.18 + i * 0.34, -4.2 + i * 1.55)
      scene.add(stair)
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
      if (Math.abs(x) > 7) {
        const frontCrenel = new THREE.Mesh(crenelGeo, basaltLightMat)
        frontCrenel.name = `front-crenel-${i + 1}`
        frontCrenel.position.set(x, platformTopY + defenseLineHeight + 0.5, 0.5)
        scene.add(frontCrenel)
      }

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

    const makeRoundTower = (name: string, x: number, z: number, radius: number, height: number) => {
      // Tapered cylindrical tower — wider at base (Urartu style)
      const towerBody = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.82, radius, height, 16),
        basaltMat,
      )
      towerBody.name = name
      towerBody.position.set(x, height / 2, z)
      scene.add(towerBody)

      // Stone banding ring
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.86, radius * 0.86, 0.3, 16),
        basaltLightMat,
      )
      band.name = `${name}-stone-band`
      band.position.set(x, height * 0.5, z)
      scene.add(band)

      // Red painted cap
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.6, 16),
        redMat,
      )
      cap.name = `${name}-red-cap`
      cap.position.set(x, height + 0.3, z)
      scene.add(cap)

      // White inset band
      const whiteInset = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 1.6, 0.28, 0.08),
        whitePaintMat,
      )
      whiteInset.name = `${name}-white-band`
      whiteInset.position.set(x, height - 1.8, z - radius - 0.05)
      scene.add(whiteInset)

      // Crenels around the top
      const crenelCount = 6
      for (let i = 0; i < crenelCount; i++) {
        const angle = (i / crenelCount) * Math.PI * 2
        const cx = x + Math.sin(angle) * radius * 0.78
        const cz = z + Math.cos(angle) * radius * 0.78
        const crenel = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.9, 0.7),
          basaltLightMat,
        )
        crenel.name = `${name}-crenel-${i + 1}`
        crenel.position.set(cx, height + 0.95, cz)
        crenel.rotation.y = angle
        scene.add(crenel)
      }
    }

    // Front corner towers — round/cylindrical
    makeRoundTower("tower-left-round", -platformWidth / 2 - 1.5, 1.2, 3.2, 12.5)
    makeRoundTower("tower-right-round", platformWidth / 2 + 1.5, 1.2, 3.2, 12.5)

    // Rear towers — rectangular
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

    // Regional landmarks keep the central approach readable for aiming.
    const regionDecor = Array.from({ length: 4 }, (_, region) => {
      const group = new THREE.Group()
      group.visible = region === 0
      group.name = `expedition-region-${region}`
      const color = [0xcaa575, 0xff6633, 0x76e8db, 0x9c8bff][region]
      const stone = new THREE.MeshStandardMaterial({ color: region === 1 ? 0x302421 : 0x4d5260, roughness: 0.85 })
      const luminous = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.3 })
      for (let i = 0; i < 12; i++) {
        const x = (i % 2 ? 1 : -1) * (22 + seededRandom() * 18)
        const z = -18 - Math.floor(i / 2) * 14
        const height = 4 + seededRandom() * 7
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.3, 1, 6), stone)
        base.position.set(x, 0.5, z)
        group.add(base)
        const landmark = new THREE.Mesh(region === 2 ? new THREE.OctahedronGeometry(2, 0) : new THREE.CylinderGeometry(region === 1 ? 0.15 : 0.9, 1.2, height, region === 3 ? 6 : 4), region === 2 ? luminous : stone)
        landmark.position.set(x, height / 2 + 1, z)
        if (region === 2) { landmark.scale.y = 2.5; landmark.rotation.z = (seededRandom() - 0.5) * 0.5 }
        group.add(landmark)
        const crown = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 5, 16), luminous)
        crown.rotation.x = Math.PI / 2
        crown.position.set(x, height + 0.5, z)
        group.add(crown)
      }
      scene.add(group)
      return group
    })
    const moteGeometry = new THREE.BufferGeometry()
    const motePositions = new Float32Array(160 * 3)
    for (let i = 0; i < 160; i++) {
      motePositions[i * 3] = (seededRandom() - 0.5) * 80
      motePositions[i * 3 + 1] = seededRandom() * 22
      motePositions[i * 3 + 2] = -seededRandom() * 85
    }
    moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3))
    const moteMaterial = new THREE.PointsMaterial({ color: 0xffd99a, size: 0.13, transparent: true, opacity: 0.65, depthWrite: false })
    const motes = new THREE.Points(moteGeometry, moteMaterial)
    scene.add(motes)
    for (const x of [-15, -7, 7, 15]) {
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 1.4, 6), darkStoneMat)
      brazier.position.set(x, platformTopY + 0.7, 0.9)
      scene.add(brazier)
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.38), new THREE.MeshBasicMaterial({ color: 0xffb95a }))
      flame.position.set(x, platformTopY + 1.65, 0.9)
      flame.scale.y = 1.8
      scene.add(flame)
      const light = new THREE.PointLight(0xff9d45, 5, 9)
      light.position.copy(flame.position)
      scene.add(light)
    }
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
    const enemyTexturePaths: Record<EnemyKind, string[]> = {
      "shadow-warrior": [
        "/assets/enemies/enemy1.png",
        "/assets/enemies/enemy2.png",
      ],
      "stone-golem": ["/assets/enemies/enemy4.png"],
      spirit: ["/assets/enemies/enemy5.png"],
    }
    const enemyCatalog = (Object.entries(enemyTexturePaths) as Array<[EnemyKind, string[]]>).flatMap(
      ([kind, paths]) =>
        paths.map((path) => {
          const texture = textureLoader.load(path)
          texture.colorSpace = THREE.SRGBColorSpace
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          return { kind, path, texture }
        }),
    )

    const enemies: Enemy[] = []
    const spawnEnemy = (
      name: string,
      x: number,
      z: number,
      speed: number,
      breachDamage: number,
      health: number,
      kind?: EnemyKind,
      boss = false,
    ) => {
      const chosenKind = kind ?? enemyCatalog[Math.floor(Math.random() * enemyCatalog.length)].kind
      const kindTextures = enemyTexturePaths[chosenKind]
      const texturePath = kindTextures[Math.floor(Math.random() * kindTextures.length)]
      let texture = enemyCatalog.find((e) => e.kind === chosenKind && e.path === texturePath)?.texture
      if (!texture) {
        texture = textureLoader.load(texturePath)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
      }
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: new THREE.Color(0xffffff),
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        depthTest: true,
        opacity: 1,
        fog: false,
      })
      const sprite = new THREE.Sprite(material)
      sprite.name = name
      sprite.position.set(x, 1.5, z)

      const kindScale = chosenKind === "stone-golem" ? 1.4 : chosenKind === "spirit" ? 0.85 : 1
      const readabilityScale = waveNumber <= 2 ? 1.2 : 1
      sprite.scale.set(3 * kindScale * readabilityScale, 3 * kindScale * readabilityScale, 1)
      if (boss) { sprite.scale.multiplyScalar(2.1); material.color.set(0xffb46b) }
      sprite.castShadow = false
      sprite.receiveShadow = false
      scene.add(sprite)

      const kindSpeedMult = chosenKind === "stone-golem" ? 0.65 : chosenKind === "spirit" ? 1.5 : 1
      const kindHealthMult = chosenKind === "stone-golem" ? 2 : chosenKind === "spirit" ? 0.5 : 1
      const kindDamageMult = chosenKind === "stone-golem" ? 2 : chosenKind === "spirit" ? 0.75 : 1

      const maxHealth = boss ? health : health * kindHealthMult
      const healthBar = new THREE.Sprite(new THREE.SpriteMaterial({ color: boss ? 0xff9955 : 0x86e6cc, depthTest: false }))
      healthBar.scale.set(2.4, 0.12, 1)
      healthBar.visible = boss
      scene.add(healthBar)
      enemies.push({
        maxHealth,
        boss,
        healthBar,
        targetX: Math.max(-17, Math.min(17, x * 0.55)),
        mesh: sprite,
        kind: chosenKind,
        speed: speed * kindSpeedMult,
        breachDamage: breachDamage * kindDamageMult,
        health: maxHealth,
        radius: 0.9 * kindScale,
        lastDamageAtMs: 0,
        baseY: boss ? 3.8 : 1.5 * readabilityScale,
        floatPhase: Math.random() * Math.PI * 2,
        breached: false,
      })
    }

    const destroyEnemy = (mesh: any) => {
      const idx = enemies.findIndex((e) => e.mesh === mesh)
      if (idx === -1) return false
      const [enemy] = enemies.splice(idx, 1)
      const pos = enemy.mesh.position.clone()
      scene.remove(enemy.mesh)
      scene.remove(enemy.healthBar)
      enemy.healthBar.material.dispose()
      playSound("enemyDeath")

      const mat = enemy.mesh.material
      if (mat?.dispose) mat.dispose()
      liveRef.current.onEnemyKilled?.()
      if (!resolvingCannon) charge = Math.min(100, charge + (enemy.boss ? 35 : 10))
      if (enemy.boss) {
        liveRef.current.onHeal?.(15)
        charge = Math.min(100, charge + 40)
        notify("Guardian bounty", "+15 vitality · +40 cannon loading progress")
      }

      spawnDeathParticles(pos, enemy.kind)

      // Wave clear check
      if (phase.mode === "PLAYING_WAVE" && enemies.length === 0) {
        completeWave()
      }
      return true
    }

    const spawnDeathParticles = (position: typeof camera.position, kind: EnemyKind) => {
      const particleCount = kind === "stone-golem" ? 12 : 8
      const color = kind === "spirit" ? 0x8866ff : kind === "stone-golem" ? 0x888888 : 0xffd98a

      for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), new THREE.MeshBasicMaterial({ color, transparent: true }))
        particle.position.copy(position)
        scene.add(particle)

        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4,
        )
        const lifetime = 600 + Math.random() * 400
        const born = gameTime
        const origin = position.clone()

        effects.push({
          obj: particle,
          expiresAtMs: born + lifetime,
          update: (now: number) => {
            const elapsed = now - born
            const t = Math.min(1, elapsed / lifetime)
            particle.position.copy(origin).addScaledVector(velocity, elapsed / 1000)
            particle.position.y -= 4 * Math.pow(elapsed / 1000, 2)
            particle.material.opacity = 1 - t
            particle.scale.setScalar(1 - t * 0.5)
          },
        })
      }
    }

    const damageEnemy = (enemy: Enemy, damage: number, ignoreArmor = false) => {
      // The Basalt Warden alternates between armored and exposed phases.
      if (!ignoreArmor && enemy.boss && waveNumber === 3 && Math.floor((gameTime - waveStartedAt) / 4000) % 2 === 0) damage *= 0.45
      enemy.health -= damage
      hitUntil = gameTime + 160
      if (enemy.health <= 0) {
        destroyEnemy(enemy.mesh)
      }
    }

    const clearEnemies = () => {
      for (const e of enemies) { scene.remove(e.mesh, e.healthBar); e.mesh.material.dispose(); e.healthBar.material.dispose() }
      enemies.length = 0
    }

    type Phase = { mode: "PLAYING_WAVE" } | { mode: "WAVE_CLEAR"; remainingMs: number } | { mode: "GATE_SELECTION" }
    let phase: Phase = { mode: "PLAYING_WAVE" }
    let waveNumber = 1
    let activeModifier: GateType | null = null
    let gameTime = 0
    let charge = 40, combo = 0, bestCombo = 0
    let shots = 0, hitCount = 0, hitUntil = 0, hurtUntil = 0
    let arrowDamage = 2, shotInterval = 140, cannonDamage = 8, armor = 1, focus = 1, relics = 0
    let waveStartedAt = 0, reinforcementsAt = 0, reinforcementCount = 0
    let waveGraceUntil = 0, resetWaveView = true
    let resolvingCannon = false
    let weapon: WeaponMode = "crossbow", arsenalUnlocked = false, overdriveUntil = 0
    let cannonMounted = false, cannonExitAt = 0, cannonFiredAt = -Infinity
    const cannonReturnPosition = camera.position.clone()
    let reward: ExpeditionStatus["reward"] = null, rewardUntil = 0, rewardId = 0
    const pendingShells: { point: typeof camera.position; landsAt: number; damage: number }[] = []
    const stats = () => combatStats(arrowDamage, shotInterval, weapon, arsenalUnlocked, gameTime < overdriveUntil)
    const notify = (title: string, description: string) => {
      reward = { id: ++rewardId, title, description }
      rewardUntil = gameTime + 3500
    }
    const awardHit = () => {
      combo++
      bestCombo = Math.max(bestCombo, combo)
      const bonus = streakReward(combo)
      charge = Math.min(100, charge + 5 * focus + bonus.charge + (bonus.heal ? 30 : 0))
      if (bonus.heal) liveRef.current.onHeal?.(bonus.heal)
      if (bonus.overdrive) overdriveUntil = gameTime + 8000
      if (bonus.overdrive) notify(`${combo} hits · Overdrive!`, "8 seconds: faster shots +25% damage · +10 vitality · +50 cannon progress")
      else if (bonus.heal) notify(`${combo} hits · Warrior's gift`, "+10 vitality · +50 cannon loading progress")
      else if (bonus.charge) notify(`${combo} hits · Precision bonus`, "+20 cannon loading progress")
    }
    let lastShotAt = -Infinity, firing = false, waveTotal = 0, lastStatusAt = -Infinity, processedCommand = -1
    const publishStatus = () => {
      const boss = enemies.find((enemy) => enemy.boss)
      liveRef.current.onStatus?.({ wave: waveNumber, cleared: phase.mode !== "PLAYING_WAVE", selectionReady: phase.mode === "GATE_SELECTION", remaining: enemies.length, total: waveTotal, charge: Math.floor(charge), combo, bestCombo, shots, hits: hitCount, bossHealth: boss?.health ?? 0, bossMaxHealth: boss?.maxHealth ?? 0, hit: gameTime < hitUntil, hurt: gameTime < hurtUntil, damage: stats().damage, relics, weapon, arsenalUnlocked, cannonMounted, overdriveSeconds: Math.max(0, Math.ceil((overdriveUntil - gameTime) / 1000)), reward: gameTime < rewardUntil ? reward : null })
    }
    const equipWeapon = (next: WeaponMode) => {
      if (pausedRef.current || document.hidden || !arsenalUnlocked || cannonMounted) return
      weapon = next
      setWeaponVisual(next)
      publishStatus()
    }
    const applyUpgrade = (upgrade: UpgradeId) => {
      relics++
      if (upgrade === "power") arrowDamage += 0.7
      if (upgrade === "haste") shotInterval = Math.max(70, shotInterval * 0.88)
      if (upgrade === "nova") { cannonDamage += 3; charge = 100 }
      if (upgrade === "repair") liveRef.current.onHeal?.(35)
      if (upgrade === "ward") armor *= 0.88
      if (upgrade === "focus") focus += 0.4
    }
    const interactionDistance = 7.5
    let lastInteractionHint = ""

    // Dynamic environment — night mode / rain from wave 10
    const isNightMode = () => waveNumber >= 10
    let nightTransition = 0 // 0 = day, 1 = full night
    const nightTransitionSpeed = 0.003 // how fast day→night transitions

    // Night mode references
    const nightSceneFog = new THREE.Color(0x0a0e1a)
    const daySceneFog = new THREE.Color(0x263049)
    const nightBg = new THREE.Color(0x060810)
    const dayBg = new THREE.Color(0x1a2237)

    // Rain system
    const rainGeo = new THREE.BufferGeometry()
    const rainCount = 1800
    const rainPositions = new Float32Array(rainCount * 3)
    const rainVelocities = new Float32Array(rainCount)
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 120
      rainPositions[i * 3 + 1] = Math.random() * 45
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120 - 20
      rainVelocities[i] = 0.4 + Math.random() * 0.5
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3))
    const rainMat = new THREE.PointsMaterial({
      color: 0x8899bb,
      size: 0.12,
      transparent: true,
      opacity: 0.35,
      fog: true,
      depthWrite: false,
    })
    const rainSystem = new THREE.Points(rainGeo, rainMat)
    rainSystem.name = "rain-system"
    rainSystem.visible = false
    scene.add(rainSystem)

    // Lightning flashes
    let lightningFlash = 0
    let nextLightningAt = 8000 + Math.random() * 12000

    const setInteractionHint = (hint: string) => {
      if (hint === lastInteractionHint) return
      lastInteractionHint = hint
      liveRef.current.onInteractionHintChange?.(hint)
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
      phase = { mode: "WAVE_CLEAR", remainingMs: 3000 }
      firing = false
      leaveCannon()
      pendingShells.length = 0
      if (document.pointerLockElement) document.exitPointerLock()
      activeModifier = null
      setGatesVisible(false)
      liveRef.current.onGateSelected?.(null)
      publishStatus()
    }

    const startWave = (wave: number, gate: GateType | null) => {
      phase = { mode: "PLAYING_WAVE" }
      waveNumber = wave
      pendingShells.length = 0
      if (wave >= 10) {
        if (!arsenalUnlocked) {
          arsenalUnlocked = true
          weapon = "repeater"
          setWeaponVisual(weapon)
          charge = 100
          notify("Storm arsenal unlocked", "Storm repeater equipped · 1/2 to switch · Cannon fully loaded")
        } else charge = Math.min(100, charge + 25)
      }
      waveStartedAt = gameTime
      reinforcementsAt = gameTime + 14000
      reinforcementCount = 0
      liveRef.current.onWaveChange?.(wave)
      activeModifier = gate
      setGatesVisible(false)
      setInteractionHint("")
      clearEnemies()

      const plan = wavePlan(wave, gate)
      waveGraceUntil = gameTime + plan.graceSeconds * 1000
      resetWaveView = true
      const region = regionForWave(wave)
      daySceneFog.set(region.fog)
      dayBg.set(region.sky)
      grassGroundMat.color.set(region.ground)
      grassBladeMat.color.set(region.ground)
      grassBladeMat.color.lerp(new THREE.Color(0xffffff), 0.35)
      worldScenery.setRegion(Math.min(3, Math.floor((wave - 1) / 3)))
      renderer.shadowMap.needsUpdate = true
      moteMaterial.color.set(region.color)
      const colors = skyGeo.attributes.color
      const horizon = new THREE.Color(region.sky).lerp(new THREE.Color(0xffcf94), 0.3)
      const zenith = new THREE.Color(region.sky).multiplyScalar(0.22)
      for (let i = 0; i < skyPos.count; i++) {
        skyTmp.copy(horizon).lerp(zenith, Math.max(0, Math.min(1, skyPos.getY(i) / 300)))
        colors.setXYZ(i, skyTmp.r, skyTmp.g, skyTmp.b)
      }
      colors.needsUpdate = true
      regionDecor.forEach((group, index) => { group.visible = index === Math.min(3, Math.floor((wave - 1) / 3)) })
      waveFormation(wave, gate, camera.aspect).forEach(({ x, z }, i) => {
        const kind: EnemyKind = wave === 1 ? "shadow-warrior" : wave === 2 ? (i === 2 ? "stone-golem" : "shadow-warrior") : wave <= 6 ? (i % 3 === 0 ? "stone-golem" : "shadow-warrior") : i % 3 === 0 ? "spirit" : i % 3 === 1 ? "stone-golem" : "shadow-warrior"
        spawnEnemy(`wave-${wave}-enemy-${i + 1}`, x, z, plan.speed, plan.damage, plan.health, kind)
      })
      if (plan.bossHealth) spawnEnemy(region.boss, 0, -plan.spawnDistance - 14, plan.speed * 0.65, plan.damage * 1.5, plan.bossHealth, wave === 9 ? "spirit" : "stone-golem", true)
      waveTotal = enemies.length
      publishStatus()

      playSound("waveStart")
    }

    const setGatesVisible = (visible: boolean) => {
      for (const g of gates) {
        g.mesh.visible = visible
        if (g.labelSprite?.material) g.labelSprite.material.opacity = 1
      }
    }

    // Shooting (raycast from camera center)
    const raycaster = new THREE.Raycaster()
    const aim = new THREE.Vector2(0, 0)
    const shootables = [outsideGround, platform, defenseLine].concat(
      scene.children.filter((o: any) => typeof o?.name === "string" && o.name.startsWith("tower")),
    )

    const effects: { obj: any; expiresAtMs: number; update?: (now: number) => void }[] = []

    startWave(1, null)

    const arrowShaftGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8)
    const arrowHeadGeo = new THREE.ConeGeometry(0.09, 0.28, 10)
    const arrowFeatherGeo = new THREE.BoxGeometry(0.22, 0.035, 0.1)
    const arrowShaftMat = new THREE.MeshBasicMaterial({ color: 0x6f4322 })
    const arrowHeadMat = new THREE.MeshBasicMaterial({ color: 0xc99337 })
    const arrowFeatherMat = new THREE.MeshBasicMaterial({ color: 0xb31f17 })
    const arrowTrailMat = new THREE.LineBasicMaterial({
      color: 0xffd98a,
      transparent: true,
      opacity: 0.55,
    })

    const spawnArrowShot = (from: any, to: any) => {
      const direction = to.clone().sub(from)
      const distance = direction.length()
      if (distance <= 0.001) return
      direction.normalize()

      const arrow = new THREE.Group()
      arrow.name = "visible-arrow-shot"
      arrow.position.copy(from)
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)

      const shaft = new THREE.Mesh(arrowShaftGeo, arrowShaftMat)
      shaft.name = "arrow-shaft"
      arrow.add(shaft)

      const head = new THREE.Mesh(arrowHeadGeo, arrowHeadMat)
      head.name = "arrow-head"
      head.position.y = 0.84
      arrow.add(head)

      const featherA = new THREE.Mesh(arrowFeatherGeo, arrowFeatherMat)
      featherA.name = "arrow-feather-a"
      featherA.position.y = -0.62
      arrow.add(featherA)

      const featherB = new THREE.Mesh(arrowFeatherGeo, arrowFeatherMat)
      featherB.name = "arrow-feather-b"
      featherB.position.y = -0.62
      featherB.rotation.y = Math.PI / 2
      arrow.add(featherB)

      const trailGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -1.45, 0),
        new THREE.Vector3(0, -0.25, 0),
      ])
      const trail = new THREE.Line(trailGeo, arrowTrailMat)
      trail.name = "arrow-glowing-trail"
      arrow.add(trail)

      scene.add(arrow)
      const startedAtMs = gameTime
      const durationMs = 260
      effects.push({
        obj: arrow,
        expiresAtMs: startedAtMs + durationMs,
        update: (now) => {
          const t = Math.min(1, (now - startedAtMs) / durationMs)
          const eased = 1 - Math.pow(1 - t, 3)
          arrow.position.copy(from).lerp(to, eased)
        },
      })
    }

    const spawnHitFlash = (point: any) => {
      const mat = new THREE.SpriteMaterial({
        color: 0xffd98a,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
      const s = new THREE.Sprite(mat)
      s.name = "hit-flash"
      s.position.copy(point)
      s.scale.set(0.55, 0.55, 1)
      scene.add(s)
      effects.push({ obj: s, expiresAtMs: gameTime + 140 })
    }

    let recoilUntilMs = 0

    const shoot = () => {
      if (cannonMounted) { fireCannon(); return }
      const shotTime = performance.now()
      const shotStats = stats()
      if (pausedRef.current || document.hidden || phase.mode !== "PLAYING_WAVE" || shotTime - lastShotAt < shotStats.interval) return
      lastShotAt = shotTime
      shots++
      camera.updateMatrixWorld(true)
      raycaster.setFromCamera(aim, camera)
      const enemyMeshes = enemies.map((e) => e.mesh)
      const hits = raycaster.intersectObjects(enemyMeshes.concat(shootables), false)
      let hit = hits[0]
      let enemy = hit ? enemies.find((e) => e.mesh === hit.object) : undefined
      if (!enemy) {
        const assisted = assistedEnemy(raycaster.ray, enemies, hit?.distance ?? Infinity)
        if (assisted) { enemy = assisted; hit = { object: assisted.mesh, point: assisted.mesh.position.clone() } as any }
      }
      const from = camera.localToWorld(new THREE.Vector3(0, -0.24, -1.2))
      const to = hit ? hit.point.clone() : raycaster.ray.at(80, new THREE.Vector3())
      spawnArrowShot(from, to)
      playSound("bow")
      recoilUntilMs = gameTime + 100
      if (reticleRef.current) reticleRef.current.style.color = enemy ? "#ffffff" : "#ffd98a"
      if (hit) { spawnHitFlash(hit.point); playSound("hit") }
      if (enemy) {
        hitCount++
        awardHit()
        damageEnemy(enemy, shotStats.damage)
      } else combo = 0
      publishStatus()
    }

    const leaveCannon = () => {
      if (!cannonMounted) return
      cannonMounted = false
      cannonExitAt = 0
      camera.position.copy(cannonReturnPosition)
      bow.visible = true
      firing = false
    }

    const toggleCannon = () => {
      if (pausedRef.current || document.hidden || phase.mode !== "PLAYING_WAVE") return
      if (cannonMounted) leaveCannon()
      else if (charge >= 100) {
        cannonReturnPosition.copy(camera.position)
        cannonMounted = true
        bow.visible = false
        camera.position.set(fortressCannon.cannon.position.x, playerHeightY + 1.2, 3.7)
        camera.lookAt(fortressCannon.cannon.position.x, 1.5, -56)
        yaw = camera.rotation.y
        pitch = camera.rotation.x
        updateAim(window.innerWidth / 2, window.innerHeight / 2)
        firing = false
      }
      publishStatus()
    }

    const fireCannon = () => {
      if (pausedRef.current || document.hidden || !cannonMounted || charge < 100 || phase.mode !== "PLAYING_WAVE") return
      charge = 0
      cannonFiredAt = gameTime
      cannonExitAt = gameTime + 1000
      firing = false
      camera.updateMatrixWorld(true)
      raycaster.setFromCamera(aim, camera)
      const hit = raycaster.intersectObjects(enemies.map(e => e.mesh).concat(shootables), false)[0]
      const point = hit ? hit.point.clone() : raycaster.ray.at(65, new THREE.Vector3())
      point.y = Math.max(0.4, Math.min(5, point.y))
      fortressCannon.update(point, false, 0)
      const from = fortressCannon.muzzle.getWorldPosition(new THREE.Vector3())
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffad4f }))
      shell.name = "cannonball-in-flight"
      shell.position.copy(from)
      scene.add(shell)
      spawnHitFlash(from)
      const born = gameTime, duration = 650
      effects.push({ obj: shell, expiresAtMs: born + duration, update: now => {
        const t = Math.min(1, (now - born) / duration)
        shell.position.copy(from).lerp(point, t)
        shell.position.y += Math.sin(t * Math.PI) * 3
      } })
      for (let i = 0; i < 5; i++) {
        const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0xb2a291, transparent: true, opacity: 0.5, depthWrite: false }))
        smoke.position.copy(from)
        scene.add(smoke)
        effects.push({ obj: smoke, expiresAtMs: born + 950, update: now => {
          const t = (now - born) / 950
          smoke.position.copy(from).add(new THREE.Vector3(Math.sin(i * 2) * t, t * (1.5 + i * 0.2), -t * i))
          smoke.scale.setScalar(1 + t * 3)
          smoke.material.opacity = 0.5 * (1 - t)
        } })
      }
      pendingShells.push({ point, landsAt: born + duration, damage: cannonDamage })
      playSound("cannon")
      publishStatus()
    }

    const detonateShells = () => {
      for (let i = pendingShells.length - 1; i >= 0; i--) {
        const shell = pendingShells[i]
        if (gameTime < shell.landsAt) continue
        pendingShells.splice(i, 1)
        resolvingCannon = true
        for (const enemy of [...enemies]) {
          const distance = Math.hypot(enemy.mesh.position.x - shell.point.x, enemy.mesh.position.z - shell.point.z)
          if (distance <= 14) damageEnemy(enemy, shell.damage * (1 - 0.5 * distance / 14), true)
        }
        resolvingCannon = false
        const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xff8b35, transparent: true, opacity: 0.55, depthWrite: false }))
        blast.name = "cannon-impact-blast"
        blast.position.copy(shell.point)
        scene.add(blast)
        const born = gameTime
        effects.push({ obj: blast, expiresAtMs: born + 700, update: now => {
          const t = (now - born) / 700
          blast.scale.setScalar(1 + t * 13)
          blast.material.opacity = 0.55 * (1 - t)
        } })
        playSound("enemyDeath")
        publishStatus()
        if (phase.mode !== "PLAYING_WAVE") break
      }
    }

    const selectGate = (gate: Gate, now: number) => {
      highlightedGate = gate.type
      gateHighlightUntilMs = now + 250
      playSound("gateSelect")
      liveRef.current.onGateSelected?.(gate.type)

      // Begin next wave immediately after selection
      startWave(waveNumber + 1, gate.type)
    }

    const trySelectGateAtScreen = (clientX: number, clientY: number) => {
      if (phase.mode !== "GATE_SELECTION") return false
      const x = (clientX / window.innerWidth) * 2 - 1
      const y = -(clientY / window.innerHeight) * 2 + 1
      const screen = new THREE.Vector2(x, y)
      const hitAreas = gates.map((g) => g.hitArea).filter(Boolean)
      if (hitAreas.length === 0) return false
      raycaster.setFromCamera(screen, camera)
      const hits = raycaster.intersectObjects(hitAreas as any, true)
      const hit = hits[0]
      if (!hit) return false
      const picked = gates.find((g) => g.hitArea === hit.object || g.hitArea === hit.object.parent)
      if (!picked) return false
      selectGate(picked, performance.now())
      return true
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

    // Touch controls (mobile):
    // - Left thumb: movement joystick
    // - Right thumb: look around
    type TouchState = {
      id: number
      startX: number
      startY: number
      x: number
      y: number
      side: "left" | "right"
      startAtMs: number
      movedPx: number
    }
    const touches = new Map<number, TouchState>()
    let joyX = 0
    let joyY = 0
    const isCoarsePointer = () => {
      try {
        return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches
      } catch {
        return false
      }
    }

    let looking = false
    let leftPress: { x: number; y: number; lastX: number; lastY: number; at: number; dragging: boolean; held: boolean } | null = null
    const updateAim = (clientX: number, clientY: number) => {
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return
      const point = pointerAim(clientX, clientY, window.innerWidth, window.innerHeight)
      aim.set(point.x, point.y)
      if (reticleRef.current) {
        reticleRef.current.style.left = `${(point.x + 1) * 50}%`
        reticleRef.current.style.top = `${(1 - point.y) * 50}%`
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (pausedRef.current || phase.mode !== "PLAYING_WAVE") return
      if (e.button === 2) { e.preventDefault(); looking = true; return }
      if (e.button !== 0) return
      e.preventDefault()

      updateAim(e.clientX, e.clientY)
      const x = Number.isFinite(e.clientX) ? e.clientX : window.innerWidth / 2
      const y = Number.isFinite(e.clientY) ? e.clientY : window.innerHeight / 2
      leftPress = { x, y, lastX: x, lastY: y, at: performance.now(), dragging: false, held: false }
    }
    const releaseFire = () => {
      if (leftPress && !leftPress.dragging && !leftPress.held) shoot()
      leftPress = null
      firing = false
      looking = false
    }
    const preventContextMenu = (e: Event) => e.preventDefault()
    const clearInput = () => { keys.clear(); touches.clear(); joyX = joyY = 0; leftPress = null; firing = false; looking = false; interactPressed = false }
    const pauseOnBlur = () => { clearInput(); liveRef.current.onControlChange?.(false) }

    const onMouseMove = (e: MouseEvent) => {
      if (pausedRef.current) return
      if (e.target && e.target !== canvas && !looking && !leftPress) return
      if (leftPress && Math.hypot(e.clientX - leftPress.x, e.clientY - leftPress.y) > 6) {
        leftPress.dragging = true
        firing = false
      }
      if (looking || leftPress?.dragging) {
        const dx = leftPress ? e.clientX - leftPress.lastX : e.movementX
        const dy = leftPress ? e.clientY - leftPress.lastY : e.movementY
        yaw -= dx * mouseSensitivity
        pitch -= dy * mouseSensitivity
        pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch))
        if (cannonMounted) { yaw = Math.max(-1.1, Math.min(1.1, yaw)); pitch = Math.max(-0.7, Math.min(0.2, pitch)) }
        camera.rotation.set(pitch, yaw, 0, "YXZ")
        updateAim(window.innerWidth / 2, window.innerHeight / 2)
      } else {
        updateAim(e.clientX, e.clientY)
      }
      if (leftPress) { leftPress.lastX = e.clientX; leftPress.lastY = e.clientY }
    }

    const updateJoystick = () => {
      // Use the active left touch (if any)
      const left = Array.from(touches.values()).find((t) => t.side === "left")
      if (!left) {
        joyX = 0
        joyY = 0
        return
      }
      const dx = left.x - left.startX
      const dy = left.y - left.startY
      const max = 60
      joyX = Math.max(-1, Math.min(1, dx / max))
      joyY = Math.max(-1, Math.min(1, dy / max))
    }

    const onTouchStart = (e: TouchEvent) => {
      if (pausedRef.current || phase.mode !== "PLAYING_WAVE") return
      updateAim(window.innerWidth / 2, window.innerHeight / 2)
      for (const t of Array.from(e.changedTouches)) {
        const side: TouchState["side"] = t.clientX < window.innerWidth / 2 ? "left" : "right"
        touches.set(t.identifier, {
          id: t.identifier,
          startX: t.clientX,
          startY: t.clientY,
          x: t.clientX,
          y: t.clientY,
          side,
          startAtMs: performance.now(),
          movedPx: 0,
        })
      }
      updateJoystick()
    }

    const onTouchMove = (e: TouchEvent) => {
      if (pausedRef.current) return
      const lookSensitivity = 0.004
      for (const t of Array.from(e.changedTouches)) {
        const st = touches.get(t.identifier)
        if (!st) continue
        const dx = t.clientX - st.x
        const dy = t.clientY - st.y
        st.x = t.clientX
        st.y = t.clientY
        st.movedPx += Math.hypot(dx, dy)

        if (st.side === "right") {
          // Look even without pointer lock on mobile.
          yaw -= dx * lookSensitivity
          pitch -= dy * lookSensitivity
          pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch))
          camera.rotation.set(pitch, yaw, 0, "YXZ")
        }
      }
      updateJoystick()
      // Prevent page scroll/zoom while touching game.
      e.preventDefault()
    }

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const st = touches.get(t.identifier)
        touches.delete(t.identifier)
        if (!st) continue

        const dt = performance.now() - st.startAtMs
        const isTap = dt < 250 && st.movedPx < 12
        if (!isTap) continue

        // In gate selection, allow tapping a gate to select it (mobile-friendly).
        if (phase.mode === "GATE_SELECTION") {
          const selected = trySelectGateAtScreen(st.x, st.y)
          if (selected) continue
        }

        // Otherwise, quick tap on the right side shoots.
        if (st.side === "right") shoot()
      }
      updateJoystick()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (pausedRef.current || document.hidden) return
      if (e.code === "Space") { e.preventDefault(); return }
      if (e.code === "KeyE" && phase.mode === "PLAYING_WAVE") { if (!e.repeat) toggleCannon(); return }
      if (e.code === "Digit1" || e.code === "Digit2") { if (!e.repeat) equipWeapon(e.code === "Digit1" ? "crossbow" : "repeater"); return }
      keys.add(e.code)
      if (e.code === "KeyE") {
        interactPressed = true
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
    }

    canvas.addEventListener("mousedown", onMouseDown)
    canvas.addEventListener("contextmenu", preventContextMenu)
    window.addEventListener("mouseup", releaseFire)
    window.addEventListener("blur", pauseOnBlur)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    canvas.addEventListener("touchstart", onTouchStart, { passive: false })
    canvas.addEventListener("touchmove", onTouchMove, { passive: false })
    canvas.addEventListener("touchend", onTouchEnd)
    canvas.addEventListener("touchcancel", onTouchEnd)

    const resize = () => {
      const { innerWidth: width, innerHeight: height, devicePixelRatio } = window

      camera.aspect = width / height
      camera.updateProjectionMatrix()

      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25))
      renderer.setSize(width, height, false)
    }

    resize()
    window.addEventListener("resize", resize)

    let rafId = 0
    let lastT = performance.now()
    const resetFrameClock = () => { lastT = performance.now() }
    document.addEventListener("visibilitychange", resetFrameClock)
    let lastPausedRenderAt = -Infinity
    let walkedDistance = 0, walkingBlend = 0
    const render = () => {
      rafId = window.requestAnimationFrame(render)

      const realNow = performance.now()
      const frameMs = Math.max(0, realNow - lastT)
      const dt = Math.min(frameMs / 1000, 0.05)
      lastT = realNow
      const command = commandRef.current
      if (command && command.id !== processedCommand) {
        processedCommand = command.id
        if (command.type === "advance" && phase.mode === "GATE_SELECTION") {
          applyUpgrade(command.upgrade)
          liveRef.current.onGateSelected?.(command.trial)
          startWave(waveNumber + 1, command.trial)
        } else if (command.type === "cannon") toggleCannon()
        else if (command.type === "weapon") equipWeapon(command.weapon)
      }

      if (portalRedirectUrlRef.current && !portalRedirecting) {
        portalRedirecting = true
        portalEnterStartedAtMs = gameTime
        portalRedirectAtMs = gameTime + 500
        portalTargetUrl = portalRedirectUrlRef.current
        portalRedirectUrlRef.current = null
      }
      if (reticleRef.current) {
        reticleRef.current.style.opacity = pausedRef.current ? "0" : "1"
        reticleRef.current.style.color = gameTime < hitUntil ? "#ffffff" : "#ffd98a"
      }
      if (pausedRef.current || document.hidden) {
        clearInput()
        if (!document.hidden && realNow - lastPausedRenderAt >= 250) {
          renderer.render(scene, camera)
          lastPausedRenderAt = realNow
        }
        return
      }
      if (phase.mode !== "PLAYING_WAVE" && overdriveUntil > gameTime) overdriveUntil += dt * 1000
      gameTime += dt * 1000
      const now = gameTime
      detonateShells()
      if (cannonExitAt && now >= cannonExitAt) { leaveCannon(); publishStatus() }
      // The celebration lasts three real, unpaused seconds even at a low frame rate.
      if (phase.mode === "WAVE_CLEAR") phase.remainingMs -= frameMs
      if (phase.mode === "WAVE_CLEAR" && phase.remainingMs <= 0) {
        phase = { mode: "GATE_SELECTION" }
        clearInput()
        setGatesVisible(true)
        publishStatus()
      }
      if (resetWaveView) {
        camera.lookAt(0, 1.5, -wavePlan(waveNumber, activeModifier).spawnDistance)
        yaw = camera.rotation.y
        pitch = camera.rotation.x
        resetWaveView = false
      }
      worldScenery.update(now)
      windUniform.value = now * 0.0015
      const moteArray = moteGeometry.attributes.position.array as Float32Array
      for (let i = 0; i < 160; i++) {
        moteArray[i * 3 + 1] += dt * (waveNumber >= 4 && waveNumber <= 6 ? 1.3 : 0.3)
        moteArray[i * 3] += Math.sin(now * 0.0006 + i) * dt * 0.25
        if (moteArray[i * 3 + 1] > 24) moteArray[i * 3 + 1] = 0
      }
      moteGeometry.attributes.position.needsUpdate = true
      if (leftPress && !leftPress.dragging && !leftPress.held && realNow - leftPress.at >= 180) {
        leftPress.held = true
        firing = true
      }
      if (firing) shoot()
      if (now - lastStatusAt > 80) { lastStatusAt = now; publishStatus() }

      // Direction vectors from yaw (keep movement on the XZ plane)
      forward.set(0, 0, -1).applyAxisAngle(worldUp, yaw).normalize()
      right.copy(forward).cross(up).normalize()

      move.set(0, 0, 0)
      if (keys.has("KeyW") || keys.has("ArrowUp")) move.add(forward)
      if (keys.has("KeyS") || keys.has("ArrowDown")) move.sub(forward)
      if (keys.has("KeyD") || keys.has("ArrowRight")) move.add(right)
      if (keys.has("KeyA") || keys.has("ArrowLeft")) move.sub(right)
      // Mobile joystick movement (coarse pointer only)
      if (isCoarsePointer()) {
        // joyY: down is +1; forward is -Z, so subtract joyY
        move.add(forward.clone().multiplyScalar(-joyY))
        move.add(right.clone().multiplyScalar(joyX))
      }
      if (move.lengthSq() > 0) move.normalize()
      if (cannonMounted || phase.mode !== "PLAYING_WAVE") move.set(0, 0, 0)

      // Move + clamp (can't go outside platform / fall off edges)
      const halfW = platformWidth / 2 - 1.2
      const halfD = platformDepth / 2 - 1.2

      const nextX = camera.position.x + move.x * moveSpeed * dt
      const nextZ = camera.position.z + move.z * moveSpeed * dt
      const previousX = camera.position.x, previousZ = camera.position.z
      camera.position.x = Math.max(-halfW, Math.min(halfW, nextX))
      camera.position.z = Math.max(platformZ - halfD, Math.min(platformZ + halfD, nextZ))
      const distanceMoved = Math.hypot(camera.position.x - previousX, camera.position.z - previousZ)
      const walkingSpeed = distanceMoved / Math.max(0.001, dt)
      walkedDistance += distanceMoved
      walkingBlend += ((walkingSpeed > 0.05 ? 1 : 0) - walkingBlend) * (1 - Math.exp(-dt * 12))
      camera.position.y = cannonMounted ? playerHeightY + 1.2 : playerFloorY + Math.cos(walkedDistance * 3.8) * 0.008 * walkingBlend

      // Enemy updates (move toward wall; once reached, deal DOT)
      const playerPos = camera.position
      const guardian = enemies.find(enemy => enemy.boss)
      if (guardian && waveNumber >= 6 && now >= reinforcementsAt && reinforcementCount < 3) {
        reinforcementCount++
        reinforcementsAt = now + 14000
        spawnEnemy(`guardian-spirit-${reinforcementCount}`, guardian.mesh.position.x + (reinforcementCount % 2 ? 5 : -5), Math.min(-8, guardian.mesh.position.z - 8), wavePlan(waveNumber, activeModifier).speed, 5, 1 + waveNumber / 6, "spirit")
        waveTotal++
      }
      for (const e of enemies) {
        const wallZ = platformZ - platformDepth / 2
        if (!e.breached && now >= waveGraceUntil) {
          const dz = wallZ - e.mesh.position.z
          if (dz <= 0.15) {
            e.breached = true
            e.mesh.position.z = wallZ - 1.4
            e.mesh.position.x = e.targetX
            e.baseY = platformTopY + (e.boss ? 2 : 0.7)
            e.lastDamageAtMs = now
          } else {
            const surge = e.boss && waveNumber >= 12 && Math.floor((now - waveStartedAt) / 5000) % 2 === 1 ? 1.8 : 1
            e.mesh.position.z += Math.min(dz, e.speed * dt * surge)
            e.mesh.position.x += (e.targetX - e.mesh.position.x) * Math.min(1, dt * 0.18)
          }
        } else if (e.breached) {
          const tickMs = 900
          if (now - e.lastDamageAtMs > tickMs) {
            e.lastDamageAtMs = now
            liveRef.current.onPlayerHit?.(e.breachDamage * armor)
            hurtUntil = now + 250
            combo = 0
          }
        }

        // Slight floating animation
        const floatAmp = 0.18
        const floatSpeed = 2.2
        e.mesh.position.y = e.baseY + Math.sin(now * 0.001 * floatSpeed + e.floatPhase) * floatAmp
        e.healthBar.position.set(e.mesh.position.x, e.mesh.position.y + (e.boss ? 5 : 2.1), e.mesh.position.z)
        e.healthBar.visible = e.boss || e.health < e.maxHealth
        e.healthBar.scale.x = (e.boss ? 5 : 2.4) * Math.max(0, e.health / e.maxHealth)
        if (e.kind === "spirit" && !e.breached) e.mesh.position.x += Math.sin(now * 0.002 + e.floatPhase) * dt * 1.8
        if (e.boss && waveNumber === 3) e.mesh.material.color.set(Math.floor((now - waveStartedAt) / 4000) % 2 === 0 ? 0x8fc6e8 : 0xffb46b)
      }

      // Cleanup transient effects
      for (let i = effects.length - 1; i >= 0; i--) {
        const fx = effects[i]
        fx.update?.(now)
        if (now < fx.expiresAtMs) continue
        scene.remove(fx.obj)
        if (fx.obj instanceof THREE.Group) {
          // Arrow geometry and materials are shared and disposed on unmount.
          fx.obj.traverse((child: any) => { if (child instanceof THREE.Line) child.geometry.dispose() })
        } else if (fx.obj instanceof THREE.Mesh) {
          fx.obj.geometry.dispose()
          fx.obj.material.dispose()
        } else if (fx.obj instanceof THREE.Line) {
          fx.obj.geometry.dispose()
          fx.obj.material.dispose()
        } else if (fx.obj instanceof THREE.Sprite) {
          fx.obj.material.map?.dispose()
          fx.obj.material.dispose()
        }
        effects.splice(i, 1)
      }

      scene.traverse((obj: any) => {
        if (obj.name?.startsWith?.("cloud-") && obj.userData.speed) {
          obj.position.x += obj.userData.speed * dt * 6
          if (obj.position.x > 180) obj.position.x = -180
        }
      })

      // Dynamic environment: day→night transition from wave 10
      const targetNight = isNightMode() ? 1 : 0
      if (targetNight > nightTransition) {
        nightTransition = Math.min(1, nightTransition + nightTransitionSpeed)
      } else if (targetNight < nightTransition) {
        nightTransition = Math.max(0, nightTransition - nightTransitionSpeed * 0.5)
      }

      // Blend fog and background colors
      const fogBlend = daySceneFog.clone().lerp(nightSceneFog, nightTransition)
      scene.fog.color.copy(fogBlend)
      const bgBlend = dayBg.clone().lerp(nightBg, nightTransition)
      scene.background = bgBlend

      // Dim lights at night
      ambientLight.intensity = 0.48 * (1 - nightTransition * 0.55)
      directionalLight.intensity = 1.15 * (1 - nightTransition * 0.65)
      hemi.intensity = 0.45 * (1 - nightTransition * 0.5)

      // Rain system
      if (nightTransition > 0.15) {
        rainSystem.visible = true
        rainMat.opacity = Math.max(0, (nightTransition - 0.15) * 0.42)
        const positions = rainGeo.attributes.position.array as Float32Array
        for (let i = 0; i < rainCount; i++) {
          positions[i * 3 + 1] -= rainVelocities[i] * dt * 55
          positions[i * 3] -= dt * 3 // wind drift
          if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 40 + Math.random() * 5
            positions[i * 3] = (Math.random() - 0.5) * 120 + camera.position.x
            positions[i * 3 + 2] = (Math.random() - 0.5) * 120 + camera.position.z - 20
          }
        }
        rainGeo.attributes.position.needsUpdate = true
      } else {
        rainSystem.visible = false
      }

      // Lightning flashes
      if (nightTransition > 0.3 && now > nextLightningAt) {
        lightningFlash = 1
        nextLightningAt = now + 6000 + Math.random() * 15000
      }
      if (lightningFlash > 0) {
        lightningFlash -= dt * 3.5
        const flashIntensity = Math.max(0, lightningFlash)
        directionalLight.intensity = 1.15 * (1 - nightTransition * 0.65) + flashIntensity * 2.5
        ambientLight.intensity = 0.48 * (1 - nightTransition * 0.55) + flashIntensity * 0.8
      }

      for (const gate of gates) {
        gate.mesh.lookAt(camera.position.x, gate.mesh.position.y, camera.position.z)
      }

      const { nearestGate, nearestDistance } = getNearestGate()
      const nearestGateInRange =
        phase.mode === "GATE_SELECTION" &&
        nearestGate !== null &&
        nearestDistance <= interactionDistance

      // The cannon panel and gate hall provide their own interaction instructions.
      setInteractionHint("")

      // Recoil moves the weapon only; it must never kick the player's aim.
      camera.rotation.set(pitch, yaw, 0, "YXZ")
      camera.updateMatrixWorld(true)
      raycaster.setFromCamera(cannonMounted ? aim : new THREE.Vector2(0, 0), camera)
      const cannonTarget = cannonMounted ? raycaster.ray.at(65, new THREE.Vector3()) : new THREE.Vector3(-3.8, 1.5, -56)
      fortressCannon.update(cannonTarget, charge >= 100, Math.max(0, 1 - (now - cannonFiredAt) / 500))
      updatePose({ time: now, dt, speed: walkingSpeed, aimX: aim.x, aimY: aim.y, aspect: camera.aspect, recoil: now < recoilUntilMs ? Math.sin((1 - (recoilUntilMs - now) / 100) * Math.PI) : 0 })

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
        if (nearestGateInRange && nearestGate) {
          selectGate(nearestGate, now)
        }
      }

      // Vibe Jam portal collision checks (very cheap).
      if (!portalRedirecting) {
        // Confirmed redirect from parent (dialog)
        const confirmedUrl = portalRedirectUrlRef.current
        if (confirmedUrl) {
          portalRedirecting = true
          portalEnterStartedAtMs = now
          portalRedirectAtMs = now + 500
          portalFade = 0
          portalTargetUrl = confirmedUrl
          portalRedirectUrlRef.current = null
          setInteractionHint("Entering portal...")
        } else if (now < portalArmedAtMs) {
          // Not armed yet.
        } else {
          const p = camera.position
          const inExitZone = horizontalDistanceTo(p, exitPortal.position) <= portalTriggerRadius
          let inReturnZone = false
          if (returnPortal) {
            const returnUrl = buildReturnPortalUrl()
            if (returnUrl) {
              inReturnZone = horizontalDistanceTo(p, returnPortal.position) <= portalTriggerRadius
            }
          }

          // Reset prompt flag when player leaves all portal zones
          if (!inExitZone && !inReturnZone) {
            portalPromptShown = false
          }

          if (inExitZone && !portalPromptShown) {
            portalPromptShown = true
            const target = buildExitPortalUrl()
            if (portalCallbackRef.current) {
              portalCallbackRef.current(target)
            } else {
              portalRedirecting = true
              portalEnterStartedAtMs = now
              portalRedirectAtMs = now + (300 + Math.random() * 500)
              portalFade = 0
              portalTargetUrl = target
              setInteractionHint("Entering portal...")
            }
          }

          if (inReturnZone && !portalPromptShown) {
            portalPromptShown = true
            const returnUrl = buildReturnPortalUrl()
            if (returnUrl) {
              if (portalCallbackRef.current) {
                portalCallbackRef.current(returnUrl)
              } else {
                portalRedirecting = true
                portalEnterStartedAtMs = now
                portalRedirectAtMs = now + (250 + Math.random() * 450)
                portalFade = 0
                portalTargetUrl = returnUrl
                setInteractionHint("Returning...")
              }
            }
          }
        }
      }

      // Portal entering effect + delayed redirect (once).
      if (portalRedirecting && portalRedirectAtMs > 0) {
        const t = Math.min(1, Math.max(0, (now - portalEnterStartedAtMs) / Math.max(1, portalRedirectAtMs - portalEnterStartedAtMs)))
        // Quick ease-in
        portalFade = Math.max(portalFade, 0.15 + 0.85 * (1 - Math.pow(1 - t, 3)))
        const mat: any = portalFadePlane.material
        mat.opacity = Math.min(0.92, portalFade)
        // Keep overlay in front of camera
        portalFadePlane.position.copy(camera.position).add(forward.clone().multiplyScalar(-0.65))
        portalFadePlane.quaternion.copy(camera.quaternion)

        if (now >= portalRedirectAtMs) {
          const target = portalTargetUrl
          if (target) {
            // Extra safety: don't redirect to the exact current URL.
            if (target !== window.location.href) {
              window.location.assign(target)
              return
            }
          }
          // If we couldn't redirect (invalid/loop), just cancel the transition.
          portalRedirecting = false
          portalRedirectAtMs = 0
          portalTargetUrl = null
          setInteractionHint("")
        }
      } else {
        ;(portalFadePlane.material as any).opacity = 0
      }
      renderer.render(scene, camera)
    }
    render()

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mouseup", releaseFire)
      window.removeEventListener("blur", pauseOnBlur)
      canvas.removeEventListener("mousedown", onMouseDown)
      canvas.removeEventListener("contextmenu", preventContextMenu)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("visibilitychange", resetFrameClock)
      window.removeEventListener("keyup", onKeyUp)
      canvas.removeEventListener("touchstart", onTouchStart as any)
      canvas.removeEventListener("touchmove", onTouchMove as any)
      canvas.removeEventListener("touchend", onTouchEnd as any)
      canvas.removeEventListener("touchcancel", onTouchEnd as any)

      clearEnemies()

        ; (Object.values(gateTextures) as any[]).forEach((t) => t.dispose?.())
      enemyCatalog.forEach((entry) => entry.texture.dispose?.())

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
        if (obj instanceof THREE.Line) { obj.geometry.dispose(); obj.material.dispose() }
      })
      renderer.dispose()
      directionalLight.shadow.dispose()
      for (const geometry of [arrowShaftGeo, arrowHeadGeo, arrowFeatherGeo]) geometry.dispose()
      for (const material of [arrowShaftMat, arrowHeadMat, arrowFeatherMat, arrowTrailMat]) material.dispose()
      rainGeo.dispose()
      rainMat.dispose()
      moteGeometry.dispose()
      moteMaterial.dispose()
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [])

  return (
    <><canvas
      ref={canvasRef}
      aria-label="Erebuni battlefield. Click enemies to shoot, hold still to keep firing, left-drag to look around, WASD to move. At full loading progress, press E to mount the fortress cannon, then click a target."
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        display: "block",
        touchAction: "none",
        cursor: "none",
      }}
    /><svg ref={reticleRef} aria-hidden="true" viewBox="0 0 24 24" style={{ position: "fixed", left: "50%", top: "50%", width: 26, height: 26, transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 15, color: "#ffd98a", filter: "drop-shadow(0 1px 2px #000)" }} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M12 2v5m0 10v5M2 12h5m10 0h5" /></svg></>
  )
}

