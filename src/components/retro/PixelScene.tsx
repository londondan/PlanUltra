import { C } from './pixel-font'

const RUNNER = ['...WW..','...WW..','..MMM..','.M.MM.M','...MM..','..M..M.','.M...M.','M.....M']
const CAR    = ['...WWWW....','..WBBWBBW..','WWWWWWWWWWW','WWWWWWWWWWW','.MM.....MM.']
const PSIGN  = ['WWWWWWW','WBBBBWW','WBWWWBW','WBWWWBW','WBBBBWW','WBWWWWW','WBWWWWW','WWWWWWW','...M...','...M...','...M...']
const FLAG   = ['MWWW','MWWW','M...','M...','M...','M...']

const MOON = ['..MMM..','.MMMMM.','MMSMMMM','MMMMMSM','MMMMMMM','.MSMMM.','..MMM..']

const SPRITE_PAL: Record<string, string> = {
  M: C.mid, W: C.white, B: C.blue, S: C.sky,
}

function mulberry32(seed: number) {
  let s = seed
  return function () {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function heights(cols: number, base: number, amps: [number, number][], seed: number): number[] {
  const rng = mulberry32(seed)
  const waves: [number, number, number][] = amps.map(([a, f]) => [a, (rng() * 0.8 + 0.6) * f, rng() * 6.28])
  return Array.from({ length: cols }, (_, c) =>
    Math.max(1, Math.round(
      base + waves.reduce((sum, [a, f, p]) => sum + a * Math.sin(2 * Math.PI * f * c / cols + p), 0)
    ))
  )
}

function spriteRects(rows: string[], ox: number, oy: number): string {
  return rows.flatMap((row, r) =>
    row.split('').map((ch, c) => {
      const fill = SPRITE_PAL[ch]
      return fill ? `<rect x="${ox + c}" y="${oy + r}" width="1" height="1" fill="${fill}"/>` : ''
    })
  ).join('')
}

interface Props {
  cols?: number
  rows?: number
  stars?: boolean
  runner?: boolean
  cls?: string
  style?: React.CSSProperties
}

export function PixelScene({ cols = 180, rows = 44, stars = true, runner = true, cls = 'scene', style }: Props) {
  const out: string[] = []

  if (stars) {
    const rng = mulberry32(7)
    const starColors = [C.white, C.sky, C.sky]
    const opacities = ['0.5', '0.8', '1']
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rng() * cols)
      const y = Math.floor(rng() * (rows - 16))
      const fill = starColors[Math.floor(rng() * 3)]
      const opacity = opacities[Math.floor(rng() * 3)]
      out.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" opacity="${opacity}"/>`)
    }
    for (let dy = 0; dy < MOON.length; dy++) {
      for (let dx = 0; dx < MOON[dy].length; dx++) {
        const ch = MOON[dy][dx]
        if (ch === 'M') out.push(`<rect x="${14 + dx}" y="${3 + dy}" width="1" height="1" fill="${C.mist}"/>`)
        else if (ch === 'S') out.push(`<rect x="${14 + dx}" y="${3 + dy}" width="1" height="1" fill="${C.sky}"/>`)
      }
    }
  }

  const back  = heights(cols, 22, [[8, 2], [4, 5], [2, 11]], 3)
  const midl  = heights(cols, 15, [[6, 3], [3, 7], [1.5, 13]], 9)
  const front = heights(cols, 8,  [[3, 4], [2, 9], [1, 17]], 4)
  const peak  = Math.max(...back)

  for (let c = 0; c < cols; c++) {
    const h = back[c]
    out.push(`<rect x="${c}" y="${rows - h}" width="1" height="${h}" fill="${C.deep}"/>`)
    if (h >= peak - 3) {
      out.push(`<rect x="${c}" y="${rows - h}" width="1" height="${Math.min(2, h)}" fill="${C.mist}"/>`)
    }
  }
  for (let c = 0; c < cols; c++) {
    const h = midl[c]
    out.push(`<rect x="${c}" y="${rows - h}" width="1" height="${h}" fill="${C.blue}"/>`)
  }
  for (let c = 0; c < cols; c++) {
    const h = front[c]
    out.push(`<rect x="${c}" y="${rows - h}" width="1" height="${h}" fill="${C.sky}"/>`)
  }

  if (runner) {
    const rc = 46
    out.push(spriteRects(RUNNER, rc, rows - front[rc + 3] - 8))
    const fc = 30
    out.push(spriteRects(FLAG, fc, rows - front[fc] - 6))
    const cc = 108
    const carBase = Math.max(...front.slice(cc, cc + 10))
    out.push(spriteRects(CAR, cc, rows - carBase - 5))
    const pc = 121
    out.push(spriteRects(PSIGN, pc, rows - front[pc + 3] - 11))
  }

  return (
    <svg
      className={cls}
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ imageRendering: 'pixelated', ...style }}
      dangerouslySetInnerHTML={{ __html: out.join('') }}
    />
  )
}
