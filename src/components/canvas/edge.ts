import { svg, type TemplateResult } from "lit";
import { type Edge } from "../../model/types";
import { DocumentController } from "../../state/document";
import {
  getStrokeDashArray,
  computeEdgePoints,
  MIN_TARGET_SIZE,
} from "./helper";

export function renderEdge(e: Edge, doc: DocumentController): TemplateResult {
  const source = doc.get(e.source);
  const target = doc.get(e.target);
  if (!source || !target || source.kind !== "node" || target.kind !== "node") {
    return svg``;
  }

  const { start, end } = computeEdgePoints(source, target, e);
  const color = e.style.stroke ?? "black";

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
      <line
        x1="${start.x}"
        y1="${start.y}"
        x2="${end.x}"
        y2="${end.y}"
        stroke="${color}"
        stroke-width="${e.style.strokeWidth ?? 1}"
        stroke-dasharray="${getStrokeDashArray(e.style.strokeStyle, e.style.strokeWidth)}"
        marker-start="${e.style.markerStart === "arrow" ? "url(#arrow)" : "none"}"
        marker-end="${e.style.markerEnd === "arrow" ? "url(#arrow)" : "none"}"
      />
    </g>`;
}
