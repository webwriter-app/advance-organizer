import { svg, type TemplateResult } from "lit";
import { SelectionController } from "../../state/selection";
import { Id } from "../../model/types";
import { DocumentController } from "../../state/document";

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
    const DISTANCE = 0;

    return svg`
      <rect
        x=${item.position.x - item.dimension.width / 2 - DISTANCE}
        y=${item.position.y - item.dimension.height / 2 - DISTANCE}
        width=${item.dimension.width + DISTANCE * 2}
        height=${item.dimension.height + DISTANCE * 2}
        fill="none"
        stroke="var(--ao-selection-color, #3b82f6)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
      />`;
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
    dimension: { width: w, height: h },
  } = item;
  const handles: ReadonlyArray<{
    cx: number;
    cy: number;
    cursor: string;
    handle: string;
  }> = [
    { cx: x - w / 2, cy: y - h / 2, cursor: "nwse-resize", handle: "tl" },
    { cx: x, cy: y - h / 2, cursor: "ns-resize", handle: "t" },
    { cx: x + w / 2, cy: y - h / 2, cursor: "nesw-resize", handle: "tr" },
    { cx: x + w / 2, cy: y, cursor: "ew-resize", handle: "r" },
    { cx: x + w / 2, cy: y + h / 2, cursor: "nwse-resize", handle: "br" },
    { cx: x, cy: y + h / 2, cursor: "ns-resize", handle: "b" },
    { cx: x - w / 2, cy: y + h / 2, cursor: "nesw-resize", handle: "bl" },
    { cx: x - w / 2, cy: y, cursor: "ew-resize", handle: "l" },
  ];

  return svg`
    ${handles.map(
      (h) => svg`
      <rect 
        class="resize-handle"
        x=${h.cx - 4}
        y=${h.cy - 4}
        width="8"
        height="8"
        fill="white"
        stroke="var(--ao-selection-color, #3b82f6)"
        stroke-width="1.5"
        style="cursor: ${h.cursor}"
        data-handle=${h.handle}
        data-item-id=${entryId}
        pointer-events="all"
      />
    `,
    )}
  `;
}
