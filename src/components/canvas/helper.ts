import {
  Bounds,
  BoxItem,
  Dimension,
  Edge,
  EdgePosition,
  Node,
  Point,
  ResizeHandle,
} from "../../model/types";

export const MIN_NODE_SIZE = 20;
export const HANDLE_SIZE = 8;
export const MIN_TARGET_SIZE = 24;
export const SNAP_RADIUS = 16;
export const ANCHOR_HOVER_RADIUS = 24;
export const MIN_EDGE_LABEL_WIDTH = 80;
export const INSERT_GAP = 24;

export const INTERACTIVE_SELECTOR =
  "[data-item-id], [data-handle], [data-anchor-position], .label-editor";

export function applyResize(el: SVGElement, newDim: Dimension): void {
  const { width: w, height: h } = newDim;
  const tag = el.tagName.toLowerCase();
  if (tag === "rect" || tag === "foreignobject" || tag === "image") {
    el.setAttribute("x", String(-w / 2));
    el.setAttribute("y", String(-h / 2));
    el.setAttribute("width", String(w));
    el.setAttribute("height", String(h));
  } else if (tag === "ellipse") {
    el.setAttribute("rx", String(w / 2));
    el.setAttribute("ry", String(h / 2));
  } else if (tag === "polygon") {
    el.setAttribute("points", `${-w / 2},0 0,${-h / 2} ${w / 2},0 0,${h / 2}`);
  }
}

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  tl: "nwse-resize",
  t: "ns-resize",
  tr: "nesw-resize",
  r: "ew-resize",
  br: "nwse-resize",
  b: "ns-resize",
  bl: "nesw-resize",
  l: "ew-resize",
};

export function getHandlePositions(
  dim: Dimension,
): ReadonlyArray<{ handle: ResizeHandle; pos: Point; cursor: string }> {
  const { width: w, height: h } = dim;

  return (
    [
      { handle: "tl", pos: { x: -w / 2, y: -h / 2 } },
      { handle: "t", pos: { x: 0, y: -h / 2 } },
      { handle: "tr", pos: { x: w / 2, y: -h / 2 } },
      { handle: "r", pos: { x: w / 2, y: 0 } },
      { handle: "br", pos: { x: w / 2, y: h / 2 } },
      { handle: "b", pos: { x: 0, y: h / 2 } },
      { handle: "bl", pos: { x: -w / 2, y: h / 2 } },
      { handle: "l", pos: { x: -w / 2, y: 0 } },
    ] as const
  ).map((h) => ({ ...h, cursor: HANDLE_CURSORS[h.handle] }));
}

export function boundsFromCorners(a: Point, b: Point): Bounds {
  return {
    position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    dimension: { width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) },
  };
}

export function boundsWithin(outer: Bounds, inner: Bounds): boolean {
  return (
    Math.abs(outer.position.x - inner.position.x) * 2 + inner.dimension.width <=
      outer.dimension.width &&
    Math.abs(outer.position.y - inner.position.y) * 2 +
      inner.dimension.height <=
      outer.dimension.height
  );
}

export function computeBounds(items: readonly BoxItem[]): Bounds | null {
  if (items.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    minX = Math.min(minX, item.position.x - item.dimension.width / 2);
    minY = Math.min(minY, item.position.y - item.dimension.height / 2);
    maxX = Math.max(maxX, item.position.x + item.dimension.width / 2);
    maxY = Math.max(maxY, item.position.y + item.dimension.height / 2);
  }

  return {
    position: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    dimension: { width: maxX - minX, height: maxY - minY },
  };
}

export function getStrokeDashArray(
  strokeStyle?: string,
  strokeWidth?: number,
): string {
  const width = strokeWidth ?? 1;
  if (strokeStyle === "dashed") {
    return `${8 * width},${5 * width}`;
  } else if (strokeStyle === "dotted") {
    return `${width},${2 * width}`;
  } else {
    return "0";
  }
}

export function getAnchorPoints(node: Node): Record<EdgePosition, Point> {
  const { x, y } = node.position;
  const { width: w, height: h } = node.dimension;
  return {
    top: { x, y: y - h / 2 },
    bottom: { x, y: y + h / 2 },
    left: { x: x - w / 2, y },
    right: { x: x + w / 2, y },
  };
}

export function computeEdgePoints(
  source: Node,
  target: Node,
  edge: Edge,
): {
  start: Point;
  end: Point;
} {
  const positions = {
    source: edge.sourcePosition ?? "right",
    target: edge.targetPosition ?? "left",
  };
  return {
    start: getAnchorPoints(source)[positions.source],
    end: getAnchorPoints(target)[positions.target],
  };
}

export function computeEdgeLabelLayout(start: Point, end: Point): Bounds {
  const dimension = {
    width: Math.max(Math.abs(start.x - end.x), MIN_EDGE_LABEL_WIDTH),
    height: Math.abs(start.y - end.y),
  };
  const position = {
    x: (start.x + end.x) / 2 - dimension.width / 2,
    y: (start.y + end.y) / 2 - dimension.height / 2,
  };
  return { position, dimension };
}
