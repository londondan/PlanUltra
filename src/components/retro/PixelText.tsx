import { C, textRects } from './pixel-font'

type Line = [string, string]

interface Props {
  lines: Line[]
  label: string
  shadow?: string
  className?: string
}

export function PixelText({ lines, label, shadow = C.deep, className = 'pxhead' }: Props) {
  const rects: string[] = []
  let maxw = 0

  for (let i = 0; i < lines.length; i++) {
    const [t, col] = lines[i]
    const y = i * 10
    const [s] = textRects(t, 1, y + 1, shadow)
    const [f, w] = textRects(t, 0, y, col)
    rects.push(...s, ...f)
    maxw = Math.max(maxw, w + 1)
  }

  const h = lines.length * 10 - 2

  return (
    <svg
      className={className}
      viewBox={`0 0 ${maxw} ${h}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated' }}
      dangerouslySetInnerHTML={{ __html: rects.join('') }}
    />
  )
}
