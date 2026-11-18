import type { Edge, Image, Node } from "../../model/types";
import { DEFAULT_BLACK } from "../../model/colors";
import {
  computeBounds,
  computeEdgeLabelLayout,
  computeEdgePoints,
  getArrowPath,
  getStrokeDashArray,
} from "../canvas/helper";
import { getLabelBounds } from "../canvas/node";

const PADDING = 24;
const LINE_HEIGHT = 1.25;

const esc = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function wrap(text: string, width: number, fontSize: number): string[] {
  const perLine = Math.max(1, Math.floor(width / (fontSize * 0.55)));
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + 1 + word.length > perLine) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
      while (line.length > perLine) {
        lines.push(line.slice(0, perLine));
        line = line.slice(perLine);
      }
    }
    lines.push(line);
  }
  return lines;
}

function textSvg(label: Node["label"], cx: number, cy: number, width: number): string {
  if (!label.text) return "";
  const size = label.fontSize ?? 14;
  const lines = wrap(label.text, width, size);
  const top = cy - ((lines.length - 1) * size * LINE_HEIGHT) / 2;
  const attrs = [
    `font-size="${size}"`,
    `fill="${esc(label.color || DEFAULT_BLACK)}"`,
    label.bold ? 'font-weight="bold"' : "",
    label.italic ? 'font-style="italic"' : "",
    label.underline ? 'text-decoration="underline"' : "",
  ].filter(Boolean).join(" ");
  const spans = lines
    .map((line, i) => `<tspan x="${cx}" y="${top + i * size * LINE_HEIGHT}">${esc(line)}</tspan>`)
    .join("");
  return `<text text-anchor="middle" dominant-baseline="central" ${attrs}>${spans}</text>`;
}

function nodeSvg(n: Node): string {
  const { width: w, height: h } = n.dimension;
  const s = n.style;
  const paint = `fill="${esc(s.fill || "lightgray")}" stroke="${esc(s.stroke || DEFAULT_BLACK)}" stroke-width="${s.strokeWidth ?? 1}" stroke-dasharray="${getStrokeDashArray(s.strokeStyle, s.strokeWidth)}"`;
  const shape =
    s.shape === "rectangle"
      ? `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" ${paint}/>`
      : s.shape === "ellipse"
        ? `<ellipse rx="${w / 2}" ry="${h / 2}" ${paint}/>`
        : s.shape === "diamond"
          ? `<polygon points="${-w / 2},0 0,${-h / 2} ${w / 2},0 0,${h / 2}" ${paint}/>`
          : "";
  const area = getLabelBounds(s.shape, n.dimension);
  return `<g transform="translate(${n.position.x} ${n.position.y})">${shape}${textSvg(n.label, 0, 0, area.dimension.width)}</g>`;
}

function edgeSvg(e: Edge, nodes: Map<string, Node>): string {
  const source = nodes.get(e.source);
  const target = nodes.get(e.target);
  if (!source || !target) return "";
  const { start, end } = computeEdgePoints(source, target, e);
  const color = e.style.stroke ?? DEFAULT_BLACK;
  const width = e.style.strokeWidth ?? 1;
  const arrow = (from: typeof start, tip: typeof start) =>
    `<path d="${getArrowPath(from, tip, width)}" fill="${esc(color)}"/>`;
  const label = e.label?.text
    ? (() => {
        const { position, dimension } = computeEdgeLabelLayout(start, end);
        return textSvg(e.label, position.x + dimension.width / 2, position.y + dimension.height / 2, dimension.width);
      })()
    : "";
  return `<g><line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${esc(color)}" stroke-width="${width}" stroke-dasharray="${getStrokeDashArray(e.style.strokeStyle, width)}"/>${e.style.markerStart === "arrow" ? arrow(end, start) : ""}${e.style.markerEnd === "arrow" ? arrow(start, end) : ""}${label}</g>`;
}

function imageSvg(i: Image): string {
  const { width: w, height: h } = i.dimension;
  const strokeWidth = i.style?.strokeWidth ?? 0;
  return `<g transform="translate(${i.position.x} ${i.position.y})"><image href="${esc(i.src)}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" preserveAspectRatio="none"/>${strokeWidth ? `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="none" stroke="${esc(i.style?.stroke || DEFAULT_BLACK)}" stroke-width="${strokeWidth}" stroke-dasharray="${getStrokeDashArray(i.style?.strokeStyle, strokeWidth)}"/>` : ""}</g>`;
}

/** A standalone SVG picture of the organizer; labels are plain text, linked pages are not part of it. */
export function organizerToSvg(nodes: readonly Node[], edges: readonly Edge[], images: readonly Image[]): string | null {
  const bounds = computeBounds([...nodes, ...images]);
  if (!bounds) return null;
  const x = bounds.position.x - bounds.dimension.width / 2 - PADDING;
  const y = bounds.position.y - bounds.dimension.height / 2 - PADDING;
  const w = bounds.dimension.width + 2 * PADDING;
  const h = bounds.dimension.height + 2 * PADDING;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" font-family="sans-serif">${images.map(imageSvg).join("")}${edges.map((e) => edgeSvg(e, byId)).join("")}${nodes.map(nodeSvg).join("")}</svg>`;
}
