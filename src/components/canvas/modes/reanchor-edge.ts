import { Id, Point } from "../../../model/types";
import { applyReanchorDom, restoreEdgeEndpointDom } from "../dom-sync";
import { computeEdgePoints } from "../helper";
import { findSnapTarget } from "../snap";
import { ModeContext, ModeHandlers, ModeOf } from "./types";

export function beginReanchor(
  e: PointerEvent,
  edgeId: Id,
  endpoint: "source" | "target",
  ctx: ModeContext,
): void {
  const edge = ctx.doc.get(edgeId);
  if (!edge || edge.kind !== "edge") return;
  const source = ctx.doc.get(edge.source);
  const target = ctx.doc.get(edge.target);
  if (!source || source.kind !== "node" || !target || target.kind !== "node")
    return;

  const { start, end } = computeEdgePoints(source, target, edge);
  ctx.setMode({
    kind: "reanchor-edge",
    edgeId,
    endpoint,
    otherNodeId: endpoint === "source" ? edge.target : edge.source,
    start: { x: e.clientX, y: e.clientY },
    startEndpointPos: endpoint === "source" ? start : end,
    otherEndpointPos: endpoint === "source" ? end : start,
  });
}

function resolveReanchor(
  mode: ModeOf<"reanchor-edge">,
  pointer: Point,
  scale: number,
): Point {
  const dx = (pointer.x - mode.start.x) / scale;
  const dy = (pointer.y - mode.start.y) / scale;

  return {
    x: mode.startEndpointPos.x + dx,
    y: mode.startEndpointPos.y + dy,
  };
}

export const reanchorEdgeHandlers: ModeHandlers<"reanchor-edge"> = {
  onPointerMove(pointer, mode, ctx) {
    const pos = resolveReanchor(mode, pointer, ctx.zoom.scale);
    const snapTarget = findSnapTarget(ctx.doc.nodes, pos, mode.otherNodeId);
    ctx.snap.update(ctx.root, snapTarget);
    applyReanchorDom(
      ctx.root,
      ctx.doc,
      mode.edgeId,
      mode.endpoint,
      snapTarget ? snapTarget.point : pos,
      mode.otherEndpointPos,
    );
  },
  onPointerUp(pointer, mode, ctx) {
    const pos = resolveReanchor(mode, pointer, ctx.zoom.scale);
    const snapTarget = findSnapTarget(ctx.doc.nodes, pos, mode.otherNodeId);

    if (snapTarget) {
      ctx.doc.reanchorEdge(
        mode.edgeId,
        mode.endpoint,
        snapTarget.nodeId,
        snapTarget.position,
      );
    } else {
      applyReanchorDom(
        ctx.root,
        ctx.doc,
        mode.edgeId,
        mode.endpoint,
        mode.startEndpointPos,
        mode.otherEndpointPos,
      );
    }
  },
  onCancel(mode, ctx) {
    ctx.snap.clear(ctx.root);
    restoreEdgeEndpointDom(ctx.root, ctx.doc, mode.edgeId, mode.endpoint);
  },
};
