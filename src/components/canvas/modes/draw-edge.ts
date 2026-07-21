import { nothing, type TemplateResult } from "lit";
import { EdgePosition, Id, Point } from "../../../model/types";
import type { DocumentController } from "../../../state/document";
import { applyDrawEdgePreviewDom } from "../dom-sync";
import { renderEdgePreview } from "../edge";
import { getAnchorPoints } from "../helper";
import { findSnapTarget } from "../snap";
import { InteractionMode, ModeContext, ModeHandlers, ModeOf } from "./types";

type DrawEdgeSource = NonNullable<ModeOf<"draw-edge">["source"]>;

export function beginDrawEdge(ctx: ModeContext): void {
  ctx.selection.clear();
  ctx.setMode({ kind: "draw-edge", source: null });
}

export function handleDrawEdgeClick(
  e: PointerEvent,
  mode: ModeOf<"draw-edge">,
  ctx: ModeContext,
): void {
  const target = e.target as Element;
  const anchorEl = target.closest<SVGElement>("[data-anchor-position]");
  const anchorGroupEl = anchorEl?.closest<SVGElement>("[data-anchor-node-id]");

  if (!anchorEl || !anchorGroupEl) {
    ctx.resetMode();
    return;
  }

  const nodeId = anchorGroupEl.dataset["anchorNodeId"]!;
  const anchor = anchorEl.dataset["anchorPosition"] as EdgePosition;

  if (mode.source === null) {
    const node = ctx.doc.get(nodeId);
    if (!node || node.kind !== "node") return;
    const anchorRect = anchorEl.getBoundingClientRect();
    ctx.setMode({
      kind: "draw-edge",
      source: {
        nodeId,
        anchor,
        start: {
          x: anchorRect.x + anchorRect.width / 2,
          y: anchorRect.y + anchorRect.height / 2,
        },
        startEndpointPos: getAnchorPoints(node)[anchor],
      },
    });
    return;
  }

  if (nodeId === mode.source.nodeId) return;

  commitDrawEdge(mode.source, { nodeId, anchor }, ctx);
}

function commitDrawEdge(
  source: { nodeId: Id; anchor: EdgePosition },
  target: { nodeId: Id; anchor: EdgePosition },
  ctx: ModeContext,
): void {
  ctx.resetMode();
  ctx.doc.addEdge({
    source: source.nodeId,
    sourcePosition: source.anchor,
    target: target.nodeId,
    targetPosition: target.anchor,
    style: {
      markerEnd: "arrow",
    },
  });
}

export function renderDrawEdgePreview(
  mode: InteractionMode,
  doc: DocumentController,
): TemplateResult | typeof nothing {
  if (mode.kind !== "draw-edge" || !mode.source) return nothing;
  const node = doc.get(mode.source.nodeId);
  if (!node || node.kind !== "node") return nothing;
  const start = mode.source.startEndpointPos;
  return renderEdgePreview(start);
}

function resolveDrawEdge(
  source: DrawEdgeSource,
  pointer: Point,
  scale: number,
): Point {
  const dx = (pointer.x - source.start.x) / scale;
  const dy = (pointer.y - source.start.y) / scale;

  return {
    x: source.startEndpointPos.x + dx,
    y: source.startEndpointPos.y + dy,
  };
}

export const drawEdgeHandlers: ModeHandlers<"draw-edge"> = {
  persistOnPointerUp: true,
  onPointerMove(pointer, mode, ctx) {
    if (!mode.source) return;
    const pos = resolveDrawEdge(mode.source, pointer, ctx.zoom.scale);
    const snapTarget = findSnapTarget(ctx.doc.nodes, pos, mode.source.nodeId);
    ctx.snap.update(ctx.root, snapTarget);
    applyDrawEdgePreviewDom(ctx.root, snapTarget ? snapTarget.point : pos);
  },
  onPointerUp(pointer, mode, ctx) {
    if (!mode.source) return;
    const pos = resolveDrawEdge(mode.source, pointer, ctx.zoom.scale);
    const snapTarget = findSnapTarget(ctx.doc.nodes, pos, mode.source.nodeId);
    if (snapTarget) {
      commitDrawEdge(
        mode.source,
        { nodeId: snapTarget.nodeId, anchor: snapTarget.position },
        ctx,
      );
    }
  },
  onCancel(_mode, ctx) {
    ctx.snap.clear(ctx.root);
  },
};
