import { svg, type TemplateResult } from "lit";
import { SelectionController } from "../../state/selection";
import { AnchorRendering, Id } from "../../model/types";
import { DocumentController } from "../../state/document";
import {
  computeEdgePoints,
  getAnchorPoints,
  getHandlePositions,
  HANDLE_SIZE,
} from "./helper";

export function renderOverlay(
  selection: SelectionController,
  doc: DocumentController,
  zoom: number,
  anchorRendering: AnchorRendering,
): TemplateResult {
  return svg`
    <g 
      class="overlay"
      pointer-events="none"
    >
    ${[...selection.entries].map((e) => renderSelectionIndicator(e, doc))}
    ${selection.size === 1 ? renderResizeHandles([...selection.entries][0]!, doc, zoom) : svg``}
    ${anchorRendering.active ? renderAnchorPoints(doc, anchorRendering, zoom) : svg``}
  </g>`;
}

function renderSelectionIndicator(
  entryId: Id,
  doc: DocumentController,
): TemplateResult {
  const item = doc.get(entryId);
  if (!item) return svg``;

  if (item.kind === "node" || item.kind === "image") {
    return svg`
      <g
        data-selection-id=${entryId}
        transform="translate(${item.position.x}, ${item.position.y})"
        pointer-events="none"
      >
        <rect
          x=${-item.dimension.width / 2}
          y=${-item.dimension.height / 2}
          width=${item.dimension.width}
          height=${item.dimension.height}
          fill="none"
          stroke="var(--ao-selection-color, #3b82f6)"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </g>`;
  } else if (item.kind === "edge") {
    const source = doc.get(item.source);
    const target = doc.get(item.target);

    if (
      !source ||
      !target ||
      source.kind !== "node" ||
      target.kind !== "node"
    ) {
      return svg``;
    }

    const { start, end } = computeEdgePoints(source, target, item);

    return svg`
      <line
        data-selection-id=${entryId}
        x1="${start.x}"
        y1="${start.y}"
        x2="${end.x}"
        y2="${end.y}"
        stroke="var(--ao-selection-color, #3b82f6)"
        stroke-width="2"
        stroke-dasharray="4 2"
        vector-effect="non-scaling-stroke"
      />
    `;
  } else {
    return svg``;
  }
}

function renderResizeHandles(
  entryId: Id,
  doc: DocumentController,
  zoom: number,
): TemplateResult {
  const item = doc.get(entryId);
  if (!item) return svg``;

  const hs = HANDLE_SIZE / zoom;

  if (item.kind === "node" || item.kind === "image") {
    const {
      position: { x, y },
      dimension,
    } = item;
    const handles = getHandlePositions(dimension);

    return svg`
      <g
        class="resize-handles"
        data-resize-id=${entryId}
        transform="translate(${x}, ${y})"
        pointer-events="all"
        fill="white"
        stroke="var(--ao-selection-color, #3b82f6)"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
      >
        ${handles.map(
          (h) => svg`
          <rect
            class="resize-handle"
            x=${h.pos.x - hs / 2}
            y=${h.pos.y - hs / 2}
            width=${hs}
            height=${hs}
            style="cursor: ${h.cursor}"
            vector-effect="non-scaling-stroke"
            data-handle=${h.handle}
          />
        `,
        )}
      </g>
    `;
  } else if (item.kind === "edge") {
    const source = doc.get(item.source);
    const target = doc.get(item.target);

    if (
      !source ||
      !target ||
      source.kind !== "node" ||
      target.kind !== "node"
    ) {
      return svg``;
    }
    const { start, end } = computeEdgePoints(source, target, item);

    return svg`
      <g
        class="resize-handles"
        data-resize-id=${entryId}
        pointer-events="all"
        fill="white"
        stroke="var(--ao-selection-color, #3b82f6)"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
      >
        <rect
          class="resize-handle"
          x=${start.x - hs / 2}
          y=${start.y - hs / 2}
          width=${hs}
          height=${hs}
          style="cursor: grab"
          vector-effect="non-scaling-stroke"
          data-handle="source"
        />
        <rect
          class="resize-handle"
          x=${end.x - hs / 2}
          y=${end.y - hs / 2}
          width=${hs}
          height=${hs}
          style="cursor: grab"
          vector-effect="non-scaling-stroke"
          data-handle="target"
        />
      </g>
    `;
  }

  return svg``;
}

function renderAnchorPoints(
  doc: DocumentController,
  anchorRendering: AnchorRendering,
  zoom: number,
): TemplateResult {
  const r = HANDLE_SIZE / zoom;

  return svg`
    ${doc.nodes.map((node) => {
      if (node.id === anchorRendering.skipNodeId) {
        return svg``;
      }
      const anchors = getAnchorPoints(node);
      return svg`
        <g
          class="anchor-points"
          data-anchor-node-id=${node.id}
          pointer-events="all"
          fill="white"
          stroke="var(--ao-anchor-color, #7d828a)"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        >
          ${Object.entries(anchors).map(([pos, point]) => {
            return svg`
              <circle
                class="anchor-point"
                cx=${point.x}
                cy=${point.y}
                r=${r}
                style="cursor: crosshair"
                vector-effect="non-scaling-stroke"
                data-anchor-position=${pos}
              />
            `;
          })}
        </g>
      `;
    })}
  `;
}
