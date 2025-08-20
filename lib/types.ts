export type Tool = "select" | "draw-rect" | "draw-pill"

export type Shape = {
  id: string
  type: "pill" | "rect"
  x: number
  y: number
  width: number
  height: number
  color: string
}

export const defaultColor = "#10b981"

// Minimum part sizes for split results
export const MIN_PART_WIDTH = 24
export const MIN_PART_HEIGHT = 24

export function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export function clampRect(
  rect: { x: number; y: number; w: number; h: number },
  bounds: { w: number; h: number },
) {
  const x = Math.max(0, Math.min(rect.x, bounds.w))
  const y = Math.max(0, Math.min(rect.y, bounds.h))
  const w = Math.max(0, Math.min(rect.w, bounds.w - x))
  const h = Math.max(0, Math.min(rect.h, bounds.h - y))
  return { x, y, w, h }
}

export function containsPoint(s: Shape, px: number, py: number) {
  return px >= s.x && px <= s.x + s.width && py >= s.y && py <= s.y + s.height
}

/**
 * Split vertically at absolute canvas X. Returns two parts if both meet min sizes, else null.
 */
export function splitVerticalAt(s: Shape, absoluteX: number): [Shape, Shape] | null {
  const cutX = Math.round(absoluteX)
  const leftW = cutX - s.x
  const rightW = s.x + s.width - cutX
  if (leftW < MIN_PART_WIDTH || rightW < MIN_PART_WIDTH) return null

  const left: Shape = {
    ...s,
    id: makeId(),
    width: leftW,
  }
  const right: Shape = {
    ...s,
    id: makeId(),
    x: cutX,
    width: rightW,
  }
  return [left, right]
}

/**
 * Split horizontally at absolute canvas Y. Returns two parts if both meet min sizes, else null.
 */
export function splitHorizontalAt(s: Shape, absoluteY: number): [Shape, Shape] | null {
  const cutY = Math.round(absoluteY)
  const topH = cutY - s.y
  const bottomH = s.y + s.height - cutY
  if (topH < MIN_PART_HEIGHT || bottomH < MIN_PART_HEIGHT) return null

  const top: Shape = {
    ...s,
    id: makeId(),
    height: topH,
  }
  const bottom: Shape = {
    ...s,
    id: makeId(),
    y: cutY,
    height: bottomH,
  }
  return [top, bottom]
}

/**
 * Split into four parts with vertical and horizontal cuts crossing at the absolute point (px, py).
 * Returns four parts if all meet min sizes; otherwise null (no split).
 */
export function splitIntoFourAtPoint(
  s: Shape,
  px: number,
  py: number,
): [Shape, Shape, Shape, Shape] | null {
  const cutX = Math.round(px)
  const cutY = Math.round(py)

  const leftW = cutX - s.x
  const rightW = s.x + s.width - cutX
  const topH = cutY - s.y
  const bottomH = s.y + s.height - cutY

  const valid =
    leftW >= MIN_PART_WIDTH &&
    rightW >= MIN_PART_WIDTH &&
    topH >= MIN_PART_HEIGHT &&
    bottomH >= MIN_PART_HEIGHT

  if (!valid) return null

  const tl: Shape = {
    ...s,
    id: makeId(),
    width: leftW,
    height: topH,
  }
  const tr: Shape = {
    ...s,
    id: makeId(),
    x: cutX,
    width: rightW,
    height: topH,
  }
  const bl: Shape = {
    ...s,
    id: makeId(),
    y: cutY,
    width: leftW,
    height: bottomH,
  }
  const br: Shape = {
    ...s,
    id: makeId(),
    x: cutX,
    y: cutY,
    width: rightW,
    height: bottomH,
  }

  return [tl, tr, bl, br]
}

export function splitShape(shape: Shape, dir: "vertical" | "horizontal"): Shape[] {
  if (dir === "vertical") {
    const split = splitVerticalAt(shape, shape.x + shape.width / 2)
    return split ? split : [shape]
  } else {
    const split = splitHorizontalAt(shape, shape.y + shape.height / 2)
    return split ? split : [shape]
  }
}
