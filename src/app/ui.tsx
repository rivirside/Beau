/** The iOS-style kit every screen is built from: grouped lists, disclosure rows,
 *  switches, a segmented control, an action sheet, and the page chrome. */

import type { ComponentChildren } from 'preact'
import { pop, useNav } from './nav'

const Chevron = () => (
  <svg class="chevron" viewBox="0 0 8 13" fill="none">
    <path d="M1 1l5.5 5.5L1 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

/** Page chrome. Root pages get a large title; pushed pages get a back button. */
export function Page(props: { title: string; subtitle?: string; trailing?: ComponentChildren;
                             children: ComponentChildren; bare?: boolean }) {
  const { stack } = useNav()
  const pushed = stack.length > 0
  return (
    <main class={props.bare ? 'bare' : ''}>
      <div class="navbar">
        <div>{pushed && (
          <button class="back" onClick={pop}>
            <svg viewBox="0 0 12 20" fill="none"><path d="M10 2L2 10l8 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
            Back
          </button>
        )}</div>
        <div class="title">{pushed ? props.title : ''}</div>
        <div class="trailing">{props.trailing}</div>
      </div>
      {!pushed && <h1 class="large-title">{props.title}</h1>}
      {pushed && <h1 class="large-title" style="padding-top:2px">{props.title}</h1>}
      {props.subtitle && <p class="subtitle">{props.subtitle}</p>}
      {props.children}
    </main>
  )
}

export function Group(props: { header?: string; footer?: ComponentChildren; children: ComponentChildren }) {
  return (
    <>
      {props.header && <div class="group-header">{props.header}</div>}
      <div class="group">{props.children}</div>
      {props.footer && <div class="group-footer">{props.footer}</div>}
    </>
  )
}

export function Row(props: {
  label: ComponentChildren; sub?: ComponentChildren; value?: ComponentChildren;
  onPress?: () => void; chevron?: boolean; accentValue?: boolean; children?: ComponentChildren
}) {
  const content = (
    <>
      <div class="label"><span>{props.label}</span>{props.sub && <span class="sub">{props.sub}</span>}</div>
      {props.children ?? (props.value !== undefined && <span class={`value${props.accentValue ? ' accent' : ''}`}>{props.value}</span>)}
      {(props.chevron ?? !!props.onPress) ? <Chevron /> : <span />}
    </>
  )
  return props.onPress
    ? <button class="row pressable" onClick={props.onPress}>{content}</button>
    : <div class="row">{content}</div>
}

export function ButtonRow(props: { label: string; onPress: () => void; destructive?: boolean; primary?: boolean; disabled?: boolean }) {
  return (
    <button class={`row button${props.destructive ? ' destructive' : ''}${props.primary ? ' primary' : ''}`}
            onClick={props.onPress} disabled={props.disabled}>{props.label}</button>
  )
}

export function ToggleRow(props: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div class="row">
      <div class="label"><span>{props.label}</span>{props.sub && <span class="sub">{props.sub}</span>}</div>
      <button class={`switch${props.on ? ' on' : ''}`} aria-pressed={props.on} onClick={() => props.onChange(!props.on)} />
      <span />
    </div>
  )
}

export function InputRow(props: { label: string; value: string | number; placeholder?: string;
                                  inputMode?: 'decimal' | 'numeric' | 'text'; unit?: string;
                                  onCommit: (v: string) => void }) {
  return (
    <div class="row">
      <div class="label"><span>{props.label}</span></div>
      <div class="value accent" style="display:flex;gap:6px;align-items:center">
        <input class="input" type={props.inputMode === 'text' ? 'text' : 'number'} inputMode={props.inputMode ?? 'decimal'}
               value={props.value} placeholder={props.placeholder}
               onChange={(e) => props.onCommit((e.target as HTMLInputElement).value)} />
        {props.unit && <span class="secondary">{props.unit}</span>}
      </div>
      <span />
    </div>
  )
}

export function Segmented<T extends string>(props: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div class="segmented">
      {props.options.map((o) => (
        <button key={o.id} class={props.value === o.id ? 'on' : ''} onClick={() => props.onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Custom(props: { children: ComponentChildren }) {
  return <div class="row-custom">{props.children}</div>
}

export function Bar(props: { value: number; color?: string }) {
  const v = Math.max(0, Math.min(1, props.value))
  const color = props.color ?? (v > 0.75 ? 'var(--green)' : v > 0.45 ? 'var(--orange)' : 'var(--red)')
  return <div class="bar"><span style={`width:${Math.round(v * 100)}%;background:${color}`} /></div>
}

export function ActionSheet(props: { title?: string; actions: { label: string; destructive?: boolean; onPress: () => void }[]; onCancel: () => void }) {
  return (
    <div class="sheet" onClick={(e) => { if (e.target === e.currentTarget) props.onCancel() }}>
      <div>
        <div class="group">
          {props.title && <div class="sheet-title">{props.title}</div>}
          {props.actions.map((a, i) => <ButtonRow key={i} label={a.label} destructive={a.destructive} onPress={a.onPress} />)}
        </div>
        <div class="group"><ButtonRow label="Cancel" onPress={props.onCancel} /></div>
      </div>
    </div>
  )
}

export const Icons = {
  today: <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="20" height="18" rx="3"/><path d="M3 10h20M8 3v4M18 3v4"/><circle cx="13" cy="16" r="2.2" fill="currentColor" stroke="none"/></svg>,
  progress: <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 21h18"/><path d="M6 17l5-6 4 3 5-8"/></svg>,
  learn: <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 016.5 3H21v17H6.5A2.5 2.5 0 004 22.5z"/><path d="M4 20a2.5 2.5 0 012.5-2.5H21"/></svg>,
  settings: <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="13" cy="13" r="3.2"/><path d="M13 2.5v3M13 20.5v3M2.5 13h3M20.5 13h3M5.6 5.6l2.1 2.1M18.3 18.3l2.1 2.1M5.6 20.4l2.1-2.1M18.3 7.7l2.1-2.1"/></svg>,
}
