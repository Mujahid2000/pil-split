"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pill, Square, MousePointer2, SplitSquareVertical, SplitSquareHorizontal, Trash2, Undo2, Redo2 } from 'lucide-react'
import { type Shape, type Tool, defaultColor, splitShape } from "@/lib/types"
import Palette from "@/components/palette"
import CanvasBoard from "@/components/canvas-board"

export default function PillSplitterApp() {
  const [tool, setTool] = useState<Tool>("select")
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<Shape[][]>([])
  const [future, setFuture] = useState<Shape[][]>([])

  function commitHistory(next: Shape[]) {
    setHistory((h) => [...h, shapes])
    setFuture([])
    setShapes(next)
  }

  function handleAddShape(shape: Shape) {
    commitHistory([...shapes, shape])
    setSelectedId(shape.id)
  }

  function handleUpdateShape(id: string, updater: (s: Shape) => Shape) {
    const next = shapes.map((s) => (s.id === id ? updater(s) : s))
    commitHistory(next)
  }

  function handleSplit(dir: "vertical" | "horizontal") {
    if (!selectedId) return
    const target = shapes.find((s) => s.id === selectedId)
    if (!target) return
    const pieces = splitShape(target, dir)
    const remaining = shapes.filter((s) => s.id !== selectedId)
    const next = [...remaining, ...pieces]
    commitHistory(next)
    setSelectedId(pieces[0]?.id ?? null)
  }

  function handleDelete() {
    if (!selectedId) return
    commitHistory(shapes.filter((s) => s.id !== selectedId))
    setSelectedId(null)
  }

  function undo() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setFuture((f) => [shapes, ...f])
    setShapes(prev)
    setSelectedId(null)
  }

  function redo() {
    if (future.length === 0) return
    const next = future[0]
    setFuture((f) => f.slice(1))
    setHistory((h) => [...h, shapes])
    setShapes(next)
    setSelectedId(null)
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Pill Splitter</CardTitle>
            <CardDescription>Create and split rounded “pill” shapes. Drag from the palette or draw an area.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={history.length === 0}>
              <Undo2 className="mr-1.5 h-4 w-4" />
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={future.length === 0}>
              <Redo2 className="mr-1.5 h-4 w-4" />
              Redo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <aside className="flex flex-col gap-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-2">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Tools</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={tool === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setTool("select")}
                aria-pressed={tool === "select"}
                title="Select/Move"
              >
                <MousePointer2 className="mr-2 h-4 w-4" />
                Select
              </Button>
              <Button
                variant={tool === "draw-rect" ? "default" : "outline"}
                size="sm"
                onClick={() => setTool("draw-rect")}
                aria-pressed={tool === "draw-rect"}
                title="Draw Rectangle"
              >
                <Square className="mr-2 h-4 w-4" />
                Rect
              </Button>
              <Button
                variant={tool === "draw-pill" ? "default" : "outline"}
                size="sm"
                onClick={() => setTool("draw-pill")}
                aria-pressed={tool === "draw-pill"}
                title="Draw Pill"
              >
                <Pill className="mr-2 h-4 w-4" />
                Pill
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-2">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Palette (Drag to canvas)</div>
            <Palette />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-2">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Actions</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSplit("vertical")}
                disabled={!selectedId}
                title="Split vertically"
              >
                <SplitSquareVertical className="mr-2 h-4 w-4" />
                Split V
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSplit("horizontal")}
                disabled={!selectedId}
                title="Split horizontally"
              >
                <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                Split H
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={!selectedId}
                title="Delete selected"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Tip: Use Draw tools and drag on the canvas. Or drag items from the Palette.
            </p>
          </div>
        </aside>

        <section>
          <CanvasBoard
            tool={tool}
            shapes={shapes}
            selectedId={selectedId}
            onAddShape={handleAddShape}
            onSelect={setSelectedId}
            onMoveShape={(id, x, y) => {
              handleUpdateShape(id, (s) => ({ ...s, x, y }))
            }}
            onResizeShape={(id, w, h) => {
              handleUpdateShape(id, (s) => ({ ...s, width: w, height: h }))
            }}
            onChangeColor={(id, color) => {
              handleUpdateShape(id, (s) => ({ ...s, color }))
            }}
          />
        </section>
      </CardContent>
    </Card>
  )
}
