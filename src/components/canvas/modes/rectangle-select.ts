import { BoxItem, Edge, Id, Bounds, Point } from "../../../model/types";
import { applyRectangleSelectDom, applySelectionPreviewDom } from "../dom-sync";
import { boundsFromCorners, boundsWithin } from "../helper";
import { ModeContext, ModeHandlers } from "./types";

export function beginRectangleSelect(
  origin: Point,
  ctx: ModeContext,
  touch = false,
) {
  if (touch) ctx.zoom.setPanningEnabled(false);
  ctx.setMode({
    kind: "rectangle-select",
    start: ctx.zoom.clientToScene(origin.x, origin.y),
    touch,
  });
}

function itemsInBounds(
  bounds: Bounds,
  boxItems: BoxItem[],
  edges: Edge[],
): Set<Id> {
  const ids = new Set<Id>();
  for (const item of boxItems) {
    if (boundsWithin(bounds, item)) ids.add(item.id);
  }
  for (const edge of edges) {
    if (ids.has(edge.source) && ids.has(edge.target)) ids.add(edge.id);
  }
  return ids;
}

export const rectangleSelectHandlers: ModeHandlers<"rectangle-select"> = {
  onPointerMove(pointer, mode, ctx) {
    const bounds = boundsFromCorners(
      mode.start,
      ctx.zoom.clientToScene(pointer.x, pointer.y),
    );
    applyRectangleSelectDom(ctx.root, bounds);
    applySelectionPreviewDom(
      ctx.root,
      itemsInBounds(
        bounds,
        [...ctx.doc.nodes, ...ctx.doc.images],
        ctx.doc.edges,
      ),
    );
  },
  onPointerUp(pointer, mode, ctx) {
    const bounds = boundsFromCorners(
      mode.start,
      ctx.zoom.clientToScene(pointer.x, pointer.y),
    );
    ctx.selection.select(
      new Set([
        ...ctx.selection.entries,
        ...itemsInBounds(
          bounds,
          [...ctx.doc.nodes, ...ctx.doc.images],
          ctx.doc.edges,
        ),
      ]),
    );
  },
  onCancel(mode, ctx) {
    if (mode.touch) ctx.zoom.setPanningEnabled(true);
  },
};
