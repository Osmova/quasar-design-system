import assert from 'node:assert/strict'

export type ComputedCorners = readonly [string, string, string, string]

// CSS Backgrounds and Borders overlap reduction: one common factor scales all
// horizontal/vertical radii, not independent per-corner clamping.
export function usedCornerRadii(raw: ComputedCorners, width: number, height: number) {
  if (![width, height].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid border-box dimensions')
  const length = (value: string, axis: number) => {
    const match = value.match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(px|%)?$/i)
    if (!match) throw new Error(`Unsupported computed corner-radius component: ${value}`)
    const number = Number(match[1])
    if (!Number.isFinite(number)) throw new Error(`Non-finite computed corner radius: ${value}`)
    return match[2] === '%' ? number * axis / 100 : number
  }
  const corners = raw.map(value => {
    const axes = value.trim().split(/\s+/)
    if (axes.length < 1 || axes.length > 2) throw new Error(`Unsupported computed corner radius: ${value}`)
    return { x: length(axes[0], width), y: length(axes[1] ?? axes[0], height) }
  })
  const [tl, tr, br, bl] = corners
  const ratio = (axis: number, sum: number) => sum === 0 ? Infinity : axis / sum
  const scale = Math.min(1,
    ratio(width, tl.x + tr.x), ratio(width, bl.x + br.x),
    ratio(height, tl.y + bl.y), ratio(height, tr.y + br.y),
  )
  return { scale, corners: corners.map(corner => ({ x: corner.x * scale, y: corner.y * scale })) }
}

export function assertRadiusGeometryContracts() {
  for (const value of ['9999px', '33554400px']) {
    const result = usedCornerRadii([value, value, value, value], 80, 20)
    for (const corner of result.corners) { assert.ok(Math.abs(corner.x - 10) < 1e-12); assert.ok(Math.abs(corner.y - 10) < 1e-12) }
  }
  const ellipse = usedCornerRadii(['50%', '50%', '50%', '50%'], 100, 40)
  assert.equal(ellipse.scale, 1)
  assert.deepEqual(ellipse.corners, Array.from({ length: 4 }, () => ({ x: 50, y: 20 })))
  const asymmetric = usedCornerRadii(['80px 40px', '80px 20px', '20px 20px', '20px 40px'], 100, 60)
  assert.equal(asymmetric.scale, 0.625)
  assert.deepEqual(asymmetric.corners, [{ x: 50, y: 25 }, { x: 50, y: 12.5 }, { x: 12.5, y: 12.5 }, { x: 12.5, y: 25 }])
  assert.deepEqual(usedCornerRadii(['0px', '0px', '0px', '0px'], 100, 40).corners, Array.from({ length: 4 }, () => ({ x: 0, y: 0 })))
}
