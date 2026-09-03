/** Configuration axes. The vocabulary is global; which axes apply to a movement,
 *  which values are legal, and what each value does are properties of the
 *  movement (see Movement.axes). Modifiers are never global — `pulley_height:
 *  high` means something different for a fly than for a pushdown. §3 */

export const AXES = {
  pulley_height:    ['floor', 'low', 'mid', 'chest', 'high', 'overhead'],
  bench_angle:      ['decline', 'flat', 'incline_low', 'incline_high', 'upright'],
  grip_width:       ['narrow', 'shoulder', 'wide'],
  grip_orientation: ['pronated', 'supinated', 'neutral', 'mixed', 'rotating'],
  attachment:       ['rope', 'straight_bar', 'ez_bar', 'lat_bar', 'v_bar',
                     'd_handle', 'single_d', 'ankle_strap', 'belt', 'none'],
  stance:           ['narrow', 'hip', 'shoulder', 'wide', 'staggered', 'split'],
  body_position:    ['standing', 'seated', 'lying', 'prone', 'bent_over',
                     'kneeling', 'half_kneeling'],
  laterality:       ['bilateral', 'unilateral', 'alternating'],
  rom_bias:         ['full', 'lengthened_partial', 'shortened_partial'],
  /** Tibial rotation on leg curls, and foot turn-out on calf work. The axis
   *  that makes the medial/lateral hamstring split actually programmable. */
  foot_rotation:    ['neutral', 'internal', 'external'],
} as const

export type AxisId = keyof typeof AXES
export type AxisValue<A extends AxisId = AxisId> = (typeof AXES)[A][number]

/** Approximate bench angles in degrees, for gyms whose benches report a range. */
export const BENCH_ANGLE_DEG: Record<(typeof AXES)['bench_angle'][number], [number, number]> = {
  decline:      [-30, -10],
  flat:         [0, 0],
  incline_low:  [15, 30],
  incline_high: [45, 60],
  upright:      [75, 90],
}
