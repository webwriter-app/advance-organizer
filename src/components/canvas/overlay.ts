import { svg, type TemplateResult } from "lit";
import { SelectionController } from "../../state/selection";
import { Id } from "../../model/types";
import { DocumentController } from "../../state/document";
import { computeEdgePoints, getHandlePositions, HANDLE_SIZE } from "./helper";

export function renderOverlay(
  selection: SelectionController,
  doc: DocumentController,
): TemplateResult {
  return svg`
    <g 
      class="overlay"
      pointer-events="none"
    >
    ${[...selection.entries].map((e) => renderSelectionIndicator(e, doc))}
    ${selection.size === 1 ? renderResizeHandles([...selection.entries][0]!, doc) : svg``}
  </g>`;
}

function renderSelectionIndicator(
  entryId: Id,
  doc: DocumentController,
): TemplateResult {
  const item = doc.get(entryId);
  if (!item) return svg``;

  if (item.kind === "node") {
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
): TemplateResult {
  const item = doc.get(entryId);
  if (!item) return svg``;

  if (item.kind === "node") {
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
      >
        ${handles.map(
          (h) => svg`
          <rect 
            class="resize-handle"
            x=${h.pos.x - HANDLE_SIZE / 2}
            y=${h.pos.y - HANDLE_SIZE / 2}
            width=${HANDLE_SIZE}
            height=${HANDLE_SIZE}
            style="cursor: ${h.cursor}"
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
      >
        <rect
          class="resize-handle"
          x=${start.x - HANDLE_SIZE / 2}
          y=${start.y - HANDLE_SIZE / 2}
          width=${HANDLE_SIZE}
          height=${HANDLE_SIZE}
          style="cursor: grab"
          data-handle="source"
        />
        <rect
          class="resize-handle"
          x=${end.x - HANDLE_SIZE / 2}
          y=${end.y - HANDLE_SIZE / 2}
          width=${HANDLE_SIZE}
          height=${HANDLE_SIZE}
          style="cursor: grab"
          data-handle="target"
        />
      </g>
    `;
  }

  return svg``;
}
