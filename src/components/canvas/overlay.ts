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
    dimension: { width: w, height: h },
  } = item;
  const handles: ReadonlyArray<{
    cx: number;
    cy: number;
    cursor: string;
    handle: string;
  }> = [
    { cx: -w / 2, cy: -h / 2, cursor: "nwse-resize", handle: "tl" },
    { cx: 0, cy: -h / 2, cursor: "ns-resize", handle: "t" },
    { cx: w / 2, cy: -h / 2, cursor: "nesw-resize", handle: "tr" },
    { cx: w / 2, cy: 0, cursor: "ew-resize", handle: "r" },
    { cx: w / 2, cy: h / 2, cursor: "nwse-resize", handle: "br" },
    { cx: 0, cy: h / 2, cursor: "ns-resize", handle: "b" },
    { cx: -w / 2, cy: h / 2, cursor: "nesw-resize", handle: "bl" },
    { cx: -w / 2, cy: 0, cursor: "ew-resize", handle: "l" },
  ];

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
          x=${h.cx - 4}
          y=${h.cy - 4}
          width="8"
          height="8"
          style="cursor: ${h.cursor}"
          data-handle=${h.handle}
        />
      `,
      )}
    </g>
  `;
}
