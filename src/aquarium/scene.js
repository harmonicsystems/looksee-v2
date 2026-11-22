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
  jelly: 'props/sea/jellyfish-large.webp',   // one big picture each (props/sea/P5, P6), for clean lines
  crab: 'props/sea/crab.webp',
  octopus: 'props/sea/octopus-large.webp',
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
  // the visitors of the other loops (props/sea/P3-fish)
  butterfly: 'props/sea/butterflyfish.webp',
  angel: 'props/sea/angelfish.webp',
  whale: 'props/sea/humpback.webp',          // one big picture (props/sea/P4-humpback)
  visitor: 'props/sea/butterflyfish.webp',   // the same fish, counted apart from the school and the line
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

// The loops. Each is two minutes with its own visitors and its own moments, and they
// take turns; the `loops` setting can hold the screen on one. An actor or a moment
// with `in` belongs to that loop only; without it, to every loop. An actor that
// moves differently in a loop says how in `also: { <loop>: { keys, … } }`. Where
// the loops join, everything in sight is in the same place in all of them
// (check.mjs proves it), so any loop can follow any other.
export const LOOPS = [
  { id: 'past', en: 'Swimming past' },
  { id: 'hide', en: 'Hide and seek' },
  { id: 'school', en: 'A school of fish' },
  { id: 'size', en: 'Big and little' },
  { id: 'more', en: 'One more' },
]
// `card` is the face a moment's card opens on: something to say, or the question.
export const DEFAULTS = { clownfish: 3, sub: 'yellow', speed: 1, water: 'light', card: 'say', loops: 'turn' }
export const CHOICES = { clownfish: [1, 2, 3, 4, 5], sub: [...COLOURS.map((c) => c.id), 'each'], speed: [0.5, 1], water: ['light', 'deep'], card: ['say', 'ask'], loops: ['turn', ...LOOPS.map((l) => l.id)] }
const mod = (n, m) => ((n % m) + m) % m
// Which loop plays as loop number n, and how many times it has played before.
export const loopOf = (s, n = 0) => (LOOPS.some((l) => l.id === s.loops) ? s.loops : LOOPS[mod(n, LOOPS.length)].id)
export const visitOf = (s, n = 0) => (LOOPS.some((l) => l.id === s.loops) ? n : Math.floor(n / LOOPS.length))
export const subColour = (s, loop) => (s.sub === 'each' ? COLOURS[mod(visitOf(s, loop), 6)].id : s.sub)

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
// Hide and seek: one after another they go to the anemone's top (the door), change
// depth there in the open, and sink in behind its tentacles (86–96). The keys near
// the join stay as they are in every loop.
const IN = [[0.84, 0.77], [0.818, 0.785], [0.862, 0.785], [0.826, 0.757], [0.854, 0.757]]
const DOOR = [0.84, 0.62]
function clownHide(i) {
  const out = 79 + i, back = 98.5 + 0.6 * i
  return {
    keys: [...clownKeys(i).filter((k) => k[0] < 76 || k[0] > 103), [out, ...DOOR], [84 + 0.5 * i, ...IN[i]], [96, ...IN[i]], [back, ...DOOR]].sort((p, q) => p[0] - q[0]),
    depth: [[0, 5], [out, 3.9], [back, 5]],
  }
}

// ---- A school of fish: twelve small fish that swim in, make a shape, hold it, loosen
// and make the next. A shape is twelve spots, one a fish, spaced evenly along its
// outline. It is drawn in stage heights around the school's middle, y down, then
// placed on the stage. To add one, give its outline here and a moment below.
const SCHOOL = { n: 12, x: 0.47, y: 0.38, h: 0.045 }
function along(line, n, closed) {
  const pts = closed ? [...line, line[0]] : line, len = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const total = len[len.length - 1], out = []
  for (let k = 0; k < n; k++) {
    const d = total * k / (closed ? n : n - 1)
    let i = 1
    while (i < pts.length - 1 && len[i] < d) i++
    const u = (d - len[i - 1]) / (len[i] - len[i - 1] || 1)
    out.push([SCHOOL.x + (pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u) / A, SCHOOL.y + pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u])
  }
  return out
}
const arc = (cx, cy, r, from, to, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = from + (to - from) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] })
export const SHAPES = {
  circle: along(arc(0, 0, 0.19, -Math.PI / 2, 1.5 * Math.PI, 120).slice(0, -1), SCHOOL.n, true),
  triangle: along([[0, -0.22], [0.21, 0.145], [-0.21, 0.145]], SCHOOL.n, true),
  square: along([[-0.18, -0.18], [0.18, -0.18], [0.18, 0.18], [-0.18, 0.18]], SCHOOL.n, true),
  // The three and the L have a fish at the corner where their two strokes meet:
  // spaced evenly along the whole line, the two nearest it would touch.
  three: [...along(arc(0, -0.125, 0.125, -2.4, Math.PI / 2), 6, false), ...along(arc(0, 0.125, 0.125, -Math.PI / 2, 2.4), 7, false).slice(1)],
  L: [...along([[-0.14, -0.245], [-0.14, 0.245]], 8, false), ...along([[-0.14, 0.245], [0.14, 0.245]], 5, false).slice(1)],
}
// When each shape is held, in order. Between two, the school loosens into a cluster.
const HELD = [['circle', 22, 30], ['triangle', 40, 48], ['square', 58, 66], ['three', 76, 84], ['L', 94, 102]]
const scatter = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v) - 0.5 }
function schoolKeys(i) {
  const home = [1.24 + 0.03 * (i % 4), 0.16 + 0.035 * i]                    // out of sight at the right
  const keys = [[13, ...home]]
  HELD.forEach(([shape, from, to], k) => {
    // Not all at the same instant: a fish that turns there is edge-on for a moment.
    if (k) keys.push([from - 5.8 + 0.3 * (i % 6), SCHOOL.x + 0.5 * scatter(i, k) / A, SCHOOL.y + 0.36 * scatter(i, k + 9)])
    keys.push([from, ...SHAPES[shape][i]], [to, ...SHAPES[shape][i]])
  })
  keys.push([114, ...home])
  return keys
}

// One more: the clownfish hold at their spots until 53, while a visitor comes and goes.
const clownMore = (i) => { const k = clownKeys(i); return { keys: [k[0], [53, k[1][1], k[1][2]], ...k.filter((q) => q[0] > 55)] } }
// The line of three: red, yellow and blue, in a new order each time the loop plays.
const TRIO = ['red', 'yellow', 'blue'], ORDERS = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]]
export const lineColour = (i, s, loop) => TRIO[ORDERS[mod(visitOf(s, loop), ORDERS.length)][i]]

// ---- Everyone. z orders the drawing (higher is in front); `depth` [[t, z], …]
// changes it at those times, each z holding until the next. Rigs: fish (tail swish
// and bob), glide (slow tilt and bob), float (the submarine), jelly (pulse), walk
// (the crab's steps), sit and still. Rates are cycles per loop. An actor with a
// `body` colour can be drawn in another (`tint`: a colour id, or a function of the
// settings and the loop).
export const ACTORS = [
  ...LAPS.map((_, i) => ({ id: `clown${i + 1}`, pic: 'clown', name: { en: 'clownfish', es: 'pez payaso' }, fish: true, n: i + 1,
    h: 0.11, z: 5, rig: 'fish', flick: 150 + 12 * i, bobs: 22 + i, seed: i * 0.23, keys: clownKeys(i), also: { hide: clownHide(i), more: clownMore(i) } })),

  // ---- Swimming past.
  // Over (24–32) and under (80–88): both slow to a crawl going the same way, the
  // shark overtaking, so they stay one above the other for the whole moment.
  { id: 'turtle', in: 'past', pic: 'turtle', frames: 'projects/motion/turtle-swim', name: { en: 'turtle', es: 'tortuga' }, h: 0.19, z: 3, rig: 'glide', strokes: 48, bobs: 18, seed: 0.1,
    keys: [[10, -0.35, 0.26], [24, 0.42, 0.25], [32, 0.52, 0.25], [48, 1.35, 0.23], [66, 1.35, 0.70], [80, 0.51, 0.70], [88, 0.43, 0.70], [104, -0.35, 0.70]] },
  { id: 'shark', in: 'past', pic: 'shark', name: { en: 'shark', es: 'tiburón' }, fish: true, h: 0.22, z: 2, rig: 'fish', flick: 36, bobs: 16, seed: 0.35,
    keys: [[12, -0.40, 0.53], [24, 0.36, 0.55], [32, 0.58, 0.55], [46, 1.40, 0.52], [68, 1.40, 0.42], [80, 0.57, 0.42], [88, 0.37, 0.42], [102, -0.40, 0.44]] },

  // Fast and slow (52–62): the slow one crawls across the middle while the fast one
  // zig-zags above it, never across it.
  { id: 'slow', in: 'past', pic: 'slow', name: { en: 'pufferfish', es: 'pez globo' }, fish: true, h: 0.14, z: 3, rig: 'fish', flick: 90, bobs: 20, seed: 0.6,
    keys: [[40, 1.30, 0.60], [52, 0.58, 0.60], [62, 0.42, 0.61], [76, -0.30, 0.60], [76, 1.30, 0.60]] },
  { id: 'fast', in: 'past', pic: 'fast', name: { en: 'red fish', es: 'pez rojo' }, fish: true, h: 0.08, z: 6, rig: 'fish', flick: 330, bobs: 30, seed: 0.2,
    keys: [[47, -0.25, 0.36], [52.5, 0.90, 0.34], [57, 0.32, 0.30], [61.5, 0.90, 0.40], [67, -0.25, 0.36]] },

  // The submarine (colour, 102–114): across the top, then back to the left off screen.
  { id: 'sub', in: 'past', pic: 'sub', name: { en: 'submarine', es: 'submarino' }, h: 0.22, z: 4, rig: 'float', bobs: 15, seed: 0.5, trail: 100,
    body: BODY, tint: (s, loop) => subColour(s, loop),
    keys: [[92, -0.30, 0.17], [102, 0.34, 0.16], [114, 0.80, 0.17], [119, 1.30, 0.16], [119, -0.30, 0.17]] },

  // ---- Hide and seek.
  // Through (27–35): a blue fish comes down into the gap between the chest and the
  // arch, crawls left to right behind the arch's legs, whole in its opening on the
  // way, and leaves over the top.
  { id: 'blue', in: 'hide', pic: 'butterfly', name: { en: 'blue fish', es: 'pez azul' }, fish: true, h: 0.065, z: 1.5, rig: 'fish', flick: 120, bobs: 24, seed: 0.3,
    body: '#c1a1a5', tint: 'blue',
    keys: [[16, 1.25, 0.36], [22, 0.62, 0.50], [26, 0.50, 0.815], [27, 0.515, 0.815], [35, 0.742, 0.815], [40, 0.70, 0.58], [52, 1.25, 0.40], [52, 1.25, 0.36]] },

  // ---- A school of fish.
  ...Array.from({ length: SCHOOL.n }, (_, i) => ({ id: `school${i + 1}`, in: 'school', pic: 'butterfly', name: { en: 'fish', es: 'pez' }, fish: true, spot: i,
    h: SCHOOL.h, z: 6, rig: 'fish', flick: 140 + 10 * (i % 5), bobs: 20 + (i % 4), seed: i * 0.19, body: '#c1a1a5', tint: 'purple', keys: schoolKeys(i) })),

  // ---- Big and little.
  // The pufferfish drifts in little (20–28), the red fish zooms past, and it swells
  // (33.5–37) to be big (38–46). Its size goes back while it is out of sight.
  { id: 'puff', in: 'size', pic: 'slow', name: { en: 'pufferfish', es: 'pez globo' }, fish: true, h: 0.17, z: 3, rig: 'fish', flick: 90, bobs: 20, seed: 0.6,
    keys: [[13, 1.30, 0.50, 0.41], [20, 0.66, 0.50, 0.41], [28, 0.60, 0.50, 0.41], [33.5, 0.565, 0.50, 0.41], [37, 0.545, 0.50, 1], [38, 0.54, 0.50, 1], [46, 0.48, 0.50, 1], [57, -0.30, 0.50, 1], [57, 1.30, 0.50, 0.41]] },
  { id: 'zoom', in: 'size', pic: 'fast', name: { en: 'red fish', es: 'pez rojo' }, fish: true, h: 0.08, z: 6, rig: 'fish', flick: 330, bobs: 30, seed: 0.2,
    keys: [[30, -0.25, 0.42], [36, 1.25, 0.36], [36, -0.25, 0.42]] },
  // The submarine dives (58–66) and climbs back (72–80), nose first.
  { id: 'diver', in: 'size', pic: 'sub', name: { en: 'submarine', es: 'submarino' }, h: 0.22, z: 4, rig: 'float', dives: true, bobs: 15, seed: 0.5, trail: 100,
    body: BODY, tint: (s, loop) => subColour(s, loop),
    keys: [[49, -0.30, 0.17], [57, 0.33, 0.17], [67, 0.43, 0.56], [71, 0.47, 0.58], [81, 0.57, 0.19], [91, 1.30, 0.17], [91, -0.30, 0.17]] },
  // One picture at two sizes, crossing together (94–104), above the clownfish.
  { id: 'bigfish', in: 'size', pic: 'angel', name: { en: 'big fish', es: 'pez grande' }, fish: true, h: 0.24, z: 6, rig: 'fish', flick: 40, bobs: 14, seed: 0.3,
    keys: [[84, 1.35, 0.25], [94, 0.62, 0.25], [104, 0.42, 0.25], [114, -0.35, 0.25], [114, 1.35, 0.25]] },
  { id: 'littlefish', in: 'size', pic: 'angel', name: { en: 'little fish', es: 'pez pequeño' }, fish: true, h: 0.09, z: 6.1, rig: 'fish', flick: 120, bobs: 26, seed: 0.7,
    keys: [[84, 1.52, 0.31], [94, 0.79, 0.31], [104, 0.59, 0.31], [114, -0.26, 0.31], [114, 1.52, 0.31]] },

  // ---- One more.
  // A purple visitor joins the clownfish at a sixth spot (one more 18–26, different
  // 28–36) and swims off (take away 44–52).
  { id: 'visitor', in: 'more', pic: 'visitor', name: { en: 'purple fish', es: 'pez morado' }, fish: true, h: 0.11, z: 5, rig: 'fish', flick: 110, bobs: 21, seed: 0.45,
    body: '#c1a1a5', tint: 'purple', keys: [[13, 1.25, 0.20], [17.5, 0.62, 0.42], [36, 0.62, 0.42], [42, 1.25, 0.20]] },
  // First, next, last (60–72): three in a line, right to left, above the clownfish.
  ...[0, 1, 2].map((i) => ({ id: `line${i + 1}`, in: 'more', pic: 'butterfly', name: { en: 'fish', es: 'pez' }, fish: true, h: 0.12, z: 6, rig: 'fish', flick: 110, bobs: 24, seed: 0.2 * i,
    body: '#c1a1a5', tint: (s, loop) => lineColour(i, s, loop),
    keys: [[54, 1.25 + 0.13 * i, 0.26], [60, 0.66 + 0.13 * i, 0.26], [72, 0.30 + 0.13 * i, 0.26], [84, -0.60 + 0.13 * i, 0.26], [84, 1.25 + 0.13 * i, 0.26]] })),
  // Stripes and spots (88–98): the pufferfish stops beside the clownfish.
  { id: 'spots', in: 'more', pic: 'slow', name: { en: 'pufferfish', es: 'pez globo' }, fish: true, h: 0.14, z: 3, rig: 'fish', flick: 90, bobs: 20, seed: 0.6,
    keys: [[80, 1.30, 0.48], [88, 0.60, 0.48], [98, 0.585, 0.48], [110, 1.30, 0.30]] },

  // The humpback (enormous, 104–111): so big it is never all on the stage. It passes
  // behind everything, the sea floor's pieces too, after the clownfish have hidden.
  { id: 'whale', in: 'hide', pic: 'whale', name: { en: 'whale', es: 'ballena' }, h: 0.88, z: 0.2, rig: 'glide', bobs: 6, seed: 0.2,
    keys: [[97, 1.72, 0.37], [119, -0.72, 0.37], [119, 1.72, 0.37]] },

  // Ambient, at the left where the strip may cover them.
  // The jellyfish wanders the left third of the water, top to bottom, the same in
  // every loop, and keeps clear of whatever a moment is about (check.mjs proves it).
  // Its bell pulses and its strands (below `hang` of its height) sway as they trail.
  { id: 'jelly', pic: 'jelly', name: { en: 'jellyfish', es: 'medusa' }, h: 0.20, z: 1.5, rig: 'jelly', turn: false, pulse: 30, sway: 36, hang: 0.44, seed: 0,
    keys: [[0, 0.13, 0.58], [16, 0.22, 0.24], [34, 0.27, 0.42], [50, 0.12, 0.20], [66, 0.10, 0.46], [82, 0.14, 0.60], [100, 0.17, 0.34]] },
  // The octopus's eight arms each swing from their root, on their own rhythm (see
  // splitArms and armAngle at the foot of this file).
  { id: 'octopus', pic: 'octopus', name: { en: 'octopus', es: 'pulpo' }, h: 0.15, z: 2, rig: 'sit', turn: false, foot: true, seed: 0.7,
    arms: { hub: [0.5, 0.32], r: 0.28, from: 0.40, body: '#fc9c54', swing: 0.10 },
    keys: [[0, 0.15, 0.905]] },
  // The crab is at rest at the same spot where every loop joins. Swimming past: it
  // walks to the gap between the chest and the arch and back, four times. Hide and
  // seek: it tours the chest. In front of it (15–23), up its side and on the lid
  // (40–48), down between the chest and the arch (55–63), where it goes to the back
  // of the sand in the open, then behind the chest with its claws over the lid
  // (71–79), and home the way it came. Big and little: it walks as in Swimming past
  // but is home early and stands still (108–116), until the next loop starts.
  { id: 'crab', pic: 'crab', body: '#da704e', frames: 'projects/motion/crab-walk', rest: 2, name: { en: 'crab', es: 'cangrejo' }, h: 0.10, z: 5.5, rig: 'walk', turn: false, foot: true, period: 30, steps: 240, seed: 0.4,
    keys: [[0, 0.36, 0.93], [12, 0.52, 0.93], [15, 0.52, 0.93], [27, 0.36, 0.93]],
    also: { size: { period: LOOP, keys: [[0, 0.36, 0.93], [12, 0.52, 0.93], [15, 0.52, 0.93], [27, 0.36, 0.93], [30, 0.36, 0.93], [42, 0.52, 0.93], [45, 0.52, 0.93], [57, 0.36, 0.93],
        [60, 0.36, 0.93], [72, 0.52, 0.93], [75, 0.52, 0.93], [87, 0.36, 0.93], [90, 0.36, 0.93], [98, 0.52, 0.93], [100, 0.52, 0.93], [107, 0.36, 0.93]] },
      hide: { period: LOOP, depth: [[0, 5.5], [64.5, 0.5], [85.5, 5.5]],
      keys: [[0, 0.36, 0.93], [9, 0.36, 0.93], [13, 0.417, 0.93], [31, 0.417, 0.93], [34.5, 0.487, 0.90], [39.5, 0.417, 0.79], [49, 0.417, 0.79], [54, 0.499, 0.89], [64.5, 0.499, 0.89],
        [70, 0.417, 0.86], [80, 0.417, 0.86], [85, 0.499, 0.89], [86, 0.499, 0.89], [98, 0.36, 0.93], [117, 0.36, 0.93]] } } },
  { id: 'starfish', pic: 'starfish', name: { en: 'starfish', es: 'estrella de mar' }, h: 0.075, z: 2, rig: 'still', turn: false, foot: true,
    keys: [[0, 0.64, 0.955]] },
]

// The cast of loop number `loop` for these settings: only the first n clownfish,
// only that loop's visitors, each moving as it does in that loop.
const variants = new Map()
function inLoop(a, id) {
  if (!a.also?.[id]) return a
  const key = `${a.id}|${id}`
  if (!variants.has(key)) variants.set(key, { ...a, ...a.also[id] })
  return variants.get(key)
}
export const cast = (s, loop = 0) => {
  const id = loopOf(s, loop)
  return ACTORS.filter((a) => (!a.n || a.n <= s.clownfish) && (!a.in || a.in === id)).map((a) => inLoop(a, id))
}
// One actor as it is in the loop called `id` (the first loop it is in, if not given).
export const byId = (id, loop) => { const a = ACTORS.find((x) => x.id === id); return a && inLoop(a, loop || a.in || LOOPS[0].id) }
// How far forward the actor is drawn at time t.
export function zAt(a, t) {
  if (!a.depth) return a.z
  const tt = wrap(t, a.period || LOOP)
  let z = a.depth[a.depth.length - 1][1]
  for (const [k, v] of a.depth) if (k <= tt) z = v
  return z
}
// The colour an actor is drawn in (a hex), or null for the picture as it is.
export function tintOf(a, s, loop) {
  if (!a.body || !a.tint) return null
  const hex = colourOf(typeof a.tint === 'function' ? a.tint(s, loop) : a.tint).hex
  return hex === a.body ? null : hex
}

// ---- Scenery. Pictures from the reef sheet stand on the sand (x is their middle,
// base their bottom, h their height); a `sway` one moves its top, the others are
// still. Seaweed is drawn by the page.
// The reef is the same in every loop. The chest and the arch are `among` the actors:
// drawn in order with them, so the crab can go behind the chest and a fish behind
// the arch's legs. The others are behind everything. The chest has a crab-wide gap
// to the arch; the arch is big enough for a small fish to show whole in its opening,
// and stands right of where the turtle and shark hold for over and under.
export const SCENERY = [
  { id: 'rock', pic: 'rock', x: 0.065, base: SAND + 0.035, h: 0.12, z: 1 },
  { id: 'weed-left', kind: 'weed', x: 0.21, base: SAND + 0.02, w: 0.06, h: 0.32, z: 1, blades: 3, sway: 20, seed: 0.1 },
  { id: 'weed-mid', kind: 'weed', x: 0.225, base: SAND + 0.02, w: 0.04, h: 0.15, z: 1, blades: 2, sway: 15, seed: 0.5 },
  { id: 'weed-right', kind: 'weed', x: 0.255, base: SAND + 0.02, w: 0.05, h: 0.24, z: 1, blades: 3, sway: 20, seed: 0.8 },
  { id: 'branch', pic: 'branch', x: 0.305, base: SAND + 0.03, h: 0.17, z: 1 },
  { id: 'scallop', pic: 'scallop', x: 0.30, base: 0.955, h: 0.065, z: 1 },
  { id: 'chest', pic: 'chest', name: { en: 'chest', es: 'cofre' }, x: 0.417, base: SAND + 0.04, h: 0.09, z: 1, among: true },
  { id: 'arch', pic: 'arch', name: { en: 'arch', es: 'arco' }, x: 0.63, base: SAND + 0.035, h: 0.20, z: 1.8, among: true },
  { id: 'brain', pic: 'brain', x: 0.955, base: SAND + 0.035, h: 0.10, z: 1 },
  { id: 'anemone', pic: 'anemone', x: ANEMONE, base: SAND + 0.03, h: 0.17, z: 4, sway: 24, amp: 0.012, seed: 0.3 },
  { id: 'weed-front', kind: 'weed', x: 0.02, base: 1.03, w: 0.07, h: 0.44, z: 8, blades: 3, sway: 15, seed: 0.2 },
]

// Bubbles rising from the chest, the arch and the brain coral; `per` is bubbles per loop.
export const STREAMS = [
  { x: 0.417, y: SAND - 0.03, per: 24, rise: 0.06, r: 0.011, seed: 1 },
  { x: 0.63, y: SAND - 0.13, per: 12, rise: 0.05, r: 0.007, seed: 2 },
  { x: 0.955, y: SAND - 0.05, per: 15, rise: 0.05, r: 0.007, seed: 3 },
]

// ---- The question moments. `test` is what check.mjs proves for the whole moment;
// Next question lands on `from`.
//
// Every moment has a card with two faces. To say: the concept `word`, one model
// sentence (`say`) and an open starter for the children (`start`). To ask: `ask` and
// its `answer`. A moment with no `ask` is comment only. Any of them may be a function
// of the settings and the loop; tell() resolves them.
const NUM = { 1: ['one', 'uno'], 2: ['two', 'dos'], 3: ['three', 'tres'], 4: ['four', 'cuatro'], 5: ['five', 'cinco'], 6: ['six', 'seis'] }
const START = {
  see: { en: 'I see…', es: 'Veo…' }, look: { en: 'Look!', es: '¡Mira!' }, like: { en: 'I like…', es: 'Me gusta…' },
  who: { en: 'Who is it?', es: '¿Quién es?' }, bye: { en: 'Bye-bye…', es: 'Adiós…' }, think: { en: 'I think…', es: 'Creo que…' },
  wonder: { en: 'I wonder…', es: 'Me pregunto…' }, uhoh: { en: 'Uh-oh!', es: '¡Oh, oh!' },
}
const fishEs = (n) => (n === 1 ? 'un pez payaso' : `${NUM[n][1]} peces payaso`)
const HOW_MANY_NOW = { en: 'How many fish now?', es: '¿Cuántos peces hay ahora?' }
const BIG_LITTLE = { en: 'Is the pufferfish big or little?', es: '¿El pez globo es grande o pequeño?' }
const UP_DOWN = { en: 'Is the submarine going up or down?', es: '¿El submarino sube o baja?' }
const WHERE_CRAB = { en: 'Where is the crab?', es: '¿Dónde está el cangrejo?' }
const OVER_UNDER = { en: 'Is the turtle over or under the shark?', es: '¿La tortuga está encima o debajo del tiburón?' }
const made = (kind, askEn, askEs) => (wordEn, wordEs, sayEn, sayEs, start) => ({
  word: { en: wordEn, es: wordEs }, say: { en: `The fish make ${sayEn}.`, es: `Los peces forman ${sayEs}.` }, start,
  ask: { en: askEn, es: askEs }, answer: { en: sayEn, es: sayEs } })
const aShape = made('shape', 'What shape do the fish make?', '¿Qué forma hacen los peces?')
const SCHOOL_CARDS = {
  circle: aShape('circle', 'círculo', 'a circle', 'un círculo', START.wonder),
  triangle: aShape('triangle', 'triángulo', 'a triangle', 'un triángulo', START.see),
  square: aShape('square', 'cuadrado', 'a square', 'un cuadrado', START.look),
  three: made('number', 'What number do the fish make?', '¿Qué número forman los peces?')('three', 'tres', 'the number three', 'el número tres', START.think),
  L: made('letter', 'What letter do the fish make?', '¿Qué letra forman los peces?')('L', 'L', 'the letter L', 'la letra L', START.see),
}
export const MOMENTS = [
  { id: 'count', from: COUNT[0], to: COUNT[1], test: ['count', 'clown'],
    word: (s) => ({ en: NUM[s.clownfish][0], es: NUM[s.clownfish][1] }),
    say: (s) => ({ en: `I see ${NUM[s.clownfish][0]} clownfish.`, es: `Veo ${fishEs(s.clownfish)}.` }), start: START.see,
    ask: { en: 'How many clownfish do you see?', es: '¿Cuántos peces payaso ves?' },
    answer: (s) => ({ en: NUM[s.clownfish][0], es: NUM[s.clownfish][1] }) },
  { id: 'over', in: 'past', from: 24, to: 32, test: ['over', 'turtle', 'shark'],
    word: { en: 'over', es: 'encima' }, say: { en: 'The turtle is over the shark.', es: 'La tortuga está encima del tiburón.' }, start: START.look,
    ask: OVER_UNDER, answer: () => ({ en: 'over', es: 'encima' }) },
  { id: 'speed', in: 'past', from: 52, to: 62, test: ['faster', 'fast', 'slow'],
    word: { en: 'fast, slow', es: 'rápido, lento' },
    say: { en: 'The red fish is fast. The pufferfish is slow.', es: 'El pez rojo es rápido. El pez globo es lento.' }, start: START.see,
    ask: { en: 'Which fish is fast? Which is slow?', es: '¿Qué pez es rápido? ¿Cuál es lento?' },
    answer: () => {
      const f = byId('fast').name, s = byId('slow').name
      return { en: `the ${f.en} is fast, the ${s.en} is slow`, es: `el ${f.es} es rápido, el ${s.es} es lento` }
    } },
  // Comment only: the turtle's second entrance, at the right, clear of the strip.
  { id: 'hello', in: 'past', from: 69, to: 76, test: ['enters', 'turtle'],
    word: { en: 'here comes', es: 'ahí viene' }, say: { en: 'Here comes the turtle!', es: '¡Ahí viene la tortuga!' }, start: START.who },
  { id: 'under', in: 'past', from: 80, to: 88, test: ['over', 'shark', 'turtle'],
    word: { en: 'under', es: 'debajo' }, say: { en: 'The turtle is under the shark.', es: 'La tortuga está debajo del tiburón.' }, start: START.look,
    ask: OVER_UNDER, answer: () => ({ en: 'under', es: 'debajo' }) },
  { id: 'colour', in: 'past', from: 102, to: 114, test: ['seen', 'sub'],
    word: (s, loop) => { const c = colourOf(subColour(s, loop)); return { en: c.en, es: c.es } },
    say: (s, loop) => { const c = colourOf(subColour(s, loop)); return { en: `The submarine is ${c.en}.`, es: `El submarino es ${c.es}.` } }, start: START.like,
    ask: { en: 'What colour is the submarine?', es: '¿De qué color es el submarino?' },
    answer: (s, loop) => { const c = colourOf(subColour(s, loop)); return { en: c.en, es: c.es } } },
  // Comment only: the submarine leaves at the right.
  { id: 'bye', in: 'past', from: 114, to: 119, test: ['leaves', 'sub'],
    word: { en: 'bye-bye', es: 'adiós' }, say: { en: 'Bye-bye, submarine!', es: '¡Adiós, submarino!' }, start: START.bye },

  // ---- Hide and seek: place words. Where is the crab? has a new answer each time.
  { id: 'front', in: 'hide', from: 15, to: 23, test: ['infront', 'crab', 'chest'],
    word: { en: 'in front of', es: 'delante de' }, say: { en: 'The crab is in front of the chest.', es: 'El cangrejo está delante del cofre.' }, start: START.see,
    ask: WHERE_CRAB, answer: { en: 'in front of the chest', es: 'delante del cofre' } },
  { id: 'through', in: 'hide', from: 27, to: 35, test: ['through', 'blue', 'arch'],
    word: { en: 'through', es: 'a través de' }, say: { en: 'The fish swims through the arch.', es: 'El pez pasa por el arco.' }, start: START.think,
    ask: { en: 'Where does the fish swim?', es: '¿Por dónde nada el pez?' }, answer: { en: 'through the arch', es: 'por el arco' } },
  { id: 'on', in: 'hide', from: 40, to: 48, test: ['on', 'crab', 'chest'],
    word: { en: 'on', es: 'sobre' }, say: { en: 'The crab is on the chest.', es: 'El cangrejo está sobre el cofre.' }, start: START.uhoh,
    ask: WHERE_CRAB, answer: { en: 'on the chest', es: 'sobre el cofre' } },
  { id: 'between', in: 'hide', from: 55, to: 63, test: ['gap', 'crab', 'chest', 'arch'],
    word: { en: 'between', es: 'entre' }, say: { en: 'The crab is between the chest and the arch.', es: 'El cangrejo está entre el cofre y el arco.' }, start: START.look,
    ask: WHERE_CRAB, answer: { en: 'between the chest and the arch', es: 'entre el cofre y el arco' } },
  { id: 'behind', in: 'hide', from: 71, to: 79, test: ['behind', 'crab', 'chest'],
    word: { en: 'behind', es: 'detrás de' }, say: { en: 'The crab is behind the chest.', es: 'El cangrejo está detrás del cofre.' }, start: START.see,
    ask: WHERE_CRAB, answer: { en: 'behind the chest', es: 'detrás del cofre' } },
  { id: 'in', in: 'hide', from: 86, to: 96, test: ['inside', 'clown', 'anemone'],
    word: { en: 'in', es: 'dentro de' },
    say: (s) => (s.clownfish === 1 ? { en: 'The clownfish is in the anemone.', es: 'El pez payaso está dentro de la anémona.' } : { en: 'The clownfish are in the anemone.', es: 'Los peces payaso están dentro de la anémona.' }), start: START.wonder,
    ask: (s) => (s.clownfish === 1 ? { en: 'Where is the clownfish?', es: '¿Dónde está el pez payaso?' } : { en: 'Where are the clownfish?', es: '¿Dónde están los peces payaso?' }),
    answer: { en: 'in the anemone', es: 'dentro de la anémona' } },
  { id: 'whale', in: 'hide', from: 104, to: 111, test: ['passing', 'whale'],
    word: { en: 'enormous', es: 'enorme' }, say: { en: 'The whale is enormous!', es: '¡La ballena es enorme!' }, start: START.look,
    ask: { en: 'Can you see all of the whale?', es: '¿Puedes ver toda la ballena?' }, answer: { en: 'no, it is too big', es: 'no, es demasiado grande' } },

  // ---- Big and little: opposites, and one thing changing.
  { id: 'little', in: 'size', from: 20, to: 28, test: ['sized', 'puff', 'little'],
    word: { en: 'little', es: 'pequeño' }, say: { en: 'The pufferfish is little.', es: 'El pez globo es pequeño.' }, start: START.see,
    ask: BIG_LITTLE, answer: { en: 'little', es: 'pequeño' } },
  { id: 'big', in: 'size', from: 38, to: 46, test: ['sized', 'puff', 'big'],
    word: { en: 'big', es: 'grande' }, say: { en: 'Now the pufferfish is big!', es: '¡Ahora el pez globo es grande!' }, start: START.uhoh,
    ask: BIG_LITTLE, answer: { en: 'big', es: 'grande' } },
  { id: 'down', in: 'size', from: 58, to: 66, test: ['heading', 'diver', 'down'],
    word: { en: 'down', es: 'abajo' }, say: { en: 'The submarine goes down.', es: 'El submarino baja.' }, start: START.look,
    ask: UP_DOWN, answer: { en: 'down', es: 'baja' } },
  { id: 'up', in: 'size', from: 72, to: 80, test: ['heading', 'diver', 'up'],
    word: { en: 'up', es: 'arriba' }, say: { en: 'The submarine goes up.', es: 'El submarino sube.' }, start: START.look,
    ask: UP_DOWN, answer: { en: 'up', es: 'sube' } },
  { id: 'pair', in: 'size', from: 94, to: 104, test: ['bigger', 'bigfish', 'littlefish'],
    word: { en: 'big, little', es: 'grande, pequeño' }, say: { en: 'A big fish and a little fish.', es: 'Un pez grande y un pez pequeño.' }, start: START.see,
    ask: { en: 'One fish is big. What is the other?', es: 'Un pez es grande. ¿Cómo es el otro?' }, answer: { en: 'little', es: 'pequeño' } },
  { id: 'stop', in: 'size', from: 108, to: 116, test: ['still', 'crab'],
    word: { en: 'stop', es: 'parar' }, say: { en: 'The crab stops.', es: 'El cangrejo se detiene.' }, start: START.look,
    ask: { en: 'Is the crab walking or stopped?', es: '¿El cangrejo camina o está quieto?' }, answer: { en: 'stopped', es: 'quieto' } },

  // ---- One more: number, order, colours and patterns.
  { id: 'more', in: 'more', from: 18, to: 26, test: ['count', 'clown', 'visitor'],
    word: { en: 'one more', es: 'uno más' },
    say: (s) => ({ en: `One more fish! Now there are ${NUM[s.clownfish + 1][0]}.`, es: `¡Un pez más! Ahora hay ${NUM[s.clownfish + 1][1]}.` }), start: START.see,
    ask: HOW_MANY_NOW, answer: (s) => ({ en: NUM[s.clownfish + 1][0], es: NUM[s.clownfish + 1][1] }) },
  { id: 'different', in: 'more', from: 28, to: 36, test: ['odd', 'clown', 'visitor'],
    word: { en: 'different', es: 'diferente' }, say: { en: 'One fish is different. It is purple.', es: 'Un pez es diferente. Es morado.' }, start: START.look,
    ask: (s) => (s.clownfish === 1 ? { en: 'Are the two fish the same or different?', es: '¿Los dos peces son iguales o diferentes?' } : { en: 'Which fish is different?', es: '¿Qué pez es diferente?' }),
    answer: (s) => (s.clownfish === 1 ? { en: 'different', es: 'diferentes' } : { en: 'the purple one', es: 'el morado' }) },
  { id: 'away', in: 'more', from: 44, to: 52, test: ['count', 'clown'],
    word: { en: 'take away', es: 'quitar' },
    say: (s) => ({ en: `One fish swam away. Now there ${s.clownfish === 1 ? 'is' : 'are'} ${NUM[s.clownfish][0]}.`, es: `Un pez se fue. Ahora hay ${NUM[s.clownfish][1]}.` }), start: START.bye,
    ask: HOW_MANY_NOW, answer: (s) => ({ en: NUM[s.clownfish][0], es: NUM[s.clownfish][1] }) },
  { id: 'line', in: 'more', from: 60, to: 72, test: ['line', 'line1', 'line2', 'line3'],
    word: { en: 'first, next, last', es: 'primero, siguiente, último' },
    say: (s, loop) => { const a = colourOf(lineColour(0, s, loop)), c = colourOf(lineColour(2, s, loop)); return { en: `The ${a.en} fish is first. The ${c.en} fish is last.`, es: `El pez ${a.es} va primero. El pez ${c.es} va último.` } }, start: START.see,
    ask: { en: 'Which fish is first? Which is last?', es: '¿Qué pez va primero? ¿Cuál va último?' },
    answer: (s, loop) => { const a = colourOf(lineColour(0, s, loop)), c = colourOf(lineColour(2, s, loop)); return { en: `the ${a.en} fish is first, the ${c.en} fish is last`, es: `el pez ${a.es} va primero, el pez ${c.es} va último` } } },
  { id: 'pattern', in: 'more', from: 88, to: 98, test: ['shown', 'spots', 'clown'],
    word: { en: 'stripes, spots', es: 'rayas, manchas' },
    say: (s) => (s.clownfish === 1 ? { en: 'The clownfish has stripes. The pufferfish has spots.', es: 'El pez payaso tiene rayas. El pez globo tiene manchas.' } : { en: 'The clownfish have stripes. The pufferfish has spots.', es: 'Los peces payaso tienen rayas. El pez globo tiene manchas.' }), start: START.see,
    ask: { en: 'Which fish has spots?', es: '¿Qué pez tiene manchas?' }, answer: { en: 'the pufferfish', es: 'el pez globo' } },
  { id: 'red', in: 'more', from: 104, to: 112, test: ['named', 'crab', 'red'],
    word: { en: 'red', es: 'rojo' }, say: { en: 'The crab is red.', es: 'El cangrejo es rojo.' }, start: START.like,
    ask: { en: 'What colour is the crab?', es: '¿De qué color es el cangrejo?' }, answer: { en: 'red', es: 'rojo' } },

  // ---- A school of fish: shapes, a number and a letter.
  ...HELD.map(([shape, from, to]) => ({ id: shape, in: 'school', from, to, test: ['shape', 'butterfly', shape], ...SCHOOL_CARDS[shape] })),
]
// The moments of loop number `loop`, in order, and the one showing at time t.
export const momentsOf = (s, loop = 0) => { const id = loopOf(s, loop); return MOMENTS.filter((m) => !m.in || m.in === id).sort((p, q) => p.from - q.from) }
export const momentAt = (t, s = DEFAULTS, loop = 0) => momentsOf(s, loop).find((m) => t >= m.from && t < m.to) || null
// What a moment is about: the actors, as they are in its loop, and the reef pieces.
export function subjects(m, s, loop = 0) {
  const all = cast(s, loop), out = { actors: [], reef: [] }
  for (const id of m.test.slice(1)) {
    const a = all.filter((x) => x.id === id || x.pic === id), o = SCENERY.find((x) => x.id === id)
    out.actors.push(...a); if (o) out.reef.push(o)
  }
  return out
}
// A moment's card for these settings: word, say and start always; ask and answer
// together, or neither.
const val = (v, s, loop) => (typeof v === 'function' ? v(s, loop) : v)
export const tell = (m, s, loop = 0) => ({
  word: val(m.word, s, loop), say: val(m.say, s, loop), start: val(m.start, s, loop),
  ask: m.ask ? val(m.ask, s, loop) : null, answer: m.answer ? val(m.answer, s, loop) : null,
})

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
  // A fourth number in a key is the actor's size there, as a share of its `h`.
  const Z = K.some((k) => k.length > 3) ? K.map((k) => k[3] ?? 1) : null
  // Which way each stretch faces: +1 as drawn (moving left), -1 mirrored (moving
  // right). A hold keeps the way it was facing.
  const dir = K.map((_, i) => (n === 1 || span[i] === 0 ? 0 : Math.sign(Math.round((X[(i + 1) % n] - X[i]) * 1e6))))
  const face = new Array(n).fill(1)
  const last = [...dir].reverse().find((d) => d)
  let f = last ? (last < 0 ? 1 : -1) : 1
  for (let i = 0; i < n; i++) { if (dir[i]) f = dir[i] < 0 ? 1 : -1; face[i] = f }
  const turns = []
  if (a.turn !== false) for (let i = 0; i < n; i++) if (face[i] !== face[(i - 1 + n) % n]) turns.push({ t: T[i], before: face[(i - 1 + n) % n] })
  p = { P, n, T, span, X, Y, Z, mx: tangent(X), my: tangent(Y), mz: Z && tangent(Z), face, turns }
  prepared.set(a, p)
  return p
}

// Where the actor is on its path at time t (any real number): x, y, their speeds
// per second, and which way it faces (sx).
export function track(a, t) {
  const p = prep(a), tt = wrap(t, p.P)
  if (p.n === 1) return { x: p.X[0], y: p.Y[0], vx: 0, vy: 0, sx: 1, seg: 0, size: 1 }
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
  return { x: herm(p.X, p.mx), y: herm(p.Y, p.my), vx: slope(p.X, p.mx), vy: slope(p.Y, p.my), sx, seg: i, size: p.Z ? herm(p.Z, p.mz) : 1 }
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
    // A diver noses down and up, so a frozen screen still shows which way it goes.
    if (a.dives) rot += right * clamp(Math.atan2(k.vy, Math.abs(k.vx) * A) * 0.6, -0.3, 0.3)
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
  return { x, y, sx: k.sx, rot, phase, moving, vx: k.vx, vy: k.vy, size: k.size }
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
  // An opening under the drawing (the arch's): below the lowest opaque pixel of the
  // middle column, the clear run of each row. As shares of the box: `mid` is its top
  // in the middle, and l, r, t the rectangle that is clear below its top quarter.
  let hole = null
  const mid = left + Math.floor(bw / 2), solid = (x, y) => alpha[(y * w + x) * step + off] > 127
  let under = -1
  for (let y = top; y <= bottom; y++) if (solid(mid, y)) under = y
  if (under >= 0 && under < bottom - 2) {
    let L = left, R = right
    for (let y = under + 1 + Math.round((bottom - under) * 0.25); y <= bottom; y++) {
      let l = mid, r = mid
      while (l > left && !solid(l - 1, y)) l--
      while (r < right && !solid(r + 1, y)) r++
      L = Math.max(L, l); R = Math.min(R, r)
    }
    hole = { l: (L - left) / bw, r: (R + 1 - left) / bw, t: (under + 1 + (bottom - under) * 0.25 - top) / bh, mid: (under + 1 - top) / bh }
  }
  return { w, h, box: { x: left, y: top, w: bw, h: bh }, tail, hole }
}

// The actor's drawing on the stage at this pose (widths across, heights down),
// grown a little for its tilt. A single picture is anchored at its middle, or at
// its feet for a `foot` actor; a frame set carries its own box around its anchor.
export function boxAt(a, pose, m) {
  const k = a.h * (pose.size ?? 1) / (m.ref || m.box.h)   // stage heights per picture pixel
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
// A reef picture's opening on the stage: clear from l to r below t, and up to `mid`
// in the middle.
export function openingBox(o, m) {
  const b = sceneryBox(o, m), w = b.r - b.l
  return { l: b.l + m.hole.l * w, r: b.l + m.hole.r * w, t: b.t + m.hole.t * o.h, mid: b.t + m.hole.mid * o.h, b: b.b }
}
// Where a reef piece is drawn among the actors. The ones an actor can go behind
// (seaweed, the anemone, the chest, the arch) are at their own z; the rest are a
// touch further back, behind every animal but the whale.
export const amongActors = (o) => o.kind === 'weed' || o.sway || o.among
export const reefZ = (o) => (amongActors(o) ? o.z : o.z - 0.001)
export const inSeen = (b) => b.r > SEEN.x[0] && b.l < SEEN.x[1] && b.b > SEEN.y[0] && b.t < SEEN.y[1]
export const onStage = (b) => b.l >= 0 && b.r <= 1 && b.t >= 0 && b.b <= 1

// ---- Bubbles: from each stream, and a trail behind the submarine while it is seen.
const hash = (i, salt) => { const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return v - Math.floor(v) }
export function bubblesAt(t, s, measures, loop = 0) {
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
  // A trail bubble belongs to the loop it was born in: those still rising from the
  // loop before, then this loop's own.
  for (const ago of [1, 0]) {
    const sub = cast(s, loop - ago).find((a) => a.trail)
    if (!sub || !measures?.[sub.pic]) continue
    const m = measures[sub.pic]
    for (let b = 0; b < sub.trail; b++) {
      const born = b * LOOP / sub.trail
      if ((born > t) !== (ago === 1)) continue
      const age = t - born + ago * LOOP
      const at = poseAt(sub, born), box = boxAt(sub, at, m)
      if (!inSeen(box) || age > 14) continue
      const back = at.sx < 0 ? box.l : box.r
      rise(b, back + (at.sx < 0 ? -0.01 : 0.01), at.y + 0.02 * (hash(b, 5) - 0.3), age, 0.006 + 0.004 * hash(b, 6), 0.055)
    }
  }
  return out
}

// ---- Arms. An actor with `arms` is drawn in parts: its body, and each arm swinging
// from where it joins the body. splitArms() finds them in the picture: the body
// colour is flood-filled with the outlines as walls, and with one more wall, an arc
// of a circle round `hub` (shares of the drawing's box; `r` a share of its height)
// below `from`, which cuts every arm off the body just above where the lines between
// the arms begin. Returns a label for every pixel (0 nothing, 1 the body, 2… the
// arms, in order from the left round to the right) and each arm's root.
export function splitArms(rgba, w, h, m, spec) {
  const b = m.box, cx = b.x + spec.hub[0] * b.w, cy = b.y + spec.hub[1] * b.h, R = spec.r * b.h, y0 = b.y + spec.from * b.h
  const fill = new Uint8Array(w * h), wall = new Uint8Array(w * h)
  const body = [1, 3, 5].map((i) => parseInt(spec.body.slice(i, i + 2), 16))
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 4
    if (rgba[p + 3] > 200 && Math.hypot(rgba[p] - body[0], rgba[p + 1] - body[1], rgba[p + 2] - body[2]) < 60) fill[i] = 1
    const d = Math.hypot(x - cx, y - cy)
    if (y > y0 && Math.abs(d - R) < 2) wall[i] = 1
  }
  const label = new Uint8Array(w * h), sizes = [0]
  const stack = new Int32Array(w * h)
  for (let s = 0; s < w * h; s++) {
    if (!fill[s] || wall[s] || label[s]) continue
    const id = sizes.length; let n = 0, top = 0
    stack[top++] = s; label[s] = id
    while (top) {
      const i = stack[--top], x = i % w; n++
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue
        if (fill[j] && !wall[j] && !label[j]) { label[j] = id; stack[top++] = j }
      }
    }
    sizes.push(n)
  }
  // The body is the piece holding the hub; arms are the other pieces of any size.
  const hubId = label[Math.round(cy - R * 0.5) * w + Math.round(cx)]
  const big = sizes.map((n, id) => ({ id, n })).filter((p) => p.id && p.id !== hubId && p.n > 0.004 * b.w * b.h)
  const arms = big.map((p) => {
    let sx = 0, sy = 0, n = 0, rx = 0, ry = 0, rn = 0
    for (let i = 0; i < w * h; i++) if (label[i] === p.id) {
      const x = i % w, y = (i - x) / w; sx += x; sy += y; n++
      if (Math.hypot(x - cx, y - cy) < R + 0.04 * b.h) { rx += x; ry += y; rn++ }
    }
    return { id: p.id, mx: sx / n, my: sy / n, px: rn ? rx / rn : sx / n, py: rn ? ry / rn : sy / n }
  }).sort((p, q) => Math.atan2(q.my - cy, q.mx - cx) - Math.atan2(p.my - cy, p.mx - cx))   // from the left, round underneath, to the right
  const out = new Uint8Array(w * h), to = new Map([[hubId, 1], ...arms.map((a, i) => [a.id, i + 2])])
  for (let i = 0; i < w * h; i++) if (label[i]) out[i] = to.get(label[i]) || 1
  return { labels: out, arms: arms.map((a) => ({ px: a.px, py: a.py })) }
}

// How far arm i (0 the leftmost) is swung at time t, in radians: a slow sway, each
// arm at its own whole number of swings a loop so the loops join, the two sides
// mirrored. A moment that moves one arm on purpose would add to this.
export function armAngle(a, i, t) {
  const n = 9 + ((i * 5) % 7), side = i < 4 ? 1 : -1
  return side * a.arms.swing * Math.sin(TAU * (n * t / LOOP + i * 0.29 + (a.seed || 0)))
}
