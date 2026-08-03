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
  const anchor = findAnchorTarget(e.target as Element);

  if (anchor) {
    if (mode.source === null) {
      beginDrawEdgeFromAnchor(anchor, ctx);
      return;
    }

    if (anchor.nodeId === mode.source.nodeId) return;

    commitDrawEdge(
      mode.source,
      { nodeId: anchor.nodeId, anchor: anchor.anchor },
      ctx,
    );
    return;
  }

  if (
    mode.source !== null &&
    tryCommitSnappedEdge(mode.source, { x: e.clientX, y: e.clientY }, ctx)
  ) {
    return;
  }

  ctx.resetMode();
}

export interface AnchorTarget {
  el: SVGElement;
  nodeId: Id;
  anchor: EdgePosition;
}

export function findAnchorTarget(target: Element | null): AnchorTarget | null {
  const anchorEl = target?.closest<SVGElement>("[data-anchor-position]");
  const anchorGroupEl = anchorEl?.closest<SVGElement>("[data-anchor-node-id]");
  if (!anchorEl || !anchorGroupEl) return null;

  return {
    el: anchorEl,
    nodeId: anchorGroupEl.dataset["anchorNodeId"]!,
    anchor: anchorEl.dataset["anchorPosition"] as EdgePosition,
  };
}

export function beginDrawEdgeFromAnchor(
  { el, nodeId, anchor }: AnchorTarget,
  ctx: ModeContext,
): void {
  const node = ctx.doc.get(nodeId);
  if (!node || node.kind !== "node") return;

  const anchorRect = el.getBoundingClientRect();
  ctx.selection.clear();
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

function tryCommitSnappedEdge(
  source: DrawEdgeSource,
  pointer: Point,
  ctx: ModeContext,
): boolean {
  const pos = resolveDrawEdge(source, pointer, ctx.zoom.scale);
  const snapTarget = findSnapTarget(ctx.doc.nodes, pos, source.nodeId);
  if (!snapTarget) return false;

  commitDrawEdge(
    source,
    { nodeId: snapTarget.nodeId, anchor: snapTarget.position },
    ctx,
  );
  return true;
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
    tryCommitSnappedEdge(mode.source, pointer, ctx);
  },
  onCancel(_mode, ctx) {
    ctx.snap.clear(ctx.root);
  },
};
