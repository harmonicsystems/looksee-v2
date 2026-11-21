// Bring the aquarium in from David's picture library (npm run aquarium).
//
// The aquarium is made and proved there (projects/aquarium: scene.js is the
// loop as data, stage.js draws it, check.mjs proves every question is true
// for its whole moment). This copies it here as it is:
//
//   src/aquarium/scene.js, stage.js   the code, with two changes (below)
//   src/aquarium/frames.js            the frame sets' sizes and anchors
//   src/aquarium/checked.json         scene.js's hash, once check.mjs passed
//   public/aquarium/                  the pictures, as lossless WebP
//
// It contacts nobody. It needs ImageMagick. It refuses to copy anything if
// the library's check fails. Never edit src/aquarium/ by hand: change the
// library, then run this (a test compares the hash).
//
// The two changes: picture names end .webp, and stage.js takes the frame
// sets from frames.js instead of fetching frames.json (Looksee keeps its one
// fetch in outside.js).

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = fileURLToPath(new URL('..', import.meta.url))
const lib = process.env.PICTURE_LIBRARY || join(homedir(), 'Code/picture-library')
const from = join(lib, 'projects/aquarium')
if (!existsSync(join(from, 'scene.js'))) {
  console.error(`No aquarium at ${from}. Set PICTURE_LIBRARY to the library's folder.`)
  process.exit(2)
}

console.log('Checking the questions in the library…')
execFileSync('node', ['projects/aquarium/check.mjs'], { cwd: lib, stdio: ['ignore', 'ignore', 'inherit'] })

const S = await import(pathToFileURL(join(from, 'scene.js')).href)
const webp = (p) => p.replace(/\.png$/, '.webp')
const NOTE = '// Copied from the picture library by scripts/aquarium.mjs. Do not edit here.\n'

// ---- code
const out = join(here, 'src/aquarium')
mkdirSync(out, { recursive: true })
const scene = NOTE + readFileSync(join(from, 'scene.js'), 'utf8').replaceAll(".png'", ".webp'")
writeFileSync(join(out, 'scene.js'), scene)

const FETCH = 'await (await fetch(`${base}${dir}/frames.json`)).json()'
let stage = readFileSync(join(from, 'stage.js'), 'utf8')
if (!stage.includes(FETCH)) {
  console.error('stage.js no longer loads frames.json the way this script expects. Update scripts/aquarium.mjs.')
  process.exit(1)
}
stage = NOTE + stage.replace(FETCH, 'FRAMES[dir]').replace("import * as S from './scene.js'", "import * as S from './scene.js'\nimport { FRAMES } from './frames.js'")
writeFileSync(join(out, 'stage.js'), stage)

// ---- frame sets and pictures
const pub = join(here, 'public/aquarium')
rmSync(pub, { recursive: true, force: true })
const files = Object.values(S.PICS)
const FRAMES = {}
for (const dir of new Set(S.ACTORS.filter((a) => a.frames).map((a) => a.frames))) {
  const spec = JSON.parse(readFileSync(join(lib, dir, 'frames.json'), 'utf8'))
  FRAMES[dir] = { frames: spec.frames.map(({ file, w, h, ax, ay }) => ({ file: webp(file), w, h, ax, ay })), play: spec.play }
  for (const f of spec.frames) files.push(`${dir}/${f.file}`)
}
writeFileSync(join(out, 'frames.js'), `${NOTE}export const FRAMES = ${JSON.stringify(FRAMES)}\n`)
for (const f of files) {
  const to = join(pub, webp(f))
  mkdirSync(dirname(to), { recursive: true })
  execFileSync('magick', [join(lib, f), '-define', 'webp:lossless=true', to])
}

writeFileSync(join(out, 'checked.json'), JSON.stringify({ scene: createHash('sha256').update(scene).digest('hex') }) + '\n')
const kb = execFileSync('du', ['-sk', pub], { encoding: 'utf8' }).split('\t')[0]
console.log(`Copied the aquarium: ${files.length} pictures, ${kb} KB, in public/aquarium/.`)
