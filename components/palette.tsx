"use client"

import { Pill, Square } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { defaultColor } from "@/lib/types"

export default function Palette() {
  const items = [
    { type: "pill" as const, label: "Pill", icon: Pill, defaultSize: { w: 160, h: 60 } },
    { type: "rect" as const, label: "Rectangle", icon: Square, defaultSize: { w: 160, h: 100 } },
  ]

  function onDragStart(
    e: React.DragEvent<HTMLDivElement>,
    payload: { type: "pill" | "rect"; width: number; height: number; color: string },
  ) {
    e.dataTransfer.setData("application/x-shape", JSON.stringify(payload))
    e.dataTransfer.setData("text/plain", JSON.stringify(payload))
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => {
        const Icon = it.icon
        return (
          <div
            key={it.type}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) =>
              onDragStart(e, {
                type: it.type,
                width: it.defaultSize.w,
                height: it.defaultSize.h,
                color: defaultColor,
              })
            }
            className="flex cursor-grab items-center gap-2 rounded-md border border-neutral-200 bg-white p-2 outline-none transition hover:bg-neutral-50 active:cursor-grabbing"
            aria-label={`Drag ${it.label} to canvas`}
          >
            <Icon className="h-4 w-4 text-neutral-700" />
            <span className="text-sm">{it.label}</span>
            <Badge variant="secondary" className="ml-auto">
              drag
            </Badge>
          </div>
        )
      })}
    </div>
  )
}
