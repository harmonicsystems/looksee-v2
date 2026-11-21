// The dock: what its tiles are, as data. Pure; App.svelte draws them and
// does what a click asks.
//
// The top of the dock is the lessons, one click each. They are never set up
// by hand: with "Follow the school day" they are the parts of the day that
// have sets, with a plan its blocks, and otherwise the groups.

import { GROUPS } from './concepts.js'
import { clock12 } from './day.js'
import { setsName } from './share.js'

const emoji = (sets) =>
  GROUPS.filter((g) => g.sets.some((id) => sets.includes(id)))
    .map((g) => g.emoji)
    .slice(0, 2)
    .join('')

// → [{ kind: 'part' | 'block' | 'group', i, icon, label, sets }]. `own` says
// whether this device has pictures for the groups that come with none.
export function lessons(s, own = false) {
  if (s.daySets)
    return s.day.flatMap((p, i) =>
      p.sets?.length ? [{ kind: 'part', i, icon: p.icon || emoji(p.sets), label: `${clock12(p.at)} ${setsName(p.sets)}`, sets: p.sets }] : []
    )
  if (s.planOn && s.plan.length)
    return s.plan.map((b, i) => ({ kind: 'block', i, icon: emoji(b.sets), label: `Block ${i + 1}, ${b.min} min: ${setsName(b.sets)}`, sets: b.sets }))
  return GROUPS.flatMap((g, i) => (g.own && !own ? [] : [{ kind: 'group', i, icon: g.emoji, label: g.label, sets: g.sets }]))
}

// The apps and widgets under the lessons: [id, emoji, name]. Weather and
// music are there only when their settings are on, the corner video only
// when Settings has a link (`vid`).
export const dockApps = (s, vid) =>
  [
    ['aquarium', '🐠', 'Aquarium'],
    ['watch', '📺', 'Videos'],
    s.weather && ['weather', '🌡️', 'Weather'],
    ['timer', '⏱️', 'Timer'],
    s.music && ['music', '🎵', 'Music'],
    vid && ['video', '🎬', 'Corner video'],
    ['full', '⛶', 'Full screen']
  ].filter(Boolean)
