// Copied from the picture library by scripts/aquarium.mjs. Do not edit here.
// The aquarium: a two-minute underwater loop for the classroom projector, as data.
//
// Everything that moves is a function of t, the time in the loop, so the projector
// page (index.html), the animation guide (guide.html) and the check (check.mjs) all
// see the same scene. Nothing here touches the page: Node imports this file too.
//
// The stage is 16:9. x is in stage widths (0 left … 1 right), y in stage heights
// (0 top … 1 bottom). An actor's `h` is the height of its drawing (not the picture's
// margin) as a share of the stage height. Every picture faces left; the code mirrors
// it to swim right.
//
// An actor moves through `keys`, [t, x, y], joined by a monotone cubic (PCHIP) on
// each axis: a hold stays put, nothing overshoots into the sand, and x only turns
// back at a key. Keys repeat every `period` seconds (120 unless given; it must
// divide 120). Two keys at the same t are a jump, allowed only off screen.
// Everything periodic on top of a path (bob, tail, pulse, steps, bubbles) runs a
// whole number of times per loop, so the loop joins without a seam.

export const LOOP = 120
export const TURN = 0.3                   // a turn: a squash through zero width, in seconds
export const A = 16 / 9                   // the stage's width over its height
export const SAND = 0.84                  // where the sand starts
// The most any screen shape shows: 21:9 wide, 5:4 tall. Off screen means outside it.
export const SEEN = { x: [-0.16, 1.16], y: [-0.22, 1.22] }
export const BASE = '../../'              // the library root, seen from this page

export const PICS = {
  clown: 'props/sea/clownfish.webp',
  shark: 'props/sea/shark.webp',
  turtle: 'props/sea/turtle.webp',
  jelly: 'props/sea/jellyfish.webp',
  crab: 'props/sea/crab.webp',
  octopus: 'props/sea/octopus.webp',
  starfish: 'props/sea/starfish.webp',
  sub: 'props/vehicles/submarine.webp',
  fast: 'props/sea/fast-fish.webp',
  slow: 'props/sea/pufferfish.webp',
  // the reef (props/sea/P2-reef)
  anemone: 'props/sea/anemone.webp',
  rock: 'props/sea/rock.webp',
  arch: 'props/sea/rock-arch.webp',
  chest: 'props/sea/treasure-chest.webp',
  scallop: 'props/sea/scallop.webp',
  branch: 'props/sea/branch-coral.webp',
  brain: 'props/sea/brain-coral.webp',
}

// Colours the page draws with, matched to the pictures (outline, cream, sage, tan).
export const INK = { outline: '#4f2d10', sand: '#e9cf9f', sandFar: '#dfc293', weed: ['#9fae6c', '#8e9d5e', '#b0b97c'] }
export const WATER = { light: '#5f95a0', deep: '#3b6c7b' }

// The submarine's colours. Yellow is the picture as drawn; the others are made in the
// page by replacing its body colour.
export const BODY = '#fdc75c'
export const COLOURS = [
  { id: 'yellow', hex: BODY, en: 'yellow', es: 'amarillo' },
  { id: 'red', hex: '#d9574a', en: 'red', es: 'rojo' },
  { id: 'blue', hex: '#4c78d6', en: 'blue', es: 'azul' },
  { id: 'green', hex: '#7cbf5a', en: 'green', es: 'verde' },
  { id: 'orange', hex: '#f08a3a', en: 'orange', es: 'naranja' },
  { id: 'purple', hex: '#a575cf', en: 'purple', es: 'morado' },
]
export const colourOf = (id) => COLOURS.find((c) => c.id === id) || COLOURS[0]

export const DEFAULTS = { clownfish: 3, sub: 'yellow', speed: 1, water: 'light' }
export const CHOICES = { clownfish: [1, 2, 3, 4, 5], sub: [...COLOURS.map((c) => c.id), 'each'], speed: [0.5, 1], water: ['light', 'deep'] }
export const subColour = (s, loop) => (s.sub === 'each' ? COLOURS[((loop % 6) + 6) % 6].id : s.sub)

// The teacher's strip covers the left of the screen while it shows (a quarter of
// the stage on a 1024-wide screen, less on wider ones), so that side holds only
// things nobody is asked about. check.mjs keeps every asked-about actor right of it.
export const STRIP = 0.25

// ---- The clownfish: at home around their anemone at the right, lapping it,
// except while they hold still at spread-out spots to be counted. Any first n
// spots are apart.
const ANEMONE = 0.84
const SPOTS = [[0.76, 0.56], [0.90, 0.56], [0.83, 0.40], [0.71, 0.72], [0.93, 0.72]]
const LAPS = [ // centre x, centre y, reach x (widths), reach y (heights), seconds a lap, which way, where it starts
  [0.83, 0.60, 0.09, 0.08, 8, 1, 0],
  [0.85, 0.55, 0.07, 0.10, 10, -1, 1],
  [0.82, 0.66, 0.10, 0.06, 12, 1, 2],
  [0.86, 0.60, 0.06, 0.09, 15, -1, 3],
  [0.81, 0.53, 0.08, 0.07, 20, 1, 1],
]
const COUNT = [2, 12]                     // the clownfish hold still for counting
function clownKeys(i) {
  const [x, y] = SPOTS[i], [cx, cy, rx, ry, lap, way, at] = LAPS[i]
  const keys = [[COUNT[0], x, y], [COUNT[1], x, y]]
  for (let k = 0, t = COUNT[1] + 2; t <= LOOP - 2; k++, t += lap / 4) {
    const q = at + way * k
    keys.push([t, cx + rx * [1, 0, -1, 0][((q % 4) + 4) % 4], cy + ry * [0, 1, 0, -1][((q % 4) + 4) % 4]])
  }
  return keys
}

// ---- Everyone. z orders the drawing (higher is in front). Rigs: fish (tail swish
// and bob), glide (slow tilt and bob), float (the submarine), jelly (pulse), walk
// (the crab's steps), sit and still. Rates are cycles per loop.
export const ACTORS = [
  ...LAPS.map((_, i) => ({ id: `clown${i + 1}`, pic: 'clown', name: { en: 'clownfish', es: 'pez payaso' }, fish: true, n: i + 1,
    h: 0.11, z: 5, rig: 'fish', flick: 150 + 12 * i, bobs: 22 + i, seed: i * 0.23, keys: clownKeys(i) })),

  // Over (24–32) and under (80–88): both slow to a crawl going the same way, the
  // shark overtaking, so they stay one above the other for the whole moment.
  { id: 'turtle', pic: 'turtle', frames: 'projects/motion/turtle-swim', name: { en: 'turtle', es: 'tortuga' }, h: 0.19, z: 3, rig: 'glide', strokes: 48, bobs: 18, seed: 0.1,
    keys: [[10, -0.35, 0.26], [24, 0.42, 0.25], [32, 0.52, 0.25], [48, 1.35, 0.23], [66, 1.35, 0.70], [80, 0.51, 0.70], [88, 0.43, 0.70], [104, -0.35, 0.70]] },
  { id: 'shark', pic: 'shark', name: { en: 'shark', es: 'tiburón' }, fish: true, h: 0.22, z: 2, rig: 'fish', flick: 36, bobs: 16, seed: 0.35,
    keys: [[12, -0.40, 0.53], [24, 0.36, 0.55], [32, 0.58, 0.55], [46, 1.40, 0.52], [68, 1.40, 0.42], [80, 0.57, 0.42], [88, 0.37, 0.42], [102, -0.40, 0.44]] },

  // Fast and slow (52–62): the slow one crawls across the middle while the fast one
  // zig-zags above it, never across it.
  { id: 'slow', pic: 'slow', name: { en: 'pufferfish', es: 'pez globo' }, fish: true, h: 0.14, z: 3, rig: 'fish', flick: 90, bobs: 20, seed: 0.6,
    keys: [[40, 1.30, 0.60], [52, 0.58, 0.60], [62, 0.42, 0.61], [76, -0.30, 0.60], [76, 1.30, 0.60]] },
  { id: 'fast', pic: 'fast', name: { en: 'red fish', es: 'pez rojo' }, fish: true, h: 0.08, z: 6, rig: 'fish', flick: 330, bobs: 30, seed: 0.2,
    keys: [[47, -0.25, 0.36], [52.5, 0.90, 0.34], [57, 0.32, 0.30], [61.5, 0.90, 0.40], [67, -0.25, 0.36]] },

  // The submarine (colour, 102–114): across the top, then back to the left off screen.
  { id: 'sub', pic: 'sub', name: { en: 'submarine', es: 'submarino' }, h: 0.22, z: 4, rig: 'float', bobs: 15, seed: 0.5, trail: 100,
    keys: [[92, -0.30, 0.17], [102, 0.34, 0.16], [114, 0.80, 0.17], [119, 1.30, 0.16], [119, -0.30, 0.17]] },

  // Ambient, at the left where the strip may cover them.
  { id: 'jelly', pic: 'jelly', frames: 'projects/motion/jellyfish-pulse', name: { en: 'jellyfish', es: 'medusa' }, h: 0.20, z: 1.5, rig: 'jelly', turn: false, period: 40, pulse: 30, seed: 0,
    keys: [[0, 0.12, 0.62], [20, 0.12, 0.32]] },
  { id: 'octopus', pic: 'octopus', name: { en: 'octopus', es: 'pulpo' }, h: 0.15, z: 2, rig: 'sit', turn: false, foot: true, seed: 0.7,
    keys: [[0, 0.15, 0.905]] },
  { id: 'crab', pic: 'crab', frames: 'projects/motion/crab-walk', rest: 2, name: { en: 'crab', es: 'cangrejo' }, h: 0.10, z: 5.5, rig: 'walk', turn: false, foot: true, period: 30, steps: 240, seed: 0.4,
    keys: [[0, 0.36, 0.93], [12, 0.56, 0.93], [15, 0.56, 0.93], [27, 0.36, 0.93]] },
  { id: 'starfish', pic: 'starfish', name: { en: 'starfish', es: 'estrella de mar' }, h: 0.075, z: 2, rig: 'still', turn: false, foot: true,
    keys: [[0, 0.63, 0.955]] },
]
export const byId = (id) => ACTORS.find((a) => a.id === id)

// The cast for these settings: only the first n clownfish.
export const cast = (s) => ACTORS.filter((a) => !a.n || a.n <= s.clownfish)

// ---- Scenery. Pictures from the reef sheet stand on the sand (x is their middle,
// base their bottom, h their height); a `sway` one moves its top, the others are
// still. Seaweed is drawn by the page.
export const SCENERY = [
  { id: 'rock', pic: 'rock', x: 0.065, base: SAND + 0.035, h: 0.12, z: 1 },
  { id: 'weed-left', kind: 'weed', x: 0.21, base: SAND + 0.02, w: 0.06, h: 0.32, z: 1, blades: 3, sway: 20, seed: 0.1 },
  { id: 'arch', pic: 'arch', x: 0.31, base: SAND + 0.035, h: 0.12, z: 1 },
  { id: 'weed-mid', kind: 'weed', x: 0.385, base: SAND + 0.02, w: 0.04, h: 0.15, z: 1, blades: 2, sway: 15, seed: 0.5 },
  { id: 'chest', pic: 'chest', x: 0.47, base: SAND + 0.04, h: 0.09, z: 1 },
  { id: 'scallop', pic: 'scallop', x: 0.575, base: SAND + 0.06, h: 0.065, z: 1 },
  { id: 'weed-right', kind: 'weed', x: 0.665, base: SAND + 0.02, w: 0.05, h: 0.24, z: 1, blades: 3, sway: 20, seed: 0.8 },
  { id: 'branch', pic: 'branch', x: 0.72, base: SAND + 0.03, h: 0.17, z: 1 },
  { id: 'brain', pic: 'brain', x: 0.955, base: SAND + 0.035, h: 0.10, z: 1 },
  { id: 'anemone', pic: 'anemone', x: ANEMONE, base: SAND + 0.03, h: 0.17, z: 4, sway: 24, amp: 0.012, seed: 0.3 },
  { id: 'weed-front', kind: 'weed', x: 0.02, base: 1.03, w: 0.07, h: 0.44, z: 8, blades: 3, sway: 15, seed: 0.2 },
]

// Bubbles rising from the chest, the arch and the brain coral; `per` is bubbles per loop.
export const STREAMS = [
  { x: 0.47, y: SAND - 0.03, per: 24, rise: 0.06, r: 0.011, seed: 1 },
  { x: 0.31, y: SAND - 0.04, per: 12, rise: 0.05, r: 0.007, seed: 2 },
  { x: 0.955, y: SAND - 0.05, per: 15, rise: 0.05, r: 0.007, seed: 3 },
]

// ---- The question moments. `test` is what check.mjs proves for the whole moment;
// Next question lands on `from`.
const NUM = { 1: ['one', 'uno'], 2: ['two', 'dos'], 3: ['three', 'tres'], 4: ['four', 'cuatro'], 5: ['five', 'cinco'] }
const OVER_UNDER = { en: 'Is the turtle over or under the shark?', es: '¿La tortuga está encima o debajo del tiburón?' }
export const MOMENTS = [
  { id: 'count', from: COUNT[0], to: COUNT[1], test: ['count', 'clown'],
    ask: { en: 'How many clownfish do you see?', es: '¿Cuántos peces payaso ves?' },
    answer: (s) => ({ en: NUM[s.clownfish][0], es: NUM[s.clownfish][1] }) },
  { id: 'over', from: 24, to: 32, test: ['over', 'turtle', 'shark'], ask: OVER_UNDER,
    answer: () => ({ en: 'over', es: 'encima' }) },
  { id: 'speed', from: 52, to: 62, test: ['faster', 'fast', 'slow'],
    ask: { en: 'Which fish is fast? Which is slow?', es: '¿Qué pez es rápido? ¿Cuál es lento?' },
    answer: () => {
      const f = byId('fast').name, s = byId('slow').name
      return { en: `the ${f.en} is fast, the ${s.en} is slow`, es: `el ${f.es} es rápido, el ${s.es} es lento` }
    } },
  { id: 'under', from: 80, to: 88, test: ['over', 'shark', 'turtle'], ask: OVER_UNDER,
    answer: () => ({ en: 'under', es: 'debajo' }) },
  { id: 'colour', from: 102, to: 114, test: ['seen', 'sub'],
    ask: { en: 'What colour is the submarine?', es: '¿De qué color es el submarino?' },
    answer: (s, loop) => { const c = colourOf(subColour(s, loop)); return { en: c.en, es: c.es } } },
]
export const momentAt = (t) => MOMENTS.find((m) => t >= m.from && t < m.to) || null

// ---- Motion.
export const wrap = (t, p) => ((t % p) + p) % p
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const TAU = 2 * Math.PI

const prepared = new Map()
function prep(a) {
  let p = prepared.get(a)
  if (p) return p
  const P = a.period || LOOP, K = a.keys, n = K.length
  if (LOOP % P) throw new Error(`${a.id}: a period of ${P} s does not divide the ${LOOP}-s loop`)
  for (let i = 1; i < n; i++) if (K[i][0] < K[i - 1][0]) throw new Error(`${a.id}: keys out of order at ${K[i][0]} s`)
  if (K[0][0] < 0 || K[n - 1][0] >= P) throw new Error(`${a.id}: keys must lie in 0…${P} s`)
  const T = K.map((k) => k[0])
  const span = T.map((t, i) => (i + 1 < n ? T[i + 1] : T[0] + P) - t)
  const tangent = (v) => K.map((_, i) => {
    const hp = span[(i - 1 + n) % n], hn = span[i]
    if (n === 1 || hp === 0 || hn === 0) return 0
    const dp = (v[i] - v[(i - 1 + n) % n]) / hp, dn = (v[(i + 1) % n] - v[i]) / hn
    if (dp * dn <= 0) return 0
    const w1 = 2 * hn + hp, w2 = hn + 2 * hp
    return (w1 + w2) / (w1 / dp + w2 / dn)
  })
  const X = K.map((k) => k[1]), Y = K.map((k) => k[2])
  // Which way each stretch faces: +1 as drawn (moving left), -1 mirrored (moving
  // right). A hold keeps the way it was facing.
  const dir = K.map((_, i) => (n === 1 || span[i] === 0 ? 0 : Math.sign(Math.round((X[(i + 1) % n] - X[i]) * 1e6))))
  const face = new Array(n).fill(1)
  const last = [...dir].reverse().find((d) => d)
  let f = last ? (last < 0 ? 1 : -1) : 1
  for (let i = 0; i < n; i++) { if (dir[i]) f = dir[i] < 0 ? 1 : -1; face[i] = f }
  const turns = []
  if (a.turn !== false) for (let i = 0; i < n; i++) if (face[i] !== face[(i - 1 + n) % n]) turns.push({ t: T[i], before: face[(i - 1 + n) % n] })
  p = { P, n, T, span, X, Y, mx: tangent(X), my: tangent(Y), face, turns }
  prepared.set(a, p)
  return p
}

// Where the actor is on its path at time t (any real number): x, y, their speeds
// per second, and which way it faces (sx).
export function track(a, t) {
  const p = prep(a), tt = wrap(t, p.P)
  if (p.n === 1) return { x: p.X[0], y: p.Y[0], vx: 0, vy: 0, sx: 1, seg: 0 }
  let i = p.n - 1
  for (let k = 0; k < p.n; k++) { if (p.T[k] <= tt) i = k; else break }
  const j = (i + 1) % p.n, h = p.span[i]
  const s = (tt < p.T[0] ? tt + p.P : tt) - p.T[i]
  const u = h ? s / h : 0, u2 = u * u, u3 = u2 * u
  const herm = (v, m) => (2 * u3 - 3 * u2 + 1) * v[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * v[j] + (u3 - u2) * h * m[j]
  const slope = (v, m) => (h ? ((6 * u2 - 6 * u) * v[i] + (-6 * u2 + 6 * u) * v[j]) / h + (3 * u2 - 4 * u + 1) * m[i] + (3 * u2 - 2 * u) * m[j] : 0)
  let sx = p.face[i]
  for (const k of p.turns) {
    const d = wrap(tt - k.t + p.P / 2, p.P) - p.P / 2
    if (Math.abs(d) < TURN / 2) { sx = k.before * Math.cos(Math.PI * (d + TURN / 2) / TURN); break }
  }
  if (a.turn === false) sx = 1
  return { x: herm(p.X, p.mx), y: herm(p.Y, p.my), vx: slope(p.X, p.mx), vy: slope(p.Y, p.my), sx, seg: i }
}

export const turnsOf = (a) => prep(a).turns.map((k) => k.t)

// The whole pose: the path plus the rig on top of it. phase is 0…1 of the rig's
// cycle (tail, pulse, step); rot is a tilt in radians, on screen.
export function poseAt(a, t) {
  const k = track(a, t)
  const cyc = (n) => wrap((n || 0) * t / LOOP + (a.seed || 0), 1)
  const wave = (n, off = 0) => Math.sin(TAU * (cyc(n) + off))
  const right = k.sx < 0 ? 1 : -1                  // +1 when the nose points right
  let { x, y } = k, rot = 0, phase = 0, moving = 1
  if (a.rig === 'fish') {
    y += 0.006 * wave(a.bobs)
    phase = cyc(a.flick)
    rot = right * clamp(Math.atan2(k.vy, Math.abs(k.vx) * A) * 0.5, -0.12, 0.12)
  } else if (a.rig === 'glide') {
    y += 0.008 * wave(a.bobs)
    phase = cyc(a.strokes)
    rot = 0.035 * wave(a.bobs, 0.25) + right * clamp(Math.atan2(k.vy, Math.abs(k.vx) * A) * 0.3, -0.08, 0.08)
  } else if (a.rig === 'float') {
    y += 0.007 * wave(a.bobs)
    rot = 0.025 * wave(a.bobs, 0.3)
  } else if (a.rig === 'jelly') {
    phase = cyc(a.pulse)
  } else if (a.rig === 'walk') {
    phase = cyc(a.steps)
    moving = clamp(Math.abs(k.vx) * A / 0.02, 0, 1)
    y -= 0.007 * Math.abs(Math.sin(Math.PI * phase)) * moving
    rot = 0.035 * Math.sin(TAU * phase) * moving
  } else if (a.rig === 'sit') {
    phase = cyc(8)
  }
  return { x, y, sx: k.sx, rot, phase, moving, vx: k.vx, vy: k.vy }
}

// ---- Frame sets (projects/motion/<name>/frames.json): an actor with `frames`
// plays them by its rig's phase, in the set's play order; a walker that has
// stopped shows its `rest` frame. Each frame lines up on its own anchor.
export const measureKey = (a) => a.frames || a.pic
export function frameAt(a, pose, set) {
  if (a.rig === 'walk' && pose.moving < 0.15) return (a.rest || set.play[0]) - 1
  return set.play[Math.floor(wrap(pose.phase, 1) * set.play.length) % set.play.length] - 1
}
// One measure for a whole set: its size comes from the first frame that plays (so
// every frame is drawn at one scale), and its box covers every frame that plays,
// around the anchor.
export function frameSetMeasure(frames, play) {
  const used = [...new Set(play)].map((n) => frames[n - 1])
  const rel = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity }
  for (const f of used) {
    const b = f.m.box
    rel.l = Math.min(rel.l, b.x - f.ax); rel.r = Math.max(rel.r, b.x + b.w - f.ax)
    rel.t = Math.min(rel.t, b.y - f.ay); rel.b = Math.max(rel.b, b.y + b.h - f.ay)
  }
  return { ref: used[0].m.box.h, rel, box: used[0].m.box, tail: used[0].m.tail }
}

// What a picture's drawing occupies: its opaque box in the picture's pixels, and for
// a fish where the tail starts (the narrowest column of its back part, as a share of
// the box width from the head). `alpha` holds one byte per pixel every `step` bytes
// from `off` (1, 0 from ImageMagick's gray:-; 4, 3 from a canvas's RGBA).
export function measure(alpha, w, h, step = 1, off = 0) {
  let top = h, bottom = -1, left = w, right = -1
  const col = new Uint32Array(w)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alpha[(y * w + x) * step + off] > 127) {
      col[x]++
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }
  const bw = right - left + 1, bh = bottom - top + 1
  let tail = 0.75, least = Infinity
  for (let x = left + Math.round(bw * 0.55); x <= left + Math.round(bw * 0.9); x++) if (col[x] < least) { least = col[x]; tail = (x - left) / bw }
  return { w, h, box: { x: left, y: top, w: bw, h: bh }, tail }
}

// The actor's drawing on the stage at this pose (widths across, heights down),
// grown a little for its tilt. A single picture is anchored at its middle, or at
// its feet for a `foot` actor; a frame set carries its own box around its anchor.
export function boxAt(a, pose, m) {
  const k = a.h / (m.ref || m.box.h)               // stage heights per picture pixel
  const r = m.rel || (a.foot
    ? { l: -m.box.w / 2, r: m.box.w / 2, t: -m.box.h, b: 0 }
    : { l: -m.box.w / 2, r: m.box.w / 2, t: -m.box.h / 2, b: m.box.h / 2 })
  const x0 = (pose.sx < 0 ? -r.r : r.l) * k, x1 = (pose.sx < 0 ? -r.l : r.r) * k
  const y0 = r.t * k, y1 = r.b * k
  const c = Math.abs(Math.cos(pose.rot)), s = Math.abs(Math.sin(pose.rot))
  const W = (x1 - x0) * c + (y1 - y0) * s, H = (x1 - x0) * s + (y1 - y0) * c
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  return { l: pose.x + (cx - W / 2) / A, r: pose.x + (cx + W / 2) / A, t: pose.y + cy - H / 2, b: pose.y + cy + H / 2 }
}
// A picture's width comes from its drawing (m, from measure()); seaweed gives its own.
export function sceneryBox(o, m) {
  const w = o.pic ? (m.box.w / m.box.h) * o.h / A : o.w
  return { l: o.x - w / 2, r: o.x + w / 2, t: o.base - o.h, b: o.base }
}
export const inSeen = (b) => b.r > SEEN.x[0] && b.l < SEEN.x[1] && b.b > SEEN.y[0] && b.t < SEEN.y[1]
export const onStage = (b) => b.l >= 0 && b.r <= 1 && b.t >= 0 && b.b <= 1

// ---- Bubbles: from each stream, and a trail behind the submarine while it is seen.
const hash = (i, salt) => { const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return v - Math.floor(v) }
export function bubblesAt(t, s, measures) {
  const out = []
  const rise = (b, x0, y0, age, r, speed) => {
    const y = y0 - speed * age
    if (y + r < SEEN.y[0]) return
    out.push({ x: x0 + 0.006 * Math.sin(TAU * (age / 2.2 + hash(b, 7))) / A, y, r })
  }
  for (const st of STREAMS) {
    for (let b = 0; b < st.per; b++) {
      const born = (b + 0.6 * hash(b, st.seed)) * LOOP / st.per
      rise(b, st.x + 0.01 * (hash(b, st.seed + 9) - 0.5), st.y, wrap(t - born, LOOP), st.r * (0.7 + 0.6 * hash(b, st.seed + 4)), st.rise)
    }
  }
  const sub = cast(s).find((a) => a.trail)
  if (sub && measures?.[sub.pic]) {
    const m = measures[sub.pic]
    for (let b = 0; b < sub.trail; b++) {
      const born = b * LOOP / sub.trail, age = wrap(t - born, LOOP)
      const at = poseAt(sub, born), box = boxAt(sub, at, m)
      if (!inSeen(box) || age > 14) continue
      const back = at.sx < 0 ? box.l : box.r
      rise(b, back + (at.sx < 0 ? -0.01 : 0.01), at.y + 0.02 * (hash(b, 5) - 0.3), age, 0.006 + 0.004 * hash(b, 6), 0.055)
    }
  }
  return out
}
