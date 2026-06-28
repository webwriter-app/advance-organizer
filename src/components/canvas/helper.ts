import {
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
export const MIN_EDGE_LABEL_WIDTH = 80;

export function computeResize(
  handle: ResizeHandle,
  startPos: Point,
  startDim: Dimension,
  dx: number,
  dy: number,
): { newPos: Point; newDim: Dimension } {
  const xSign = handle.includes("r") ? 1 : handle.includes("l") ? -1 : 0;
  const ySign = handle.includes("b") ? 1 : handle.includes("t") ? -1 : 0;

  const newW = Math.max(MIN_NODE_SIZE, startDim.width + xSign * dx);
  const newH = Math.max(MIN_NODE_SIZE, startDim.height + ySign * dy);
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

export function applyResize(el: SVGElement, newDim: Dimension): void {
  const { width: w, height: h } = newDim;
  const tag = el.tagName.toLowerCase();
  if (tag === "rect" || tag === "foreignobject") {
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

export function getHandlePositions(
  dim: Dimension,
): ReadonlyArray<{ handle: ResizeHandle; pos: Point; cursor: string }> {
  const { width: w, height: h } = dim;

  return [
    { handle: "tl", pos: { x: -w / 2, y: -h / 2 }, cursor: "nwse-resize" },
    { handle: "t", pos: { x: 0, y: -h / 2 }, cursor: "ns-resize" },
    { handle: "tr", pos: { x: w / 2, y: -h / 2 }, cursor: "nesw-resize" },
    { handle: "r", pos: { x: w / 2, y: 0 }, cursor: "ew-resize" },
    { handle: "br", pos: { x: w / 2, y: h / 2 }, cursor: "nwse-resize" },
    { handle: "b", pos: { x: 0, y: h / 2 }, cursor: "ns-resize" },
    { handle: "bl", pos: { x: -w / 2, y: h / 2 }, cursor: "nesw-resize" },
    { handle: "l", pos: { x: -w / 2, y: 0 }, cursor: "ew-resize" },
  ];
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
  const startPoint = getAnchorPoints(source)[edge.sourcePosition ?? "right"];
  const endPoint = getAnchorPoints(target)[edge.targetPosition ?? "left"];
  return { start: startPoint, end: endPoint };
}

export function computeEdgeLabelLayout(
  start: Point,
  end: Point,
): { position: Point; dimension: Dimension } {
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
