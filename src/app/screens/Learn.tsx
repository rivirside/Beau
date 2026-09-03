import { useMemo, useState } from 'preact/hooks'
import { MUSCLE_LIBRARY, BONES, TOTAL_BONE_COUNT } from '../../core/anatomy'
import { antagonistsOf, synergistsOf, landmarkById, nerveById, jointById, boneById, landmarksOnBone, musclesOnBone, muscleById } from '../../core/anatomy/graph'
import type { AnatomicalRegion } from '../../core/taxonomy/anatomy'
import { MUSCLES } from '../../core/taxonomy/muscles'
import { generateCards, type Card } from '../../core/learn/cards'
import { dueDeck } from '../../core/learn/session'
import { newReviewState, review, previewIntervals, Rating, isDue } from '../../core/learn/scheduler'
import { useApp, saveReview } from '../store'
import { Page, Group, Row, ButtonRow, Custom } from '../ui'
import { push } from '../nav'

let CARDS: Card[] | null = null
const cards = () => (CARDS ??= generateCards())
const REGIONS: AnatomicalRegion[] = ['shoulder', 'arm', 'forearm', 'hand', 'thorax', 'back', 'abdomen', 'hip', 'thigh', 'leg', 'foot', 'neck', 'head', 'pelvis', 'perineum']
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)
const rel = (d: Date) => { const days = (d.getTime() - Date.now()) / 86_400_000; return days < 1 / 24 ? 'now' : days < 1 ? `${Math.round(days * 24)}h` : `${Math.round(days)}d` }

export function Learn() {
  const app = useApp()
  const [q, setQ] = useState('')
  const all = cards()
  const due = useMemo(() => all.filter((c) => { const s = app.reviews.get(c.id); return s && isDue(s) }).length, [app.reviews])
  const query = q.trim().toLowerCase()
  const hits = query ? {
    muscles: MUSCLE_LIBRARY.filter((m) => m.name.toLowerCase().includes(query) || m.latin.toLowerCase().includes(query)).slice(0, 12),
    bones: BONES.filter((b) => b.name.toLowerCase().includes(query)).slice(0, 8),
  } : null

  return (
    <Page title="Learn" subtitle={`${MUSCLE_LIBRARY.length} muscles · ${TOTAL_BONE_COUNT} bones · ${all.length} cards`}>
      <Group footer="Cards are generated from the anatomy graph and scheduled with FSRS. They also appear between sets, for the muscles you just trained. Content is unverified draft — not yet for exam study.">
        <Row label="Study" sub={`${due} due · ${app.reviews.size} seen · ${all.length - app.reviews.size} new`} value={due ? String(due) : ''} accentValue
             onPress={() => push({ key: 'study', title: 'Study', render: () => <StudyPage /> })} />
      </Group>

      <Group>
        <div class="row"><input class="input" style="width:100%;text-align:left" type="text" placeholder="Search muscles and bones" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} /></div>
      </Group>

      {hits ? (
        <Group footer={hits.muscles.length + hits.bones.length === 0 ? 'Nothing matches.' : undefined}>
          {hits.muscles.map((m) => <Row key={m.id} label={m.name} sub={`${m.latin} · ${cap(m.region)}`} onPress={() => push({ key: `m:${m.id}`, title: m.name, render: () => <MuscleDetailPage id={m.id} /> })} />)}
          {hits.bones.map((b) => <Row key={b.id} label={b.name} sub={`Bone · ${cap(b.region)}`} onPress={() => push({ key: `b:${b.id}`, title: b.name, render: () => <BoneDetailPage id={b.id} /> })} />)}
        </Group>
      ) : (
        <>
          <Group header="Muscles">
            {REGIONS.map((r) => {
              const n = MUSCLE_LIBRARY.filter((m) => m.region === r).length
              return n ? <Row key={r} label={cap(r)} value={String(n)} onPress={() => push({ key: `r:${r}`, title: cap(r), render: () => <RegionPage region={r} /> })} /> : null
            })}
          </Group>
          <Group header="Skeleton">
            <Row label="All bones" value={String(TOTAL_BONE_COUNT)} onPress={() => push({ key: 'bones', title: 'Bones', render: () => <BonesPage /> })} />
          </Group>
        </>
      )}
    </Page>
  )
}

function RegionPage({ region }: { region: AnatomicalRegion }) {
  const ms = MUSCLE_LIBRARY.filter((m) => m.region === region)
  const groups = [...new Set(ms.map((m) => m.group ?? ''))]
  return (
    <Page title={cap(region)}>
      {groups.map((g) => (
        <Group key={g} header={g || undefined}>
          {ms.filter((m) => (m.group ?? '') === g).map((m) => (
            <Row key={m.id} label={m.name} sub={m.trainableUnitId ? `Trained as ${MUSCLES[m.trainableUnitId].name}` : 'Library only'}
                 onPress={() => push({ key: `m:${m.id}`, title: m.name, render: () => <MuscleDetailPage id={m.id} /> })} />
          ))}
        </Group>
      ))}
    </Page>
  )
}

function BonesPage() {
  const groups = [...new Set(BONES.map((b) => b.region))]
  return (
    <Page title="Bones" subtitle="54 named bones, 206 in total.">
      {groups.map((r) => (
        <Group key={r} header={cap(r)}>
          {BONES.filter((b) => b.region === r).map((b) => <Row key={b.id} label={b.name} value={b.paired ? '×2' : b.count > 1 ? `×${b.count}` : ''} onPress={() => push({ key: `b:${b.id}`, title: b.name, render: () => <BoneDetailPage id={b.id} /> })} />)}
        </Group>
      ))}
    </Page>
  )
}

export function MuscleDetailPage({ id }: { id: string }) {
  const m = muscleById(id)
  if (!m) return <Page title="Muscle"><p class="p">Not found.</p></Page>
  const att = (a: { landmarkId: string; detail?: string }) => `${landmarkById(a.landmarkId)?.name ?? a.landmarkId}${a.detail ? ` (${a.detail})` : ''}`
  const open = (x: { id: string; name: string }) => push({ key: `m:${x.id}`, title: x.name, render: () => <MuscleDetailPage id={x.id} /> })
  const List = ({ header, items, footer }: { header: string; items: string[]; footer?: string }) => items.length ? <Group header={header} footer={footer}>{items.map((x, i) => <Row key={i} label={x} />)}</Group> : null
  return (
    <Page title={m.name} subtitle={`${m.latin} · ${cap(m.region)}${m.group ? ` · ${m.group}` : ''}`}>
      <Group footer={m.notes}>
        <Row label="Status" value={m.reviewStatus === 'verified' ? 'Verified' : 'Unverified draft'} accentValue />
        {m.trainableUnitId && <Row label="Trained as" value={MUSCLES[m.trainableUnitId].name} accentValue />}
      </Group>
      <List header="Origin" items={m.origin.map(att)} />
      <List header="Insertion" items={m.insertion.map(att)} />
      <List header="Innervation" items={m.innervation.map((i) => `${nerveById(i.nerveId)?.name ?? i.nerveId} (${i.roots.join(', ')})${i.note ? ` — ${i.note}` : ''}`)} />
      <List header="Actions" items={m.actions.map((a) => `${cap(a.action.replace(/_/g, ' '))} at the ${jointById(a.joint)?.name ?? a.joint}${a.role !== 'prime' ? ` (${a.role})` : ''}${a.qualifier ? ` — ${a.qualifier}` : ''}`)} />
      <List header="Functions" items={m.functions ?? []} />
      {m.heads?.length ? <Group header="Heads">{m.heads.map((h) => <Row key={h.id} label={h.name} sub={h.origin.map(att).join('; ')} value={h.trainableUnitId ? MUSCLES[h.trainableUnitId].name : ''} />)}</Group> : null}
      {antagonistsOf(m).length ? <Group header="Antagonists" footer="Derived from opposing actions at the same joint — not a stored list.">{antagonistsOf(m).map((a) => <Row key={a.id} label={a.name} onPress={() => open(a)} />)}</Group> : null}
      {synergistsOf(m).length ? <Group header="Synergists" footer="Share a prime action with this muscle.">{synergistsOf(m).slice(0, 10).map((a) => <Row key={a.id} label={a.name} onPress={() => open(a)} />)}</Group> : null}
      <div class="spacer" />
    </Page>
  )
}

function BoneDetailPage({ id }: { id: string }) {
  const b = boneById(id)
  if (!b) return <Page title="Bone"><p class="p">Not found.</p></Page>
  const lm = landmarksOnBone(b.id), ms = musclesOnBone(b.id)
  return (
    <Page title={b.name} subtitle={`${b.latin ?? ''} · ${b.division} · ${b.class} bone`}>
      <Group footer={b.notes}>
        <Row label="Count" value={b.paired ? 'Paired' : b.count === 1 ? 'Single' : `${b.count} in total`} accentValue />
      </Group>
      {b.articulatesWith?.length ? <Group header="Articulates with">{b.articulatesWith.map((x) => <Row key={x} label={boneById(x)?.name ?? x} onPress={() => push({ key: `b:${x}`, title: boneById(x)?.name ?? x, render: () => <BoneDetailPage id={x} /> })} />)}</Group> : null}
      {lm.length ? <Group header="Landmarks">{lm.map((l) => <Row key={l.id} label={l.name} value={l.type ?? ''} />)}</Group> : null}
      {ms.length ? <Group header="Muscles attaching here">{ms.map((m) => <Row key={m.id} label={m.name} onPress={() => push({ key: `m:${m.id}`, title: m.name, render: () => <MuscleDetailPage id={m.id} /> })} />)}</Group> : null}
      <div class="spacer" />
    </Page>
  )
}

function StudyPage() {
  const app = useApp()
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const deck = useMemo(() => dueDeck(cards(), app.reviews, { limit: 30 }), [])
  const card = deck[i]
  if (!card) return (
    <Page title="Study"><Group footer={deck.length === 0 ? 'Nothing is due. Train — the cards between sets count.' : `${deck.length} cards reviewed.`}><Row label={deck.length === 0 ? 'Nothing due' : 'Session done'} /></Group></Page>
  )
  const state = app.reviews.get(card.id) ?? newReviewState(card.id)
  const next = previewIntervals(state)
  const grade = async (r: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy) => { await saveReview(review(state, r).state); setRevealed(false); setI(i + 1) }
  return (
    <Page title="Study" subtitle={`${i + 1} of ${deck.length} · ${card.kind.replace(/_/g, ' ')}${card.reviewStatus !== 'verified' ? ' · unverified draft' : ''}`}>
      <button class="card-face" style="width:calc(100% - 32px);display:block" onClick={() => setRevealed(true)}>
        <div style="font-size:20px" dangerouslySetInnerHTML={{ __html: card.front.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
        {revealed ? <ul style="margin:14px 0 0;padding-left:18px">{card.back.map((b, k) => <li key={k} class="secondary" style="margin-bottom:4px">{b}</li>)}</ul> : <p class="tiny" style="margin-top:18px">Tap to reveal</p>}
      </button>
      <div class="spacer" />
      {revealed && (
        <div class="grid2">
          <button class="btn" onClick={() => void grade(Rating.Again)}>Again<small>{rel(next.again)}</small></button>
          <button class="btn" onClick={() => void grade(Rating.Hard)}>Hard<small>{rel(next.hard)}</small></button>
          <button class="btn" onClick={() => void grade(Rating.Good)}>Good<small>{rel(next.good)}</small></button>
          <button class="btn" onClick={() => void grade(Rating.Easy)}>Easy<small>{rel(next.easy)}</small></button>
        </div>
      )}
    </Page>
  )
}
