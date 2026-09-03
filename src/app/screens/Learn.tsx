import { useMemo, useState } from 'preact/hooks'
import { MUSCLE_LIBRARY, BONES, TOTAL_BONE_COUNT } from '../../core/anatomy'
import { antagonistsOf, synergistsOf, landmarkById, nerveById, jointById, boneById,
         landmarksOnBone, musclesOnBone } from '../../core/anatomy/graph'
import type { AnatomicalMuscle, Bone, AnatomicalRegion } from '../../core/taxonomy/anatomy'
import { MUSCLES } from '../../core/taxonomy/muscles'
import { generateCards, type Card } from '../../core/learn/cards'
import { dueDeck } from '../../core/learn/session'
import { newReviewState, review, previewIntervals, Rating, isDue } from '../../core/learn/scheduler'
import { useApp, saveReview } from '../store'

let CARDS: Card[] | null = null
const cards = () => (CARDS ??= generateCards())

const REGION_ORDER: AnatomicalRegion[] = ['shoulder', 'arm', 'forearm', 'hand', 'thorax', 'back',
  'abdomen', 'hip', 'thigh', 'leg', 'foot', 'neck', 'head', 'pelvis', 'perineum']
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)
const rel = (iso: string) => {
  const d = (new Date(iso).getTime() - Date.now()) / 86_400_000
  if (d < 1 / 24) return 'now'
  if (d < 1) return `${Math.round(d * 24)}h`
  return `${Math.round(d)}d`
}

type View = { kind: 'home' } | { kind: 'study' } | { kind: 'muscle'; m: AnatomicalMuscle } | { kind: 'bone'; b: Bone }

export function Learn() {
  const app = useApp()
  const [view, setView] = useState<View>({ kind: 'home' })
  const [query, setQuery] = useState('')
  const [openRegion, setOpenRegion] = useState<string | null>(null)

  const all = cards()
  const due = useMemo(() => all.filter((c) => { const s = app.reviews.get(c.id); return s && isDue(s) }).length, [app.reviews])
  const seen = app.reviews.size

  if (view.kind === 'study') return <Study onExit={() => setView({ kind: 'home' })} />
  if (view.kind === 'muscle') return <MuscleDetail m={view.m} onBack={() => setView({ kind: 'home' })} onOpen={(m) => setView({ kind: 'muscle', m })} />
  if (view.kind === 'bone') return <BoneDetail b={view.b} onBack={() => setView({ kind: 'home' })} onMuscle={(m) => setView({ kind: 'muscle', m })} />

  const q = query.trim().toLowerCase()
  const hits = q ? {
    muscles: MUSCLE_LIBRARY.filter((m) => m.name.toLowerCase().includes(q) || m.latin.toLowerCase().includes(q)).slice(0, 12),
    bones: BONES.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8),
  } : null

  return (
    <>
      <h1>Learn</h1>
      <p class="tiny" style="margin:4px 0 14px">{MUSCLE_LIBRARY.length} muscles · {TOTAL_BONE_COUNT} bones · {all.length} cards, all generated from the anatomy graph.</p>

      <div class="card">
        <div class="spread">
          <div>
            <strong>Study</strong>
            <div class="tiny">{due} due · {seen} seen · {all.length - seen} new</div>
          </div>
          <button class="primary" onClick={() => setView({ kind: 'study' })}>Study now</button>
        </div>
        <p class="tiny" style="margin:10px 0 0">Cards also appear during rest between sets, for the muscles you just trained. Content is unverified draft — do not study from it for an exam yet.</p>
      </div>

      <input placeholder="Search muscles and bones" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} style="margin-top:6px" />

      {hits && (
        <div class="stack" style="margin-top:10px">
          {hits.muscles.map((m) => <button key={m.id} style="text-align:left" onClick={() => setView({ kind: 'muscle', m })}><div>{m.name}</div><div class="tiny">{m.latin} · {cap(m.region)}</div></button>)}
          {hits.bones.map((b) => <button key={b.id} style="text-align:left" onClick={() => setView({ kind: 'bone', b })}><div>{b.name}</div><div class="tiny">Bone · {cap(b.region)}</div></button>)}
          {hits.muscles.length + hits.bones.length === 0 && <p class="muted">Nothing matches.</p>}
        </div>
      )}

      {!hits && (
        <>
          <h2>Muscles by region</h2>
          {REGION_ORDER.map((r) => {
            const ms = MUSCLE_LIBRARY.filter((m) => m.region === r)
            if (!ms.length) return null
            const open = openRegion === r
            return (
              <div class="card tight" key={r}>
                <div class="spread" style="cursor:pointer" onClick={() => setOpenRegion(open ? null : r)}>
                  <strong>{cap(r)}</strong><span class="tiny">{ms.length} {open ? '▲' : '▼'}</span>
                </div>
                {open && (
                  <div class="stack" style="margin-top:10px">
                    {ms.map((m) => <button key={m.id} style="text-align:left;min-height:40px;padding:8px 12px" onClick={() => setView({ kind: 'muscle', m })}>{m.name}<span class="tiny" style="float:right">{m.trainableUnitId ? MUSCLES[m.trainableUnitId].name : '—'}</span></button>)}
                  </div>
                )}
              </div>
            )
          })}
          <h2>Bones</h2>
          <div class="card tight">
            <div class="row wrap">
              {BONES.map((b) => <button key={b.id} class="pill" style="min-height:32px" onClick={() => setView({ kind: 'bone', b })}>{b.name}</button>)}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function Study({ onExit }: { onExit: () => void }) {
  const app = useApp()
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const deck = useMemo(() => dueDeck(cards(), app.reviews, { limit: 30 }), [])
  const card = deck[i]
  if (!card) return (
    <>
      <h1>Study</h1>
      <div class="card"><strong>{deck.length === 0 ? 'Nothing due' : 'Session done'}</strong><p class="muted" style="margin:6px 0 12px">{deck.length === 0 ? 'Come back later, or train — rest cards count.' : `${deck.length} cards reviewed.`}</p><button class="wide" onClick={onExit}>Back</button></div>
    </>
  )
  const state = app.reviews.get(card.id) ?? newReviewState(card.id)
  const next = previewIntervals(state)
  const grade = async (r: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) => {
    await saveReview(review(state, r).state)
    setRevealed(false); setI(i + 1)
  }
  return (
    <>
      <div class="spread"><h1 style="margin:0">Study</h1><span class="pill">{i + 1} / {deck.length}</span></div>
      <p class="tiny" style="margin:4px 0 14px">{card.kind.replace(/_/g, ' ')} {card.reviewStatus !== 'verified' && '· unverified draft'}</p>
      <div class="card" style="min-height:160px;cursor:pointer" onClick={() => setRevealed(true)}>
        <div style="font-size:18px" dangerouslySetInnerHTML={{ __html: card.front.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
        {revealed ? <ul style="margin:12px 0 0;padding-left:18px">{card.back.map((b, k) => <li key={k} class="muted">{b}</li>)}</ul> : <p class="tiny" style="margin-top:16px">Tap to reveal</p>}
      </div>
      {revealed ? (
        <div class="grid2">
          <button onClick={() => void grade(Rating.Again)}>Again<div class="tiny">{rel(next.again.toISOString())}</div></button>
          <button onClick={() => void grade(Rating.Hard)}>Hard<div class="tiny">{rel(next.hard.toISOString())}</div></button>
          <button onClick={() => void grade(Rating.Good)}>Good<div class="tiny">{rel(next.good.toISOString())}</div></button>
          <button onClick={() => void grade(Rating.Easy)}>Easy<div class="tiny">{rel(next.easy.toISOString())}</div></button>
        </div>
      ) : <button class="ghost wide" onClick={onExit}>Stop</button>}
    </>
  )
}

function MuscleDetail({ m, onBack, onOpen }: { m: AnatomicalMuscle; onBack: () => void; onOpen: (m: AnatomicalMuscle) => void }) {
  const att = (a: { landmarkId: string; detail?: string }) => `${landmarkById(a.landmarkId)?.name ?? a.landmarkId}${a.detail ? ` (${a.detail})` : ''}`
  const antagonists = antagonistsOf(m), synergists = synergistsOf(m)
  const Sec = ({ t, items }: { t: string; items: string[] }) => items.length ? <><h2>{t}</h2><ul style="margin:0;padding-left:18px">{items.map((x, k) => <li key={k} class="muted">{x}</li>)}</ul></> : null
  return (
    <>
      <button class="ghost" style="min-height:36px;padding:4px 10px" onClick={onBack}>← Learn</button>
      <h1 style="margin-top:8px">{m.name}</h1>
      <p class="tiny" style="margin:0">{m.latin} · {cap(m.region)}{m.group ? ` · ${m.group}` : ''} · <span style={`color:${m.reviewStatus === 'verified' ? 'var(--good)' : 'var(--warn)'}`}>{m.reviewStatus}</span></p>
      {m.trainableUnitId && <p class="tiny" style="margin:4px 0 0">Trained as <strong>{MUSCLES[m.trainableUnitId].name}</strong> in the engine.</p>}
      {m.notes && <div class="card" style="margin-top:12px"><p class="muted" style="margin:0">{m.notes}</p></div>}
      <Sec t="Origin" items={m.origin.map(att)} />
      <Sec t="Insertion" items={m.insertion.map(att)} />
      <Sec t="Innervation" items={m.innervation.map((i) => `${nerveById(i.nerveId)?.name ?? i.nerveId} (${i.roots.join(', ')})${i.note ? ` — ${i.note}` : ''}`)} />
      <Sec t="Actions" items={m.actions.map((a) => `${a.action.replace(/_/g, ' ')} at the ${jointById(a.joint)?.name ?? a.joint}${a.role !== 'prime' ? ` [${a.role}]` : ''}${a.qualifier ? ` — ${a.qualifier}` : ''}`)} />
      <Sec t="Functions" items={m.functions ?? []} />
      {m.heads?.length ? <><h2>Heads</h2>{m.heads.map((h) => <div class="card tight" key={h.id}><strong>{h.name}</strong><div class="tiny">{h.origin.map(att).join('; ')}{h.trainableUnitId ? ` · ${MUSCLES[h.trainableUnitId].name}` : ''}</div></div>)}</> : null}
      {antagonists.length ? <><h2>Antagonists (derived)</h2><div class="row wrap">{antagonists.map((a) => <button key={a.id} class="pill" style="min-height:32px" onClick={() => onOpen(a)}>{a.name}</button>)}</div></> : null}
      {synergists.length ? <><h2>Synergists (derived)</h2><div class="row wrap">{synergists.slice(0, 12).map((a) => <button key={a.id} class="pill" style="min-height:32px" onClick={() => onOpen(a)}>{a.name}</button>)}</div></> : null}
    </>
  )
}

function BoneDetail({ b, onBack, onMuscle }: { b: Bone; onBack: () => void; onMuscle: (m: AnatomicalMuscle) => void }) {
  const lm = landmarksOnBone(b.id), ms = musclesOnBone(b.id)
  return (
    <>
      <button class="ghost" style="min-height:36px;padding:4px 10px" onClick={onBack}>← Learn</button>
      <h1 style="margin-top:8px">{b.name}</h1>
      <p class="tiny" style="margin:0">{b.latin ?? ''} · {b.division} · {b.class} bone · {b.paired ? 'paired' : b.count === 1 ? 'single' : `${b.count} total`}</p>
      {b.notes && <div class="card" style="margin-top:12px"><p class="muted" style="margin:0">{b.notes}</p></div>}
      {b.articulatesWith?.length ? <><h2>Articulates with</h2><div class="row wrap">{b.articulatesWith.map((id) => <span key={id} class="pill">{boneById(id)?.name ?? id}</span>)}</div></> : null}
      {lm.length ? <><h2>Landmarks</h2><ul style="margin:0;padding-left:18px">{lm.map((l) => <li key={l.id} class="muted">{l.name}{l.type ? <span class="tiny"> · {l.type}</span> : null}</li>)}</ul></> : null}
      {ms.length ? <><h2>Muscles attaching here</h2><div class="row wrap">{ms.map((m) => <button key={m.id} class="pill" style="min-height:32px" onClick={() => onMuscle(m)}>{m.name}</button>)}</div></> : null}
    </>
  )
}
