"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { type Shape, type Tool, makeId, clampRect } from "@/lib/types"

type Props = {
  tool: Tool
  shapes: Shape[]
  selectedId: string | null
  onAddShape: (shape: Shape) => void
  onSelect: (id: string | null) => void
  onMoveShape: (id: string, x: number, y: number) => void
  onResizeShape: (id: string, w: number, h: number) => void
  onChangeColor: (id: string, color: string) => void
}

export default function CanvasBoard({
  tool,
  shapes,
  selectedId,
  onAddShape,
  onSelect,
  onMoveShape,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null)

  // Drawing selection state
  const [dragging, setDragging] = useState<null | {
    startX: number
    startY: number
    x: number
    y: number
    w: number
    h: number
  }>(null)

  // Moving existing shape
  const [moving, setMoving] = useState<null | { id: string; offsetX: number; offsetY: number }>(null)

  const cursorStyle = useMemo(() => {
    if (tool === "draw-pill" || tool === "draw-rect") {
      return { cursor: 'url("/images/cursor-cross.png") 16 16, crosshair' }
    }
    return { cursor: "default" }
  }, [tool])

  const getLocalPoint = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
      x: clientX - r.left,
      y: clientY - r.top,
    }
  }, [])

  // Handle draw start
  function handlePointerDown(e: React.PointerEvent) {
    // Only draw when tool is drawing and primary button
    if (e.button !== 0) return

    const local = getLocalPoint(e.clientX, e.clientY)

    // If clicking on empty space while in select mode, clear selection.
    if (tool === "select") {
      if (e.target === boardRef.current) {
        onSelect(null)
      }
      return
    }

    setDragging({
      startX: local.x,
      startY: local.y,
      x: local.x,
      y: local.y,
      w: 0,
      h: 0,
    })
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragging) {
      const local = getLocalPoint(e.clientX, e.clientY)
      const x = Math.min(dragging.startX, local.x)
      const y = Math.min(dragging.startY, local.y)
      const w = Math.abs(local.x - dragging.startX)
      const h = Math.abs(local.y - dragging.startY)
      setDragging((d) => (d ? { ...d, x, y, w, h } : d))
    }

    if (moving) {
      const local = getLocalPoint(e.clientX, e.clientY)
      const nx = local.x - moving.offsetX
      const ny = local.y - moving.offsetY
      onMoveShape(moving.id, Math.round(nx), Math.round(ny))
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (dragging) {
      const el = boardRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const rect = clampRect(
        { x: dragging.x, y: dragging.y, w: dragging.w, h: dragging.h },
        { w: r.width, h: r.height },
      )

      if (rect.w > 5 && rect.h > 5) {
        const newShape: Shape = {
          id: makeId(),
          type: tool === "draw-pill" ? "pill" : "rect",
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.w),
          height: Math.round(rect.h),
          color: "#10b981", // emerald-500 default
        }
        onAddShape(newShape)
      }
      setDragging(null)
    }
    if (moving) {
      setMoving(null)
    }
  }

  // Drop from palette
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const data =
      e.dataTransfer.getData("application/x-shape") || e.dataTransfer.getData("text/plain")
    if (!data) return
    const payload = JSON.parse(data) as {
      type: "pill" | "rect"
      width: number
      height: number
      color: string
    }
    const local = getLocalPoint(e.clientX, e.clientY)
    const shape: Shape = {
      id: makeId(),
      type: payload.type,
      x: Math.round(local.x - payload.width / 2),
      y: Math.round(local.y - payload.height / 2),
      width: payload.width,
      height: payload.height,
      color: payload.color,
    }
    onAddShape(shape)
  }

  function onShapePointerDown(e: React.PointerEvent, shape: Shape) {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(shape.id)
    const local = getLocalPoint(e.clientX, e.clientY)
    setMoving({ id: shape.id, offsetX: local.x - shape.x, offsetY: local.y - shape.y })
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  return (
    <div className="relative">
      <div
        ref={boardRef}
        className={cn(
          "relative h-[70vh] min-h-[420px] w-full select-none overflow-hidden rounded-lg border border-neutral-200 bg-white",
          "shadow-sm",
        )}
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #f5f5f4, #f5f5f4 24px, #f0f0ef 24px, #f0f0ef 48px), repeating-linear-gradient(90deg, #f5f5f4, #f5f5f4 24px, #f0f0ef 24px, #f0f0ef 48px)",
          backgroundBlendMode: "multiply",
          ...cursorStyle,
        }}
        role="application"
        aria-label="Canvas area"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Shapes */}
        {shapes.map((s) => {
          const selected = s.id === selectedId
          return (
            <div
              key={s.id}
              role="button"
              aria-label={`Shape ${s.type}`}
              tabIndex={0}
              onPointerDown={(e) => onShapePointerDown(e, s)}
              className={cn(
                "absolute box-border outline-none transition-[box-shadow,transform]",
                selected ? "shadow-[0_0_0_2px_rgba(16,185,129,0.6)]" : "",
              )}
              style={{
                left: s.x,
                top: s.y,
                width: s.width,
                height: s.height,
                borderRadius: s.type === "pill" ? 9999 : 10,
                backgroundColor: s.color,
                cursor: "grab",
              }}
            />
          )
        })}

        {/* Draw selection rect */}
        {dragging && (tool === "draw-rect" || tool === "draw-pill") ? (
          <div
            className="absolute border-2 border-emerald-500/80 bg-emerald-500/10"
            style={{
              left: dragging.x,
              top: dragging.y,
              width: dragging.w,
              height: dragging.h,
              borderRadius: tool === "draw-pill" ? 9999 : 8,
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />
        ) : null}
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Drawing uses a custom cross cursor. Drag to create shapes. Click and drag shapes to move them.
      </p>
    </div>
  )
}
