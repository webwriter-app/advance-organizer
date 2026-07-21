import { Id, Point } from "../../../model/types";
import { applyDragDom } from "../dom-sync";
import { ModeContext, ModeHandlers, ModeOf } from "./types";

export function beginDrag(e: PointerEvent, ctx: ModeContext): void {
  const startPositions = new Map<Id, Point>();
  for (const id of ctx.selection.entries) {
    const item = ctx.doc.get(id);
    if (item?.kind === "node" || item?.kind === "image") {
      startPositions.set(id, { ...item.position });
    }
  }
  ctx.setMode({
    kind: "drag",
    start: { x: e.clientX, y: e.clientY },
    startPositions,
    items: new Set(ctx.selection.entries),
  });
}

function resolveDrag(
  mode: ModeOf<"drag">,
  pointer: Point,
  scale: number,
): Map<Id, Point> {
  const dx = (pointer.x - mode.start.x) / scale;
  const dy = (pointer.y - mode.start.y) / scale;

  const newPositions = new Map<Id, Point>();
  for (const [id, startPos] of mode.startPositions) {
    newPositions.set(id, { x: startPos.x + dx, y: startPos.y + dy });
  }
  return newPositions;
}

export const dragHandlers: ModeHandlers<"drag"> = {
  onPointerMove(pointer, mode, ctx) {
    const newPositions = resolveDrag(mode, pointer, ctx.zoom.scale);
    for (const [id, newPos] of newPositions) {
      applyDragDom(ctx.root, ctx.doc, id, newPos, newPositions);
    }
  },
  onPointerUp(pointer, mode, ctx) {
    if (pointer.x === mode.start.x && pointer.y === mode.start.y) return;
    const finalPositions = resolveDrag(mode, pointer, ctx.zoom.scale);
    ctx.doc.moveItems(finalPositions);
  },
};
