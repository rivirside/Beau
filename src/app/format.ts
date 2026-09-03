const LB = 0.45359237

export const toDisplay = (kg: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? kg : kg / LB

export const fromDisplay = (value: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? value : value * LB

/** Rounded so an lb → kg → lb round trip reads 135, not 134.9. */
export function fmtWeight(kg: number, unit: 'kg' | 'lb'): string {
  if (kg === 0) return unit === 'kg' ? '0 kg' : '0 lb'
  const v = toDisplay(kg, unit)
  const rounded = unit === 'kg' ? Math.round(v * 4) / 4 : Math.round(v * 2) / 2
  return `${rounded} ${unit}`
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const days = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
