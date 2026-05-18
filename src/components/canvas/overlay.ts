import { svg, type TemplateResult } from "lit";
import { SelectionController } from "../../state/selection";
import { Id } from "../../model/types";
import { DocumentController } from "../../state/document";
import { getHandlePositions, HANDLE_SIZE } from "./helper";

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
  } else {
    console.log("TODO: render edge selection indicator");
    return svg``;
  }
}

function renderResizeHandles(
  entryId: Id,
  doc: DocumentController,
): TemplateResult {
  const item = doc.get(entryId);
  if (!item || item.kind !== "node") return svg``;

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
}
