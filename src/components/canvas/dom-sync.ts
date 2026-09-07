import {
  Bounds,
  Dimension,
  EdgePosition,
  Id,
  Node,
  Point,
} from "../../model/types";
import { DocumentController } from "../../state/document";
import {
  applyResize,
  computeEdgeLabelLayout,
  computeEdgePoints,
  getArrowPath,
  getHandlePositions,
} from "./helper";
import { getBadgePosition, getLabelBounds } from "./node";

export function applyDragDom(
  root: ParentNode,
  doc: DocumentController,
  id: Id,
  newPos: Point,
  allNewPositions?: Map<Id, Point>,
): void {
  const translate = `translate(${newPos.x}, ${newPos.y})`;

  const nodeG = root.querySelector(
    `g.node[data-item-id="${id}"], g.image[data-item-id="${id}"]`,
  ) as SVGGElement | null;
  const selG = root.querySelector(
    `[data-selection-id="${id}"]`,
  ) as SVGGElement | null;
  const handlesG = root.querySelector(
    `.resize-handles[data-resize-id="${id}"]`,
  ) as SVGGElement | null;

  nodeG?.setAttribute("transform", translate);
  selG?.setAttribute("transform", translate);
  handlesG?.setAttribute("transform", translate);

  updateConnectedEdgesDom(root, doc, id, newPos, undefined, allNewPositions);
}

export function applyResizeDom(
  root: ParentNode,
  doc: DocumentController,
  id: Id,
  newPos: Point,
  newDim: Dimension,
): void {
  applyDragDom(root, doc, id, newPos);

  const shapeEls = root.querySelectorAll<SVGElement>(
    `g.node[data-item-id="${id}"] g.shape > *,
     g.image[data-item-id="${id}"] image,
     g.image[data-item-id="${id}"] rect.image-border`,
  );
  for (const shapeEl of shapeEls) {
    applyResize(shapeEl, newDim);
  }

  const selRect = root.querySelector(
    `g[data-selection-id="${id}"] rect`,
  ) as SVGRectElement | null;
  if (selRect) {
    applyResize(selRect, newDim);
  }

  const handlesG = root.querySelector(
    `.resize-handles[data-resize-id="${id}"]`,
  ) as SVGGElement | null;
  if (handlesG) {
    const handlePositions = getHandlePositions(newDim);
    for (const { handle, pos } of handlePositions) {
      const handleG = handlesG.querySelector(`[data-handle="${handle}"]`);
      handleG?.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
    }
  }

  const node = doc.get(id);
  const shape = node?.kind === "node" ? node.style.shape : undefined;

  const labelFo = root.querySelector(
    `g.node[data-item-id="${id}"] foreignObject.label-fo`,
  ) as SVGForeignObjectElement | null;
  if (labelFo) {
    applyResize(labelFo, getLabelBounds(shape, newDim).dimension);
  }

  const badgeG = root.querySelector(
    `g.node[data-item-id="${id}"] g.badge`,
  ) as SVGGElement | null;
  if (badgeG) {
    const badgePos = getBadgePosition(shape, newDim);
    badgeG.setAttribute("transform", `translate(${badgePos.x}, ${badgePos.y})`);
  }

  updateConnectedEdgesDom(root, doc, id, newPos, newDim);
}

function updateConnectedEdgesDom(
  root: ParentNode,
  doc: DocumentController,
  id: Id,
  newPos: Point,
  newDim?: Dimension,
  allNewPositions?: Map<Id, Point>,
): void {
  const node = doc.get(id);
  if (!node || node.kind !== "node") return;

  const movedNode: Node = {
    ...node,
    position: newPos,
    ...(newDim && { dimension: newDim }),
  };

  const _applyEdge = (gEl: SVGGElement, isSource: boolean): void => {
    const edgeId = gEl.dataset["itemId"];
    if (!edgeId) return;
    const edge = doc.get(edgeId);
    if (!edge || edge.kind !== "edge") return;

    const otherId = isSource ? edge.target : edge.source;
    const otherNode = doc.get(otherId);
    if (!otherNode || otherNode.kind !== "node") return;

    const otherNewPos = allNewPositions?.get(otherId);
    const effectiveOther: Node = otherNewPos
      ? { ...otherNode, position: otherNewPos }
      : otherNode;

    const source = isSource ? movedNode : effectiveOther;
    const target = isSource ? effectiveOther : movedNode;
    const { start, end } = computeEdgePoints(source, target, edge);

    const selLine = root.querySelector(
      `line[data-selection-id="${edgeId}"]`,
    ) as SVGLineElement | null;
    if (selLine) {
      selLine.setAttribute("x1", String(start.x));
      selLine.setAttribute("y1", String(start.y));
      selLine.setAttribute("x2", String(end.x));
      selLine.setAttribute("y2", String(end.y));
    }

    for (const lineEl of gEl.querySelectorAll("line")) {
      lineEl.setAttribute("x1", String(start.x));
      lineEl.setAttribute("y1", String(start.y));
      lineEl.setAttribute("x2", String(end.x));
      lineEl.setAttribute("y2", String(end.y));
    }

    updateEdgeArrowsDom(gEl, start, end, edge.style.strokeWidth);
    updateEdgeLabelDom(gEl, start, end);
  };

  for (const gEl of root.querySelectorAll<SVGGElement>(
    `g.edge[data-source-id="${id}"]`,
  )) {
    _applyEdge(gEl, true);
  }
  for (const gEl of root.querySelectorAll<SVGGElement>(
    `g.edge[data-target-id="${id}"]`,
  )) {
    _applyEdge(gEl, false);
  }
}

export function applyReanchorDom(
  root: ParentNode,
  doc: DocumentController,
  edgeId: Id,
  endpoint: "source" | "target",
  newPos: Point,
  otherPos: Point,
): void {
  const edgeG = root.querySelector(
    `g.edge[data-item-id="${edgeId}"]`,
  ) as SVGGElement | null;
  if (!edgeG) return;

  const attr1 = endpoint === "source" ? "x1" : "x2";
  const attr2 = endpoint === "source" ? "y1" : "y2";

  edgeG.querySelectorAll("line").forEach((lineEl) => {
    lineEl.setAttribute(attr1, String(newPos.x));
    lineEl.setAttribute(attr2, String(newPos.y));
  });

  const selLine = root.querySelector(
    `line[data-selection-id="${edgeId}"]`,
  ) as SVGLineElement | null;
  if (selLine) {
    selLine.setAttribute(attr1, String(newPos.x));
    selLine.setAttribute(attr2, String(newPos.y));
  }

  const start = endpoint === "source" ? newPos : otherPos;
  const end = endpoint === "source" ? otherPos : newPos;
  const edge = doc.get(edgeId);
  updateEdgeArrowsDom(
    edgeG,
    start,
    end,
    edge?.kind === "edge" ? edge.style.strokeWidth : undefined,
  );
  updateEdgeLabelDom(edgeG, start, end);
}

export function applyDrawEdgePreviewDom(root: ParentNode, end: Point): void {
  const previewG = root.querySelector<SVGGElement>("g.edge-preview");
  const line = previewG?.querySelector("line");
  if (!previewG || !line) return;
  line.setAttribute("x2", String(end.x));
  line.setAttribute("y2", String(end.y));

  const start = {
    x: Number(line.getAttribute("x1")),
    y: Number(line.getAttribute("y1")),
  };
  updateEdgeArrowsDom(previewG, start, end, undefined);
}

function updateEdgeArrowsDom(
  edgeG: SVGGElement,
  start: Point,
  end: Point,
  strokeWidth?: number,
): void {
  edgeG
    .querySelector('path.edge-arrow[data-arrow-endpoint="start"]')
    ?.setAttribute("d", getArrowPath(end, start, strokeWidth));
  edgeG
    .querySelector('path.edge-arrow[data-arrow-endpoint="end"]')
    ?.setAttribute("d", getArrowPath(start, end, strokeWidth));
}

export function applyAnchorHighlightDom(
  root: ParentNode,
  target: { nodeId: Id; position: EdgePosition },
  active: boolean,
): void {
  const circle = root.querySelector<SVGCircleElement>(
    `[data-anchor-node-id="${target.nodeId}"] [data-anchor-position="${target.position}"]`,
  );
  circle?.setAttribute(
    "fill",
    active ? "var(--ao-anchor-color, #7d828a)" : "white",
  );
}

function updateEdgeLabelDom(
  edgeG: SVGGElement,
  start: Point,
  end: Point,
): void {
  const labelFo = edgeG.querySelector(
    `foreignObject.label-fo`,
  ) as SVGForeignObjectElement | null;
  if (!labelFo) return;

  const { position, dimension } = computeEdgeLabelLayout(start, end);
  labelFo.setAttribute("x", String(position.x));
  labelFo.setAttribute("y", String(position.y));
  labelFo.setAttribute("width", String(dimension.width));
  labelFo.setAttribute("height", String(dimension.height));
}

export function applyRectangleSelectDom(
  root: ParentNode,
  bounds: Bounds,
): void {
  root.querySelector<SVGGElement>("g.touch-indicator")?.classList.add("hidden");

  const groupEl = root.querySelector<SVGGElement>(
    "g.rectangle-selection-group",
  );
  const rectEl = groupEl?.querySelector<SVGRectElement>(
    "rect.rectangle-selection",
  );
  if (!groupEl || !rectEl) return;

  groupEl.setAttribute(
    "transform",
    `translate(${bounds.position.x}, ${bounds.position.y})`,
  );
  applyResize(rectEl, bounds.dimension);
}

export function applySelectionPreviewDom(root: ParentNode, ids: Set<Id>): void {
  for (const el of root.querySelectorAll<SVGElement>("[data-preview-id]")) {
    const id = el.dataset["previewId"];
    el.setAttribute("visibility", id && ids.has(id) ? "visible" : "hidden");
  }
}

export function restoreItemsDom(
  root: ParentNode,
  doc: DocumentController,
  ids: Iterable<Id>,
): void {
  for (const id of ids) {
    const item = doc.get(id);
    if (!item || (item.kind !== "node" && item.kind !== "image")) continue;
    applyResizeDom(root, doc, id, item.position, item.dimension);
  }
}

export function restoreEdgeEndpointDom(
  root: ParentNode,
  doc: DocumentController,
  edgeId: Id,
  endpoint: "source" | "target",
): void {
  const edge = doc.get(edgeId);
  if (!edge || edge.kind !== "edge") return;
  const source = doc.get(edge.source);
  const target = doc.get(edge.target);
  if (source?.kind !== "node" || target?.kind !== "node") return;

  const { start, end } = computeEdgePoints(source, target, edge);
  applyReanchorDom(
    root,
    doc,
    edgeId,
    endpoint,
    endpoint === "source" ? start : end,
    endpoint === "source" ? end : start,
  );
}
