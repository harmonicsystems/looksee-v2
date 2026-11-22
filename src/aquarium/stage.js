// Copied from the picture library by scripts/aquarium.mjs. Do not edit here.
// Drawing the aquarium on a canvas: the water and sand (flat, in the style's own
// colours and brown outline), the scenery, every actor on its path with its rig,
// and the bubbles. The projector page and the animation guide both use it.
//
// The 16:9 stage always fits whole on the screen; on any other screen shape the
// water goes on above it and the sand below it (or both to the sides), so nothing is
// cropped and there are no bars.

import * as S from './scene.js'
import { FRAMES } from './frames.js'

const TAU = 2 * Math.PI
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a, b, k) => { const p = hexRgb(a), q = hexRgb(b); return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(',')})` }
const hash = (i, salt) => { const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return v - Math.floor(v) }
const newCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c }

// Load every picture in scene.js and every frame set its actors play, and measure
// each drawing.
async function loadPicture(src) {
  const img = new Image()
  img.src = src
  await img.decode()
  const c = newCanvas(img.naturalWidth, img.naturalHeight), g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const data = g.getImageData(0, 0, c.width, c.height)
  return { img, data, m: S.measure(data.data, c.width, c.height, 4, 3) }
}
export async function loadPictures(base = S.BASE) {
  const out = {}
  await Promise.all(Object.entries(S.PICS).map(async ([key, path]) => { out[key] = await loadPicture(base + path) }))
  await Promise.all([...new Set(S.ACTORS.filter((a) => a.frames).map((a) => a.frames))].map(async (dir) => {
    const spec = FRAMES[dir]
    const frames = await Promise.all(spec.frames.map(async (f) => ({ ...f, ...(await loadPicture(`${base}${dir}/${f.file}`)) })))
    out[dir] = { set: { frames, play: spec.play }, m: S.frameSetMeasure(frames, spec.play) }
  }))
  // An actor with arms: its picture split into the body and each arm.
  for (const a of S.ACTORS) if (a.arms && out[a.pic] && !out[a.pic].parts) out[a.pic].parts = armParts(out[a.pic].data, out[a.pic].m, a.arms)
  return out
}

// A picture in parts: each arm, then the body. A part is its own colour plus the
// outline round it (everything drawn within `edge` pixels that is not another
// part's colour), so two arms that share a line each keep it when they swing apart.
function armParts(src, m, spec, edge = 12) {
  const { width: w, height: h, data } = src
  const { labels, arms } = S.splitArms(data, w, h, m, spec)
  const part = (id) => {
    let x0 = w, y0 = h, x1 = -1, y1 = -1
    for (let i = 0; i < w * h; i++) if (labels[i] === id) { const x = i % w, y = (i - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    x0 = Math.max(0, x0 - edge - 1); y0 = Math.max(0, y0 - edge - 1); x1 = Math.min(w - 1, x1 + edge + 1); y1 = Math.min(h - 1, y1 + edge + 1)
    const pw = x1 - x0 + 1, ph = y1 - y0 + 1
    let mine = new Uint8Array(pw * ph)
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (labels[(y + y0) * w + x + x0] === id) mine[y * pw + x] = 1
    for (let r = 0; r < edge; r++) {
      const next = new Uint8Array(mine)
      for (let y = 1; y < ph - 1; y++) for (let x = 1; x < pw - 1; x++) {
        const i = y * pw + x, g = (y + y0) * w + x + x0
        if (!mine[i] && !labels[g] && data[g * 4 + 3] > 0 && (mine[i - 1] || mine[i + 1] || mine[i - pw] || mine[i + pw])) next[i] = 1
      }
      mine = next
    }
    // Anything drawn that the part wholly encloses is part of it too (the eyes).
    const out = new Uint8Array(pw * ph), stack = []
    for (let x = 0; x < pw; x++) stack.push(x, (ph - 1) * pw + x)
    for (let y = 0; y < ph; y++) stack.push(y * pw, y * pw + pw - 1)
    while (stack.length) {
      const i = stack.pop()
      if (out[i] || mine[i]) continue
      out[i] = 1
      const x = i % pw
      if (x > 0) stack.push(i - 1); if (x < pw - 1) stack.push(i + 1); if (i >= pw) stack.push(i - pw); if (i < pw * (ph - 1)) stack.push(i + pw)
    }
    for (let i = 0; i < pw * ph; i++) if (!out[i]) mine[i] = 1
    const c = newCanvas(pw, ph), img = new ImageData(pw, ph)
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (mine[y * pw + x]) {
      const p = (y * pw + x) * 4, q = ((y + y0) * w + x + x0) * 4
      img.data[p] = data[q]; img.data[p + 1] = data[q + 1]; img.data[p + 2] = data[q + 2]; img.data[p + 3] = data[q + 3]
    }
    c.getContext('2d').putImageData(img, 0, 0)
    return { c, x: x0, y: y0 }
  }
  return { arms: arms.map((a, i) => ({ ...part(i + 2), px: a.px, py: a.py })), body: part(1) }
}

// The submarine in another colour: its body colour replaced at the core, and the
// soft edge where body meets outline solved as a mix of the two, so no rim of the
// old colour is left. The propeller is a different colour and is left alone.
const OUTLINE_PX = hexRgb('#4a2808')
export function recolour(src, fromHex, toHex) {
  const { width: w, height: h } = src, d = new Uint8ClampedArray(src.data)
  const B = hexRgb(fromHex), T = hexRgb(toHex), O = OUTLINE_PX
  const core = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const p = i * 4
    if (d[p + 3] > 200 && Math.hypot(d[p] - B[0], d[p + 1] - B[1], d[p + 2] - B[2]) < 14) core[i] = 1
  }
  let near = core
  for (let r = 0; r < 3; r++) {          // grow the core three pixels
    const next = new Uint8Array(near)
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (!near[i] && (near[i - 1] || near[i + 1] || near[i - w] || near[i + w])) next[i] = 1
    }
    near = next
  }
  const BO = B.map((v, k) => v - O[k]), bo2 = BO.reduce((s, v) => s + v * v, 0)
  for (let i = 0; i < w * h; i++) {
    const p = i * 4
    if (core[i]) { d[p] = T[0]; d[p + 1] = T[1]; d[p + 2] = T[2]; continue }
    if (!near[i] || d[p + 3] === 0) continue
    const a = ((d[p] - O[0]) * BO[0] + (d[p + 1] - O[1]) * BO[1] + (d[p + 2] - O[2]) * BO[2]) / bo2
    if (a <= 0.02 || a > 1.05) continue
    const k = Math.min(1, a)
    const fit = Math.hypot(...[0, 1, 2].map((c) => d[p + c] - (k * B[c] + (1 - k) * O[c])))
    if (fit > 20) continue
    for (let c = 0; c < 3; c++) d[p + c] = Math.round(k * T[c] + (1 - k) * O[c])
  }
  const c = newCanvas(w, h)
  c.getContext('2d').putImageData(new ImageData(d, w, h), 0, 0)
  return c
}

// A picture drawn at another size with the smoothest scaling (halving first when it
// shrinks a lot).
function prescale(src, w, h) {
  let cur = src, cw = src.naturalWidth || src.width, ch = src.naturalHeight || src.height
  while (cw / 2 >= w && ch / 2 >= h) {
    const c = newCanvas(cw / 2, ch / 2), g = c.getContext('2d')
    g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, c.width, c.height)
    cur = c; cw = c.width; ch = c.height
  }
  const c = newCanvas(w, h), g = c.getContext('2d')
  g.imageSmoothingQuality = 'high'
  g.drawImage(cur, 0, 0, c.width, c.height)
  return c
}

export class Stage {
  constructor(canvas, pics, { maxPixels = 2.1e6 } = {}) {
    this.canvas = canvas
    this.g = canvas.getContext('2d', { alpha: false })
    this.pics = pics
    this.measures = Object.fromEntries(Object.entries(pics).map(([k, p]) => [k, p.m]))
    this.maxPixels = maxPixels
    this.sprites = new Map()
    this.colours = new Map()
    this.water = null
  }

  // Size the canvas for a box of cssW × cssH pixels on screen.
  resize(cssW, cssH) {
    const dpr = window.devicePixelRatio || 1
    const r = Math.min(dpr, Math.sqrt(this.maxPixels / (cssW * cssH)))
    this.canvas.width = Math.round(cssW * r)
    this.canvas.height = Math.round(cssH * r)
    const W = this.canvas.width, H = this.canvas.height
    this.sw = Math.min(W, H * S.A); this.sh = this.sw / S.A
    this.ox = (W - this.sw) / 2; this.oy = (H - this.sh) / 2
    this.ow = Math.max(1.5, 0.0045 * this.sh)         // outline width, like the pictures'
    this.sprites.clear()
    this.bg = null
  }

  X(x) { return this.ox + x * this.sw }
  Y(y) { return this.oy + y * this.sh }

  // The water, the far dune and the sand: drawn once per size and water. The reef
  // pieces are drawn each frame, in order with the actors, so the whale can pass
  // behind them all.
  background(water) {
    if (this.bg && this.water === water) return this.bg
    const W = this.canvas.width, H = this.canvas.height
    const c = newCanvas(W, H), g = c.getContext('2d')
    const base = S.WATER[water] || S.WATER.light
    g.fillStyle = base; g.fillRect(0, 0, W, H)
    // A lighter band of water near the surface, flat like everything else.
    const x0 = -this.ox / this.sw, x1 = 1 + this.ox / this.sw
    g.fillStyle = mix(base, '#ffffff', 0.09)
    g.beginPath(); g.moveTo(0, 0)
    for (let i = 0; i <= 80; i++) { const x = x0 + (x1 - x0) * i / 80; g.lineTo(this.X(x), this.Y(0.2 + 0.018 * Math.sin(TAU * (x * 1.6 + 0.2)))) }
    g.lineTo(W, 0); g.closePath(); g.fill()
    // A far dune behind the sand.
    g.fillStyle = mix(base, S.INK.sandFar, 0.55)
    g.beginPath(); g.moveTo(0, H)
    for (let i = 0; i <= 80; i++) { const x = x0 + (x1 - x0) * i / 80; g.lineTo(this.X(x), this.Y(S.SAND - 0.035 - 0.03 * Math.max(0, Math.sin(TAU * (x * 0.9 + 0.15))))) }
    g.lineTo(W, H); g.closePath(); g.fill()
    // The sand, with its wavy brown edge across the whole width.
    const edge = (x) => S.SAND + 0.008 * Math.sin(TAU * (x * 2.3 + 0.4)) + 0.004 * Math.sin(TAU * (x * 6.1 + 0.1))
    g.beginPath(); g.moveTo(0, H)
    for (let i = 0; i <= 160; i++) { const x = x0 + (x1 - x0) * i / 160; g.lineTo(this.X(x), this.Y(edge(x))) }
    g.lineTo(W, H); g.closePath()
    g.fillStyle = S.INK.sand; g.fill()
    g.beginPath()
    for (let i = 0; i <= 160; i++) { const x = x0 + (x1 - x0) * i / 160; g[i ? 'lineTo' : 'moveTo'](this.X(x), this.Y(edge(x))) }
    g.strokeStyle = S.INK.outline; g.lineWidth = this.ow; g.lineJoin = 'round'; g.stroke()
    this.bg = c; this.water = water
    return c
  }

  // A clump of seaweed: each blade a ribbon along a spine that sways from its root.
  weed(g, o, t) {
    const n = o.blades || 2
    for (let b = 0; b < n; b++) {
      const bx = o.x + (b - (n - 1) / 2) * o.w * 0.38
      const len = o.h * (0.72 + 0.28 * hash(b, o.seed * 10))
      const w0 = o.w * 0.34 * S.A                  // width at the root, in heights
      const ph = S.wrap((o.sway || 15) * t / S.LOOP + (o.seed || 0) + b * 0.17, 1)
      const left = [], right = []
      for (let k = 0; k <= 16; k++) {
        const u = k / 16
        const bend = (0.07 * len * u * u * Math.sin(TAU * ph - 1.6 * u) + 0.02 * len * Math.sin(3 * u + b)) / S.A
        const half = (w0 / 2) * (1 - 0.7 * u) * (1 + 0.12 * Math.sin(11 * u + b)) / S.A
        const y = o.base - u * len
        left.push([bx + bend - half, y]); right.push([bx + bend + half, y])
      }
      g.beginPath()
      left.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](this.X(x), this.Y(y)))
      const tip = left[16], tip2 = right[16]
      g.quadraticCurveTo(this.X((tip[0] + tip2[0]) / 2), this.Y(tip[1] - 0.025), this.X(tip2[0]), this.Y(tip2[1]))
      for (let i = 15; i >= 0; i--) g.lineTo(this.X(right[i][0]), this.Y(right[i][1]))
      g.closePath()
      g.fillStyle = S.INK.weed[(b + Math.round(o.seed * 10)) % S.INK.weed.length]; g.fill()
      g.strokeStyle = S.INK.outline; g.lineWidth = this.ow; g.lineJoin = 'round'; g.stroke()
    }
  }

  // A reef picture whose top sways (the anemone): drawn in bands, each sheared so
  // that its edges meet the bands above and below, moving more toward the top.
  swayPic(g, o, t) {
    const m = this.pics[o.pic].m, { c, k } = this.sprite(o)
    const left = this.X(o.x) - (m.box.x + m.box.w / 2) * k
    const bottom = (m.box.y + m.box.h) * k, top = m.box.y * k
    const ph = S.wrap((o.sway || 20) * t / S.LOOP + (o.seed || 0), 1), amp = (o.amp || 0.012) * this.sh
    const off = (u) => amp * u * u * Math.sin(TAU * ph - 1.3 * u)
    const N = 8
    for (let b = 0; b < N; b++) {
      const y1 = bottom - (bottom - top) * b / N, y0 = bottom - (bottom - top) * (b + 1) / N
      const d1 = off(b / N), d0 = off((b + 1) / N), kx = (d0 - d1) / (y0 - y1)
      g.save()
      g.translate(left, this.Y(o.base) - bottom)
      g.transform(1, 0, kx, 1, d1 - kx * y1, 0)
      const sy = Math.max(0, Math.floor(y0)), sh = Math.min(c.height, Math.ceil(y1) + 1) - sy
      g.drawImage(c, 0, sy, c.width, sh, 0, sy, c.width, sh)
      g.restore()
    }
  }

  // A reef picture that keeps still but is drawn in order with the actors, so they
  // can go behind it (the chest, the arch).
  stillPic(g, o) {
    const m = this.pics[o.pic].m, { c, k } = this.sprite(o)
    g.drawImage(c, Math.round(this.X(o.x) - (m.box.x + m.box.w / 2) * k), Math.round(this.Y(o.base) - (m.box.y + m.box.h) * k))
  }

  // A picture at the size this actor is drawn, in the colour asked for.
  sprite(a, colour) {
    const p = this.pics[a.pic], m = p.m
    const k = (a.h * this.sh) / m.box.h
    const key = `${a.pic}|${colour || ''}|${k.toFixed(4)}`
    let sp = this.sprites.get(key)
    if (!sp) {
      let src = p.img
      if (colour) {
        const id = `${a.pic}|${colour}`
        if (!this.colours.has(id)) this.colours.set(id, recolour(p.data, a.body, colour))
        src = this.colours.get(id)
      }
      sp = { c: prescale(src, m.w * k, m.h * k), k }
      this.sprites.set(key, sp)
    }
    return sp
  }

  // One frame of a set, at the size its actor is drawn.
  frameSprite(key, i, f, k) {
    const id = `${key}|${i}|${k.toFixed(4)}`
    let c = this.sprites.get(id)
    if (!c) { c = prescale(f.img, f.w * k, f.h * k); this.sprites.set(id, c) }
    return c
  }

  actor(g, a, t, s, loop) {
    const pose = S.poseAt(a, t), key = S.measureKey(a), p = this.pics[key], m = p.m
    let c, k, cx, cy
    if (p.set) {
      // A frame set: the frame for this moment, lined up on its own anchor.
      const i = S.frameAt(a, pose, p.set), f = p.set.frames[i]
      k = (a.h * this.sh) / m.ref
      c = this.frameSprite(key, i, f, k)
      cx = f.ax * k; cy = f.ay * k
    } else {
      const colour = S.tintOf(a, s, loop);
      ({ c, k } = this.sprite(a, colour))
      cx = (m.box.x + m.box.w / 2) * k
      cy = (a.foot ? m.box.y + m.box.h : m.box.y + m.box.h / 2) * k
    }
    let ex = 1, ey = 1
    if (a.rig === 'jelly') { const v = Math.sin(TAU * pose.phase); ex = 1 + 0.06 * v; ey = 1 - 0.06 * v }
    if (a.rig === 'sit') { const v = Math.sin(TAU * pose.phase); ex = 1 - 0.012 * v; ey = 1 + 0.022 * v }
    g.save()
    g.translate(this.X(pose.x), this.Y(pose.y))
    g.rotate(pose.rot)
    g.scale(pose.sx * ex * pose.size, ey * pose.size)
    if (a.rig === 'fish' && !p.set) {
      // The tail turns toward us and away: everything behind where it starts
      // narrows and widens.
      const xt = Math.round((m.box.x + m.tail * m.box.w) * k)
      const q = 1 - 0.42 * (0.5 - 0.5 * Math.cos(TAU * pose.phase))
      g.drawImage(c, 0, 0, xt + 1, c.height, -cx, -cy, xt + 1, c.height)
      g.drawImage(c, xt, 0, c.width - xt, c.height, -cx + xt, -cy, (c.width - xt) * q, c.height)
    } else if (a.arms && p.parts) {
      // Each arm turned about its root, then the body over where they join.
      const piece = (q, i) => {
        const id = `${a.pic}|part${i}|${k.toFixed(4)}`
        let sp = this.sprites.get(id)
        if (!sp) { sp = prescale(q.c, q.c.width * k, q.c.height * k); this.sprites.set(id, sp) }
        return sp
      }
      p.parts.arms.forEach((q, i) => {
        g.save()
        g.translate(-cx + q.px * k, -cy + q.py * k)
        g.rotate(S.armAngle(a, i, t))
        g.drawImage(piece(q, i), (q.x - q.px) * k, (q.y - q.py) * k)
        g.restore()
      })
      g.drawImage(piece(p.parts.body, 'body'), -cx + p.parts.body.x * k, -cy + p.parts.body.y * k)
    } else if (a.rig === 'jelly' && a.hang && !p.set) {
      // The bell in one piece; the strands below it in bands, each sheared to meet
      // the next, swinging further toward their ends, the swing running down them.
      const top = Math.round(m.box.y * k), bottom = Math.round((m.box.y + m.box.h) * k), split = Math.round(top + a.hang * (bottom - top))
      const ph = S.wrap((a.sway || 30) * t / S.LOOP + (a.seed || 0), 1), amp = 0.05 * m.box.w * k
      const off = (u) => amp * u * Math.sin(TAU * ph - 2.2 * u)
      g.drawImage(c, 0, 0, c.width, split, -cx, -cy, c.width, split)
      const N = 10
      for (let b = 0; b < N; b++) {
        const y0 = split + (bottom - split) * b / N, y1 = split + (bottom - split) * (b + 1) / N
        const d0 = off(b / N), d1 = off((b + 1) / N), kx = (d1 - d0) / (y1 - y0)
        g.save()
        g.translate(-cx, -cy)
        g.transform(1, 0, kx, 1, d0 - kx * y0, 0)
        const sy = Math.floor(y0), sh = Math.min(c.height, Math.ceil(y1) + 1) - sy
        g.drawImage(c, 0, sy, c.width, sh, 0, sy, c.width, sh)
        g.restore()
      }
    } else {
      g.drawImage(c, -cx, -cy)
    }
    g.restore()
  }

  bubbles(g, t, s, loop) {
    g.lineWidth = Math.max(1, this.ow * 0.7)
    for (const b of S.bubblesAt(t, s, this.measures, loop)) {
      const x = this.X(b.x), y = this.Y(b.y), r = b.r * this.sh
      g.beginPath(); g.arc(x, y, r, 0, TAU)
      g.fillStyle = 'rgba(243, 248, 246, 0.22)'; g.fill()
      g.strokeStyle = 'rgba(243, 248, 246, 0.9)'; g.stroke()
      g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, Math.PI * 1.1, Math.PI * 1.6)
      g.stroke()
    }
  }

  // The whole scene at time t of loop number `loop` with these settings.
  draw(t, s, loop = 0) {
    const g = this.g
    g.drawImage(this.background(s.water), 0, 0)
    const items = [
      ...S.SCENERY.map((o) => ({ z: S.reefZ(o), o })),
      ...S.cast(s, loop).map((a, i) => ({ z: S.zAt(a, t) + i * 1e-4, a })),
    ].sort((p, q) => p.z - q.z)
    for (const it of items) {
      if (it.a) this.actor(g, it.a, t, s, loop)
      else if (it.o.kind === 'weed') this.weed(g, it.o, t)
      else if (it.o.sway) this.swayPic(g, it.o, t)
      else this.stillPic(g, it.o)
    }
    this.bubbles(g, t, s, loop)
  }
}
