// Run with: node --test tests/expedition.cjs
// Exercise the actual Three.js scene and collisions without requiring a GPU.
const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const ts = require("typescript")
const THREE = require("three")
const path = require("node:path")
const root = path.join(__dirname, "..")

function compile(file, globals = {}, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText
  const exports = {}
  vm.runInNewContext(source, { exports, require: name => imports[name] ?? require(name), console: { log() {}, warn() {} }, URL, URLSearchParams, ...globals }, { filename: file })
  return exports
}

function storage() {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}

function compileScenery() {
  return compile("lib/world-scenery.ts", {}, { "./batch-scenery": compile("lib/batch-scenery.ts") })
}

test("campaign boundaries, trials, and bounded endless progression", () => {
  const { regionForWave, wavePlan, upgradeChoices, UPGRADES } = compile("lib/expedition.ts")
  assert.equal(regionForWave(1).name, "The Ararat Plains")
  assert.equal(regionForWave(3).name, "The Ararat Plains")
  assert.equal(regionForWave(4).name, "The Ember Necropolis")
  assert.equal(regionForWave(7).name, "The Crystal Sanctum")
  assert.equal(regionForWave(10).name, "The Storm Citadel")
  assert.equal(regionForWave(999).name, "The Storm Citadel")
  for (let wave = 1; wave <= 100; wave++) {
    const normal = wavePlan(wave, null), fire = wavePlan(wave, "fire"), shadow = wavePlan(wave, "shadow"), storm = wavePlan(wave, "storm")
    assert.ok(fire.count < normal.count && fire.speed > normal.speed)
    assert.ok(shadow.count > normal.count && shadow.health < normal.health)
    assert.ok(storm.speed < normal.speed)
    assert.equal(normal.bossHealth > 0, wave % 3 === 0)
    assert.ok(normal.count <= 32 && normal.speed <= 6)
    const choices = upgradeChoices(wave)
    assert.equal(new Set(choices).size, 3)
    assert.ok(choices.includes("repair"))
    assert.ok(choices.every(id => UPGRADES[id]))
  }
})

test("personal records survive reload and tolerate unavailable or corrupt storage", () => {
  const localStorage = storage()
  let model = compile("lib/expedition.ts", { localStorage })
  assert.equal(model.readRecord().wave, 0)
  model.saveRecord(6, 30, 8)
  model = compile("lib/expedition.ts", { localStorage })
  assert.equal(model.readRecord().wave, 6)
  model.saveRecord(2, 4, 2)
  assert.deepEqual(JSON.parse(JSON.stringify(model.readRecord())), { runs: 2, wave: 6, kills: 30, combo: 8 })
  localStorage.setItem("erebuni-record-v1", '{"wave":-1}')
  assert.equal(model.readRecord().wave, 0)
  localStorage.setItem("erebuni-record-v1", "broken")
  assert.equal(model.readRecord().wave, 0)
  model = compile("lib/expedition.ts", { localStorage: { getItem() { throw Error("disabled") }, setItem() { throw Error("disabled") } } })
  assert.equal(model.saveRecord(3, 9, 2).wave, 3)
})

test("outdoor scenery has real depth, stable terrain, and animated cloth", () => {
  const world = compileScenery()
  for (let x = -40; x <= 40; x += 5) for (let z = -75; z <= 0; z += 5) assert.equal(world.terrainHeight(x, z), 0, "the combat lane must remain level")
  assert.ok(world.terrainHeight(100, -120) > 1)
  const terrain = world.makeTerrainGeometry()
  assert.ok(terrain.attributes.position.count > 6000)
  assert.ok(terrain.attributes.color)
  const scene = new THREE.Scene()
  const scenery = world.buildWorldScenery(scene, () => 0.5)
  const peaks = [], flags = []
  let drawObjects = 0
  scene.traverse(object => {
    if (object.isMesh) drawObjects++
    if (object.name === "ararat-sculpted-peak") peaks.push(object)
    if (object.geometry?.type === "PlaneGeometry" && object.geometry.parameters.height === 3) flags.push(object)
    if (object.geometry?.attributes.position) assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite))
  })
  assert.equal(peaks.length, 2)
  assert.ok(drawObjects < 60, `static world should be batched, found ${drawObjects} mesh draws`)
  for (const peak of peaks) {
    peak.geometry.computeBoundingBox()
    const depth = peak.geometry.boundingBox.max.z - peak.geometry.boundingBox.min.z
    assert.ok(depth > 50, "mountains must be volumetric meshes")
  }
  assert.equal(flags.length, 6)
  const before = [...flags[0].geometry.attributes.position.array]
  scenery.update(1234)
  assert.notDeepEqual([...flags[0].geometry.attributes.position.array], before)
  for (let region = 0; region < 4; region++) scenery.setRegion(region)
})

test("crossbow is centered and its bolt points forward, away from the camera", () => {
  const { crossbow, bolt } = compile("lib/crossbow.ts").createCrossbow()
  const bounds = new THREE.Box3().setFromObject(crossbow.getObjectByName("crossbow-weapon"))
  assert.ok(Math.abs((bounds.min.x + bounds.max.x) / 2) < 0.001)
  assert.equal(crossbow.position.x, 0)
  assert.ok(bounds.max.x - bounds.min.x < 0.6, "weapon must fit comfortably on narrow screens")
  const tip = bolt.children[1]
  const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(tip.quaternion)
  assert.ok(direction.z < -0.99, "bolt tip must point down -Z, toward the battlefield")
  assert.ok(crossbow.getObjectByName("left-support-hand"))
  assert.ok(crossbow.getObjectByName("right-trigger-hand"))
})

test("held weapon walks with the player, settles at rest, and leaves camera aiming independent", () => {
  const { crossbow, updatePose } = compile("lib/crossbow.ts").createCrossbow()
  const positions = []
  for (let i = 0; i < 120; i++) {
    updatePose({ time: i * 1000 / 60, dt: 1 / 60, speed: 6, aimX: 0, aimY: 0, aspect: 1, recoil: 0 })
    positions.push(crossbow.position.clone())
  }
  assert.ok(Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x)) > 0.01)
  assert.ok(Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y)) > 0.01)
  for (let i = 120; i < 300; i++) updatePose({ time: i * 1000 / 60, dt: 1 / 60, speed: 0, aimX: 0, aimY: 0, aspect: 1, recoil: 0 })
  assert.ok(Math.abs(crossbow.position.x) < 0.001)
  assert.ok(Math.abs(crossbow.position.y + 0.22) < 0.002)
})

test("chapter introduction disappears after four seconds", () => {
  let visible = true, effect, timer
  const model = compile("lib/expedition.ts")
  const { ExpeditionHUD } = compile("components/game/expedition-interface.tsx", {
    setTimeout: (callback, delay) => { timer = { callback, delay }; return 1 }, clearTimeout() {},
  }, {
    "@/lib/expedition": model,
    react: { useState: () => [visible, value => { visible = value }], useEffect: fn => { effect = fn } },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  })
  function findIntro(node) {
    if (!node || typeof node !== "object") return false
    if (Array.isArray(node)) return node.some(findIntro)
    return node.props?.["aria-label"] === "Chapter introduction" || findIntro(node.props?.children)
  }
  const props = { status: model.INITIAL_STATUS, onCannon() {} }
  assert.ok(findIntro(ExpeditionHUD(props)))
  effect()
  assert.equal(timer.delay, 4000)
  timer.callback()
  assert.equal(findIntro(ExpeditionHUD(props)), false)
})

test("aim assist accepts small misses, rejects distant misses, scenery and enemies behind the player", () => {
  const { assistedEnemy, pointerAim } = compile("lib/aim.ts")
  const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1))
  const target = { mesh: { position: new THREE.Vector3(1.3, 0, -30), scale: new THREE.Vector3(3, 3, 1) } }
  assert.equal(assistedEnemy(ray, [target], Infinity), target)
  assert.equal(assistedEnemy(ray, [target], 20), null)
  target.mesh.position.x = 5
  assert.equal(assistedEnemy(ray, [target], Infinity), null)
  target.mesh.position.set(0, 0, 10)
  assert.equal(assistedEnemy(ray, [target], Infinity), null)
  const aim = pointerAim(960, 200, 1280, 800)
  assert.equal(aim.x, 0.5)
  assert.equal(aim.y, 0.5)
})

function harness(width = 1280, height = 800) {
  let time = 0, frame, scene, camera, hookIndex = 0, effects = [], cleanups = []
  let status, damage = 0, kills = 0, healed = 0, health = 100
  const hooks = [], windowListeners = new Map(), canvasListeners = new Map(), documentListeners = new Map()
  const target = listeners => ({ addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) })
  const canvas = { ...target(canvasListeners), requestPointerLock() { throw Error("mouse capture is blocked") } }
  const document = { ...target(documentListeners), hidden: false, pointerLockElement: null, exitPointerLock() { this.pointerLockElement = null }, createElement: () => ({ getContext: () => ({ clearRect() {}, strokeText() {}, fillText() {}, fillRect() {} }) }) }
  const window = { ...target(windowListeners), innerWidth: width, innerHeight: height, devicePixelRatio: 1, matchMedia: () => ({ matches: false }), requestAnimationFrame: fn => { frame = fn; return 1 }, cancelAnimationFrame() { frame = null }, location: { origin: "http://localhost:3000", hostname: "localhost", href: "http://localhost:3000/" } }
  const react = {
    useRef(value) { const index = hookIndex++; return hooks[index] ??= { current: index === 0 ? canvas : value } },
    useEffect(fn, deps) { const index = hookIndex++; const prior = hooks[index]; if (!prior || deps.some((v, i) => v !== prior[i])) { hooks[index] = deps; effects.push(fn) } },
  }
  class Renderer {
    shadowMap = {}
    setPixelRatio() {} setSize() {} dispose() {}
    render(s, c) { scene = s; camera = c; s.updateMatrixWorld(true); c.updateMatrixWorld(true) }
  }
  class TextureLoader { load() { return new THREE.Texture() } }
  const model = compile("lib/expedition.ts")
  const scenery = compileScenery()
  const { GameCanvas } = compile("components/game/GameCanvas.tsx", { document, window, performance: { now: () => time } }, { react, "three": { ...THREE, WebGLRenderer: Renderer, TextureLoader }, "@/lib/expedition": model, "@/lib/world-scenery": scenery, "@/lib/crossbow": compile("lib/crossbow.ts"), "@/lib/fortress-cannon": compile("lib/fortress-cannon.ts"), "@/lib/aim": compile("lib/aim.ts"), "react/jsx-runtime": { jsx() {}, jsxs() {} } })
  let props = { muted: true, onStatus: value => { status = value }, onPlayerHit: amount => { damage += amount; health = Math.max(0, health - amount) }, onEnemyKilled: () => { kills++ }, onHeal: amount => { healed += amount; health = Math.min(100, health + amount) } }
  function update(changes = {}) { props = { ...props, ...changes }; hookIndex = 0; effects = []; GameCanvas(props); for (const effect of effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup) } }
  function tick(count = 1, frameMs = 50) { for (let i = 0; i < count; i++) { time += frameMs; frame?.() } }
  function shootAt(enemy) { camera.lookAt(enemy.position); camera.updateMatrixWorld(true); canvasListeners.get("mousedown")({ button: 0, preventDefault() {} }); windowListeners.get("mouseup")(); tick(8) }
  function enemies() { return scene.children.filter(obj => obj instanceof THREE.Sprite && (obj.name.startsWith("wave-") || obj.name.startsWith("guardian-") || model.REGIONS.some(region => region.boss === obj.name))) }
  update()
  return { tick, update, shootAt, enemies, document, windowListeners, canvasListeners, get scene() { return scene }, get camera() { return camera }, get status() { return status }, get damage() { return damage }, get health() { return health }, get kills() { return kills }, get healed() { return healed }, dispose() { cleanups.reverse().forEach(fn => fn()); assert.equal(windowListeners.size, 0); assert.equal(canvasListeners.size, 0); assert.equal(documentListeners.size, 0) } }
}

test("actual scene: combat, paused input, all 12 waves, bosses, upgrades, and endless continuation", () => {
  const game = harness()
  const model = compile("lib/expedition.ts")
  assert.equal(game.status.remaining, 4)
  const first = game.enemies()[0], z = first.position.z
  game.update({ isPaused: true })
  game.tick(50)
  assert.equal(first.position.z, z)
  game.shootAt(first)
  assert.equal(game.status.shots, 0)
  game.update({ isPaused: false })
  game.tick(64)
  assert.ok(first.position.z > z)
  game.document.hidden = true
  const hiddenZ = first.position.z
  game.tick(50)
  assert.equal(first.position.z, hiddenZ)
  game.document.hidden = false
  let commandId = 0, totalShots = 0
  for (let wave = 1; wave <= 12; wave++) {
    assert.equal(game.status.wave, wave)
    assert.equal(game.status.bossHealth > 0, wave % 3 === 0)
    const visibleRegion = game.scene.children.find(obj => obj.name.startsWith("expedition-region-") && obj.visible)
    assert.equal(visibleRegion.name, `expedition-region-${Math.floor((wave - 1) / 3)}`)
    let guard = 0
    while (game.enemies().length) {
      assert.ok(++guard < 250, `wave ${wave} should be clearable: ${game.enemies().map(e => `${e.name} at ${e.position.toArray().map(n => n.toFixed(1))}`).join("; ")}`)
      game.shootAt(game.enemies()[0])
      assert.ok(game.health > 0, `wave ${wave} should be survivable with aimed shots and blessings`)
    }
    assert.equal(game.status.cleared, true)
    assert.equal(game.status.remaining, 0)
    assert.equal(game.status.relics, wave - 1)
    assert.ok(game.status.shots >= totalShots)
    totalShots = game.status.shots
    game.tick(62)
    assert.equal(game.status.selectionReady, true)
    const choices = model.upgradeChoices(wave)
    const upgrade = game.health < 70 || wave % 4 === 0 ? "repair" : choices[0]
    game.update({ command: { id: ++commandId, type: "advance", upgrade, trial: wave % 2 ? "shadow" : "storm" } })
    game.tick(2)
    assert.equal(game.status.wave, wave + 1)
    assert.equal(game.status.cleared, false)
  }
  assert.equal(game.status.wave, 13)
  assert.equal(game.status.relics, 12)
  assert.ok(game.status.damage > 1)
  assert.ok(game.healed > 0)
  assert.ok(game.kills > 100)
  game.dispose()
})

test("mouse clicks aim without capture, land on release, and fire again after 150 ms", () => {
  const game = harness()
  const rotation = game.camera.quaternion.clone()
  function pointAt(enemy) {
    const projected = enemy.position.clone().project(game.camera)
    const point = { clientX: (projected.x + 1) * 640, clientY: (1 - projected.y) * 400, movementX: 0, movementY: 0 }
    game.windowListeners.get("mousemove")(point)
    return point
  }
  const target = game.enemies()[2]
  const point = pointAt(target)
  assert.ok(game.camera.quaternion.equals(rotation), "ordinary pointer movement must not rotate the camera")
  game.canvasListeners.get("mousedown")({ ...point, button: 0, preventDefault() {} })
  game.windowListeners.get("mouseup")()
  assert.equal(game.kills, 1, "the click must land before the next animation frame")
  assert.equal(game.status.hits, 1)
  game.tick(3)
  const next = pointAt(game.enemies()[1])
  game.canvasListeners.get("mousedown")({ ...next, button: 0, preventDefault() {} })
  game.windowListeners.get("mouseup")()
  assert.equal(game.kills, 2, "a second aimed click after 150 ms must work")
  game.update({ isPaused: true })
  game.tick(50)
  game.update({ isPaused: false })
  game.tick(1)
  const resumed = pointAt(game.enemies()[0])
  game.canvasListeners.get("mousedown")({ ...resumed, button: 0, preventDefault() {} })
  game.windowListeners.get("mouseup")()
  assert.equal(game.kills, 3, "resuming must not require mouse capture")
  game.dispose()
})

test("opening attackers fit a portrait screen and give beginners at least thirty seconds before a breach", () => {
  const game = harness(589, 672)
  assert.equal(game.enemies().length, 4)
  for (const enemy of game.enemies()) {
    const screen = enemy.position.clone().project(game.camera)
    assert.ok(Math.abs(screen.x) < 0.8 && Math.abs(screen.y) < 0.8, "each opening enemy must be visible")
    assert.ok(enemy.position.z <= -56, "attackers should start in the distance")
  }
  const initialZ = game.enemies()[0].position.z
  game.tick(40)
  assert.equal(game.enemies()[0].position.z, initialZ, "the opening should have a short preparation period")
  game.tick(560)
  assert.equal(game.damage, 0)
  assert.ok(game.enemies().every(enemy => enemy.position.z < -10))
  game.dispose()
})

test("walking in the actual scene animates the held hands and settles when movement stops", () => {
  const game = harness()
  const weapon = game.camera.getObjectByName("player-crossbow")
  assert.ok(weapon.getObjectByName("defender-hands"))
  const start = game.camera.position.clone()
  game.windowListeners.get("keydown")({ code: "KeyD" })
  game.tick(20)
  assert.ok(game.camera.position.x > start.x + 4)
  assert.ok(Math.abs(weapon.position.x) > 0.001)
  game.windowListeners.get("keyup")({ code: "KeyD" })
  const stoppedX = game.camera.position.x
  game.tick(60)
  assert.equal(game.camera.position.x, stoppedX)
  assert.ok(Math.abs(weapon.position.x) < 0.001)
  assert.ok(Math.abs(game.camera.position.y - start.y) < 0.001)
  game.dispose()
})

function miss(game, ground = false) {
  game.camera.lookAt(0, ground ? -80 : 100, -30)
  game.camera.updateMatrixWorld(true)
  game.canvasListeners.get("mousedown")({ button: 0, preventDefault() {} })
  game.windowListeners.get("mouseup")()
  game.tick(4)
}

function clearWave(game) {
  let guard = 0
  while (game.enemies().length) {
    assert.ok(++guard < 250, "aimed combat should clear the wave")
    game.shootAt(game.enemies()[0])
  }
}

test("every accepted missed arrow immediately resets the streak, including terrain hits", () => {
  const game = harness()
  game.shootAt(game.enemies()[0])
  assert.equal(game.status.combo, 1)
  game.tick(110)
  assert.equal(game.status.combo, 1, "waiting without missing should preserve precision")
  miss(game)
  assert.equal(game.status.combo, 0)
  assert.equal(game.status.hits, 1)
  assert.equal(game.status.shots, 2)
  game.shootAt(game.enemies()[0])
  assert.equal(game.status.combo, 1)
  miss(game, true)
  assert.equal(game.status.combo, 0)
  assert.equal(game.status.bestCombo, 1)
  game.dispose()
})

test("left-drag turns without shooting or breaking a streak; a steady hold keeps firing", () => {
  const game = harness()
  game.shootAt(game.enemies()[0])
  const rotation = game.camera.quaternion.clone(), shots = game.status.shots
  game.canvasListeners.get("mousedown")({ button: 0, clientX: 640, clientY: 400, preventDefault() {} })
  assert.equal(game.status.shots, shots, "pressing should wait to distinguish a drag from a shot")
  game.windowListeners.get("mousemove")({ clientX: 790, clientY: 420, movementX: 150, movementY: 20 })
  game.tick(5)
  game.windowListeners.get("mouseup")()
  assert.ok(!game.camera.quaternion.equals(rotation), "left-drag must turn the camera")
  assert.equal(game.status.shots, shots)
  assert.equal(game.status.combo, 1, "turning must not register an accidental miss")
  game.camera.lookAt(0, 100, -30)
  game.canvasListeners.get("mousedown")({ button: 0, preventDefault() {} })
  game.tick(3)
  assert.equal(game.status.shots, shots)
  game.tick(12)
  game.windowListeners.get("mouseup")()
  assert.ok(game.status.shots >= shots + 3, "a stationary hold must fire repeatedly")
  game.dispose()
})

test("wave clear preserves the last kill effects for three seconds, and pauses its timer", () => {
  const game = harness()
  clearWave(game)
  assert.equal(game.status.cleared, true)
  assert.equal(game.status.selectionReady, false)
  assert.ok(game.scene.children.some(obj => obj.geometry?.type === "SphereGeometry" && obj.geometry.parameters.radius === 0.08), "last kill particles must remain visible")
  const shots = game.status.shots
  game.canvasListeners.get("mousedown")({ button: 0, preventDefault() {} })
  game.windowListeners.get("mouseup")()
  assert.equal(game.status.shots, shots)
  game.update({ command: { id: 1, type: "advance", upgrade: "power", trial: "storm" } })
  game.tick(10)
  assert.equal(game.status.wave, 1, "gate selection must not skip the celebration")
  game.update({ isPaused: true })
  game.tick(100)
  assert.equal(game.status.selectionReady, false)
  game.update({ isPaused: false })
  game.tick(44)
  assert.equal(game.status.selectionReady, true)
  game.update({ command: { id: 2, type: "advance", upgrade: "power", trial: "storm" } })
  game.tick(2)
  assert.equal(game.status.wave, 2)
  assert.equal(game.status.selectionReady, false)
  assert.equal(game.status.cleared, false)
  game.dispose()
})

test("the celebration uses real seconds even when the renderer has a slow frame", () => {
  const game = harness()
  clearWave(game)
  game.tick(1, 2500)
  assert.equal(game.status.selectionReady, false)
  game.tick(1, 250)
  assert.equal(game.status.selectionReady, true)
  game.dispose()
})

test("real consecutive hits earn cannon loading, healing and Overdrive, without timed streak loss", () => {
  const game = harness()
  let commandId = 0, sawFive = false, sawTen = false, sawTwenty = false
  for (let wave = 1; wave <= 3; wave++) {
    let guard = 0
    while (game.enemies().length) {
      assert.ok(++guard < 100)
      const before = game.status.combo, healed = game.healed
      game.shootAt(game.enemies()[0])
      assert.equal(game.status.combo, before + 1)
      if (game.status.combo === 5) { sawFive = true; assert.match(game.status.reward.title, /Precision/); assert.equal(game.status.charge, 100) }
      if (game.status.combo === 10) { sawTen = true; assert.equal(game.healed - healed, 10) }
      if (game.status.combo === 20) { sawTwenty = true; assert.equal(game.status.overdriveSeconds, 8); assert.equal(game.status.damage, 2.5); break }
    }
    if (sawTwenty) break
    game.tick(62)
    game.update({ command: { id: ++commandId, type: "advance", upgrade: "repair", trial: "shadow" } })
    game.tick(2)
  }
  assert.ok(sawFive && sawTen && sawTwenty)
  game.update({ isPaused: true })
  game.tick(200)
  assert.equal(game.status.overdriveSeconds, 8)
  game.update({ isPaused: false })
  miss(game)
  assert.equal(game.status.combo, 0)
  assert.ok(game.status.overdriveSeconds > 0)
  game.tick(170)
  assert.equal(game.status.overdriveSeconds, 0)
  assert.equal(game.status.damage, 2)
  game.dispose()
})

test("fortress cannon requires full loading, mounts a real station and fires a visible area projectile", () => {
  const game = harness()
  const start = game.camera.position.clone()
  assert.ok(game.scene.getObjectByName("fortress-cannon"))
  game.windowListeners.get("keydown")({ code: "KeyE" })
  assert.equal(game.status.cannonMounted, false, "an incomplete load must keep the cannon locked")
  const count = game.enemies().length
  game.windowListeners.get("keydown")({ code: "Space", preventDefault() {} })
  assert.equal(game.enemies().length, count, "Space must no longer attack")
  clearWave(game)
  game.tick(62)
  game.update({ command: { id: 1, type: "advance", upgrade: "nova", trial: "shadow" } })
  game.tick(2)
  assert.equal(game.status.charge, 100)
  game.update({ isPaused: true, command: { id: 2, type: "cannon" } })
  game.tick(2)
  assert.equal(game.status.cannonMounted, false)
  game.update({ isPaused: false, command: { id: 3, type: "cannon" } })
  game.tick(2)
  assert.equal(game.status.cannonMounted, true)
  assert.equal(game.camera.getObjectByName("player-crossbow").visible, false)
  assert.equal(game.camera.position.x, -3.8)
  game.windowListeners.get("keydown")({ code: "KeyE" })
  assert.equal(game.status.cannonMounted, false)
  assert.equal(game.status.charge, 100, "leaving without firing preserves the load")
  assert.ok(game.camera.position.distanceTo(start) < 0.02)
  game.windowListeners.get("keydown")({ code: "KeyE" })
  const enemies = game.enemies().length, hits = game.status.hits, streak = game.status.combo
  const target = game.enemies()[Math.floor(enemies / 2)]
  game.camera.lookAt(target.position)
  game.camera.updateMatrixWorld(true)
  game.canvasListeners.get("mousedown")({ button: 0, preventDefault() {} })
  game.windowListeners.get("mouseup")()
  assert.equal(game.status.charge, 0)
  assert.ok(game.scene.getObjectByName("cannonball-in-flight"))
  assert.equal(game.enemies().length, enemies, "the shell must travel to its target")
  game.update({ isPaused: true })
  game.tick(100)
  assert.equal(game.enemies().length, enemies)
  game.update({ isPaused: false })
  game.tick(14)
  assert.ok(game.enemies().length <= enemies - 2, "the aimed blast must hit nearby enemies")
  assert.ok(game.scene.getObjectByName("cannon-impact-blast"))
  assert.equal(game.status.combo, streak)
  assert.equal(game.status.hits, hits)
  assert.equal(game.status.charge, 0, "ordinary cannon kills cannot reload the cannon")
  game.tick(8)
  assert.equal(game.status.cannonMounted, false)
  assert.equal(game.camera.getObjectByName("player-crossbow").visible, true)
  game.dispose()
})

test("wave ten unlocks both weapon modes and fully loads the cannon", () => {
  const game = harness()
  let commandId = 0
  game.update({ command: { id: ++commandId, type: "weapon", weapon: "repeater" } })
  game.tick(2)
  assert.equal(game.status.weapon, "crossbow")
  for (let wave = 1; wave < 10; wave++) {
    clearWave(game)
    game.tick(62)
    assert.equal(game.status.arsenalUnlocked, false)
    game.update({ command: { id: ++commandId, type: "advance", upgrade: "repair", trial: "shadow" } })
    game.tick(2)
  }
  assert.equal(game.status.wave, 10)
  assert.equal(game.status.arsenalUnlocked, true)
  assert.equal(game.status.weapon, "repeater")
  assert.equal(game.status.charge, 100)
  assert.equal(game.camera.getObjectByName("storm-repeater-magazine").visible, true)
  const repeaterDamage = game.status.damage
  game.windowListeners.get("keydown")({ code: "Digit1" })
  assert.equal(game.status.weapon, "crossbow")
  assert.equal(game.status.damage, repeaterDamage * 1.5)
  game.dispose()
})

