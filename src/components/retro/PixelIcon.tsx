import { C } from './pixel-font'

type Palette = Record<string, string>

const DEFAULT_PAL: Palette = { B: C.blue, W: C.white, M: C.mid }

export const ICON_LINK = [
  '..........',
  '.BBBB.....',
  'B....B....',
  'B...BBBB..',
  'B..B.B..B.',
  '.BBBB...B.',
  '....B....B',
  '....B...B.',
  '.....BBBB.',
]

export const ICON_P = [
  'BBBBBBBBB',
  'B.......B',
  'B.MMMM..B',
  'B.M...M.B',
  'B.MMMM..B',
  'B.M.....B',
  'B.M.....B',
  'B.......B',
  'BBBBBBBBB',
]

export const ICON_QR = [
  'MMM.M.MMM',
  'M.M..MM.M',
  'MMM.M.MMM',
  '...M.M...',
  'M.MM.MM.M',
  '...M..M..',
  'MMM.MM.M.',
  'M.M..M.MM',
  'MMM.M.M.M',
]

interface Props {
  rows: string[]
  pal?: Palette
}

export function PixelIcon({ rows, pal = DEFAULT_PAL }: Props) {
  const h = rows.length
  const w = rows[0].length
  const rects: string[] = []
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const fill = pal[rows[r][c]]
      if (fill) {
        rects.push(`<rect x="${c}" y="${r}" width="1" height="1" fill="${fill}"/>`)
      }
    }
  }
  return (
    <svg
      className="ico"
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ imageRendering: 'pixelated' }}
      dangerouslySetInnerHTML={{ __html: rects.join('') }}
    />
  )
}
