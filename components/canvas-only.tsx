"use client"

import { useRef, useState } from "react"
import {
  makeId,
  clampRect,
  type Shape,
  containsPoint,
  splitVerticalAt,
  splitHorizontalAt,
  splitIntoFourAtPoint,
} from "@/lib/types"

const COLORS = ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#84cc16"]
const CLICK_THRESHOLD = 3 // px

export default function CanvasOnly() {
  const boardRef = useRef<HTMLDivElement>(null)
  const colorIndexRef = useRef(0)

  const [shapes, setShapes] = useState<Shape[]>([])
  const [cursor, setCursor] = useState<null | { x: number; y: number }>(null)

  const [dragging, setDragging] = useState<null | {
    startX: number
    startY: number
    x: number
    y: number
    w: number
    h: number
  }>(null)

  const [moving, setMoving] = useState<null | {
    id: string
    offsetX: number
    offsetY: number
    w: number
    h: number
  }>(null)

  const downRef = useRef<null | {
    x: number
    y: number
    target: "canvas" | "shape"
    shapeId?: string
  }>(null)

  function getLocalPoint(clientX: number, clientY: number) {
    const el = boardRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - r.left, r.width))
    const y = Math.max(0, Math.min(clientY - r.top, r.height))
    return { x, y }
  }

  function nextColor() {
    colorIndexRef.current = (colorIndexRef.current + 1) % COLORS.length
    return COLORS[colorIndexRef.current]
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    const { x, y } = getLocalPoint(e.clientX, e.clientY)
    setCursor({ x, y })
    downRef.current = { x, y, target: "canvas" }
    setDragging({ startX: x, startY: y, x, y, w: 0, h: 0 })
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const { x: cx, y: cy } = getLocalPoint(e.clientX, e.clientY)
    setCursor({ x: cx, y: cy })

    if (dragging) {
      const x = Math.min(dragging.startX, cx)
      const y = Math.min(dragging.startY, cy)
      const w = Math.abs(cx - dragging.startX)
      const h = Math.abs(cy - dragging.startY)
      setDragging((d) => (d ? { ...d, x, y, w, h } : d))
    }

    if (moving) {
      const el = boardRef.current
      if (!el) return
      const nx = Math.round(cx - moving.offsetX)
      const ny = Math.round(cy - moving.offsetY)
      const bounds = el.getBoundingClientRect()
      const maxX = Math.max(0, Math.round(bounds.width - moving.w))
      const maxY = Math.max(0, Math.round(bounds.height - moving.h))
      const clampedX = Math.max(0, Math.min(nx, maxX))
      const clampedY = Math.max(0, Math.min(ny, maxY))
      setShapes((prev) =>
        prev.map((s) => (s.id === moving.id ? { ...s, x: clampedX, y: clampedY } : s)),
      )
    }
  }

  function finishDrawing() {
    if (!dragging || !boardRef.current) return
    const r = boardRef.current.getBoundingClientRect()
    const rect = clampRect(
      { x: dragging.x, y: dragging.y, w: dragging.w, h: dragging.h },
      { w: r.width, h: r.height },
    )
    if (rect.w > 5 && rect.h > 5) {
      const shape: Shape = {
        id: makeId(),
        type: "rect",
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.w),
        height: Math.round(rect.h),
        color: nextColor(),
      }
      setShapes((prev) => [...prev, shape])
    }
    setDragging(null)
  }

  function performSplitAt(x: number, y: number) {
    if (!shapes.length) return

    const underCursorIds = new Set<string>()
    const verticalLineIds = new Set<string>()
    const horizontalLineIds = new Set<string>()

    for (const s of shapes) {
      const contains = containsPoint(s, x, y)
      if (contains) {
        underCursorIds.add(s.id)
        continue
      }
      const vHit = x >= s.x && x <= s.x + s.width
      const hHit = y >= s.y && y <= s.y + s.height
      if (vHit) verticalLineIds.add(s.id)
      if (hHit) horizontalLineIds.add(s.id)
    }

    if (
      underCursorIds.size === 0 &&
      verticalLineIds.size === 0 &&
      horizontalLineIds.size === 0
    ) {
      return
    }

    const next: Shape[] = []
    for (const s of shapes) {
      if (underCursorIds.has(s.id)) {
        const parts = splitIntoFourAtPoint(s, x, y)
        if (parts) next.push(...parts)
        else next.push(s)
        continue
      }

      if (verticalLineIds.has(s.id)) {
        const parts = splitVerticalAt(s, x)
        if (parts) next.push(...parts)
        else next.push(s)
        continue
      }

      if (horizontalLineIds.has(s.id)) {
        const parts = splitHorizontalAt(s, y)
        if (parts) next.push(...parts)
        else next.push(s)
        continue
      }

      next.push(s)
    }

    setShapes(next)
  }

  function handlePointerUp(e: React.PointerEvent) {
    const down = downRef.current
    downRef.current = null

    const { x: upX, y: upY } = getLocalPoint(e.clientX, e.clientY)

    if (moving) {
      setMoving(null)
      if (down && down.target === "shape") {
        const moveDist = Math.hypot(upX - down.x, upY - down.y)
        if (moveDist <= CLICK_THRESHOLD) {
          performSplitAt(upX, upY)
          return
        }
      }
      return
    }

    if (dragging) {
      const moveDist = Math.hypot(dragging.startX - upX, dragging.startY - upY)
      if (moveDist <= CLICK_THRESHOLD) {
        setDragging(null)
        performSplitAt(upX, upY)
        return
      }
      finishDrawing()
      return
    }
  }

  function handlePointerLeave() {
    if (dragging) {
      const moved = Math.max(dragging.w, dragging.h)
      if (moved > CLICK_THRESHOLD) finishDrawing()
      else setDragging(null)
    }
    if (moving) setMoving(null)
    setCursor(null)
    downRef.current = null
  }

  function onShapePointerDown(e: React.PointerEvent, shape: Shape) {
    if (e.button !== 0) return
    e.stopPropagation()
    const { x, y } = getLocalPoint(e.clientX, e.clientY)
    downRef.current = { x, y, target: "shape", shapeId: shape.id }

    // Bring to front
    setShapes((prev) => {
      const idx = prev.findIndex((s) => s.id === shape.id)
      if (idx === -1) return prev
      const copy = prev.slice()
      const [item] = copy.splice(idx, 1)
      copy.push(item)
      return copy
    })
    setMoving({
      id: shape.id,
      offsetX: x - shape.x,
      offsetY: y - shape.y,
      w: shape.width,
      h: shape.height,
    })
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  return (
    <div className="relative h-[100svh] w-full select-none bg-white" role="application" aria-label="Drawing canvas">
      <div
        ref={boardRef}
        className="relative h-full w-full overflow-hidden"
        style={{
          cursor: moving ? "grabbing" : 'url("/images/cursor-cross.png") 16 16, crosshair',
          backgroundColor: "#ffffff",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
      >
        {shapes.map((s) => (
          <div
            key={s.id}
            role="button"
            aria-label="shape"
            aria-grabbed={moving?.id === s.id ? "true" : "false"}
            onPointerDown={(e) => onShapePointerDown(e, s)}
            className="absolute"
            style={{
              left: s.x,
              top: s.y,
              width: s.width,
              height: s.height,
              backgroundColor: s.color,
              boxShadow: "0 0 0 2px #ffffff",
              cursor: moving?.id === s.id ? "grabbing" : "grab",
              touchAction: "none",
            }}
          />
        ))}

        {dragging ? (
          <div
            className="absolute border-2 border-neutral-700/50 bg-neutral-800/10"
            style={{
              left: dragging.x,
              top: dragging.y,
              width: dragging.w,
              height: dragging.h,
              borderRadius: 10,
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />
        ) : null}

        {cursor ? (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-emerald-600/50"
              style={{ left: Math.round(cursor.x) }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-x-0 h-px bg-emerald-600/50"
              style={{ top: Math.round(cursor.y) }}
              aria-hidden="true"
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
