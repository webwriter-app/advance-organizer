import { Dimension, Id, Point, ResizeHandle } from "../../../model/types";
import { applyResizeDom } from "../dom-sync";
import { HANDLE_CURSORS, MIN_NODE_SIZE } from "../helper";
import { ModeContext, ModeHandlers, ModeOf } from "./types";

export function beginResize(
  e: PointerEvent,
  itemId: Id,
  handle: ResizeHandle,
  ctx: ModeContext,
): void {
  const item = ctx.doc.get(itemId);
  if (!item || (item.kind !== "node" && item.kind !== "image")) return;

  ctx.host.style.setProperty("--ao-resize-cursor", HANDLE_CURSORS[handle]);
  ctx.host.classList.add("resizing");

  ctx.setMode({
    kind: "resize",
    start: { x: e.clientX, y: e.clientY },
    startPosition: { ...item.position },
    startDimension: { ...item.dimension },
    handle,
    itemId,
    aspectRatio: item.dimension.width / item.dimension.height,
    lockByDefault: item.kind === "image",
  });
}

function computeResize(
  handle: ResizeHandle,
  startPos: Point,
  startDim: Dimension,
  dx: number,
  dy: number,
  aspectRatio?: number,
): { newPos: Point; newDim: Dimension } {
  const xSign = handle.includes("r") ? 1 : handle.includes("l") ? -1 : 0;
  const ySign = handle.includes("b") ? 1 : handle.includes("t") ? -1 : 0;

  let newW: number;
  let newH: number;

  if (aspectRatio && aspectRatio > 0) {
    if (xSign !== 0 && ySign !== 0) {
      // Orthogonal projection of the cursor onto the aspect ratio line
      const uW = startDim.width + xSign * dx;
      const uH = startDim.height + ySign * dy;

      const denom = aspectRatio * aspectRatio + 1;
      let proj = (uW * aspectRatio + uH) / denom;

      const minProj = Math.max(MIN_NODE_SIZE, MIN_NODE_SIZE / aspectRatio);
      proj = Math.max(proj, minProj);

      newW = proj * aspectRatio;
      newH = proj;
    } else if (xSign !== 0) {
      // Height follows width
      newW = Math.max(MIN_NODE_SIZE, startDim.width + xSign * dx);
      newH = newW / aspectRatio;
      if (newH < MIN_NODE_SIZE) {
        newH = MIN_NODE_SIZE;
        newW = newH * aspectRatio;
      }
    } else {
      // Width follows height
      newH = Math.max(MIN_NODE_SIZE, startDim.height + ySign * dy);
      newW = newH * aspectRatio;
      if (newW < MIN_NODE_SIZE) {
        newW = MIN_NODE_SIZE;
        newH = newW / aspectRatio;
      }
    }
  } else {
    newW = Math.max(MIN_NODE_SIZE, startDim.width + xSign * dx);
    newH = Math.max(MIN_NODE_SIZE, startDim.height + ySign * dy);
  }

  const actualDw = newW - startDim.width;
  const actualDh = newH - startDim.height;

  return {
    newPos: {
      x: startPos.x + (xSign * actualDw) / 2,
      y: startPos.y + (ySign * actualDh) / 2,
    },
    newDim: {
      width: newW,
      height: newH,
    },
  };
}

function resolveResize(
  mode: ModeOf<"resize">,
  pointer: Point,
  scale: number,
  shiftKeyPressed: boolean,
) {
  const dx = (pointer.x - mode.start.x) / scale;
  const dy = (pointer.y - mode.start.y) / scale;
  const locked = mode.lockByDefault !== shiftKeyPressed;
  return computeResize(
    mode.handle,
    mode.startPosition,
    mode.startDimension,
    dx,
    dy,
    locked ? mode.aspectRatio : undefined,
  );
}

export const resizeHandlers: ModeHandlers<"resize"> = {
  onPointerMove(pointer, mode, ctx) {
    const { newPos, newDim } = resolveResize(
      mode,
      pointer,
      ctx.zoom.scale,
      ctx.shiftKeyPressed(),
    );
    applyResizeDom(ctx.root, ctx.doc, mode.itemId, newPos, newDim);
  },
  onPointerUp(pointer, mode, ctx) {
    const { newPos, newDim } = resolveResize(
      mode,
      pointer,
      ctx.zoom.scale,
      ctx.shiftKeyPressed(),
    );
    ctx.doc.resizeItem(mode.itemId, newPos, newDim);
  },
  onCancel(_mode, ctx) {
    ctx.host.classList.remove("resizing");
    ctx.host.style.removeProperty("--ao-resize-cursor");
  },
};
