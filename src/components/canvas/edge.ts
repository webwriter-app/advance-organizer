import { svg, type TemplateResult } from "lit";
import { type Edge, type EdgeStyle, type Point } from "../../model/types";
import { DocumentController } from "../../state/document";
import {
  getStrokeDashArray,
  computeEdgePoints,
  computeEdgeLabelLayout,
  MIN_TARGET_SIZE,
} from "./helper";
import { renderLabel } from "./label";

export function renderEdge(
  e: Edge,
  doc: DocumentController,
  editingLabel = false,
): TemplateResult {
  const source = doc.get(e.source);
  const target = doc.get(e.target);
  if (!source || !target || source.kind !== "node" || target.kind !== "node") {
    return svg``;
  }

  const { start, end } = computeEdgePoints(source, target, e);

  const { position: labelPosition, dimension: labelDimension } =
    computeEdgeLabelLayout(start, end);

  return svg`
    <g
      class="edge"
      data-item-id="${e.id}"
      data-source-id="${e.source}"
      data-target-id="${e.target}"
    >
      <line
        x1="${start.x}"
        y1="${start.y}"
        x2="${end.x}"
        y2="${end.y}"
        stroke="transparent"
        stroke-width="${MIN_TARGET_SIZE}"
      />
      ${renderEdgeLine(start, end, e.style)}
      ${e.label || editingLabel ? renderLabel(e.id, e.label ?? { text: "" }, labelPosition, labelDimension, editingLabel) : svg``}
    </g>`;
}

export function renderEdgePreview(start: Point): TemplateResult {
  return svg`
    <g
      class="edge-preview"
      pointer-events="none"
    >
      ${renderEdgeLine(start, start, { markerEnd: "arrow" })}
    </g>`;
}

function renderEdgeLine(
  start: Point,
  end: Point,
  style: EdgeStyle,
): TemplateResult {
  const color = style.stroke ?? "black";
  return svg`
    <line
      x1="${start.x}"
      y1="${start.y}"
      x2="${end.x}"
      y2="${end.y}"
      stroke="${color}"
      stroke-width="${style.strokeWidth ?? 1}"
      stroke-dasharray="${getStrokeDashArray(style.strokeStyle, style.strokeWidth)}"
      marker-start="${style.markerStart === "arrow" ? "url(#arrow)" : "none"}"
      marker-end="${style.markerEnd === "arrow" ? "url(#arrow)" : "none"}"
    />`;
}
