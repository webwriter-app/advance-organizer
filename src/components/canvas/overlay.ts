import { svg, nothing, type TemplateResult } from "lit";
import { SelectionController } from "../../state/selection";
import { AnchorRendering, Id, Point } from "../../model/types";
import { DocumentController } from "../../state/document";
import {
  computeEdgePoints,
  getAnchorPoints,
  getHandlePositions,
  HANDLE_SIZE,
  TOUCH_INDICATOR_RADIUS,
} from "./helper";

export interface RectangleSelection {
  start: Point;
  touch: boolean;
}

export function renderOverlay(
  selection: SelectionController,
  doc: DocumentController,
  zoom: number,
  anchorRendering: AnchorRendering,
  rectangleSelection: RectangleSelection | null,
): TemplateResult {
  return svg`
    <g 
      class="overlay"
      pointer-events="none"
    >
    ${rectangleSelection ? renderRectangleSelection(rectangleSelection.start) : nothing}
    ${rectangleSelection ? renderSelectionPreview(selection, doc) : nothing}
    ${rectangleSelection?.touch ? renderTouchIndicator(rectangleSelection.start, zoom) : nothing}
    ${[...selection.entries].map((e) => renderSelectionIndicator(e, doc))}
    ${selection.size === 1 ? renderResizeHandles([...selection.entries][0]!, doc, zoom) : nothing}
    ${renderAnchorPoints(doc, anchorRendering, zoom)}
  </g>`;
}

function renderRectangleSelection(point: Point): TemplateResult {
  return svg`
    <g
      class="rectangle-selection-group"
      pointer-events="none"
      transform="translate(${point.x}, ${point.y})"
    >
      <rect
        class="rectangle-selection"
        x=${0}
        y=${0}
        width=${0}
        height=${0}
        fill="var(--ao-selection-color, #3b82f6)"
        fill-opacity="0.2"
        stroke="var(--ao-selection-color, #3b82f6)"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
    </g>
  `;
}

function renderTouchIndicator(point: Point, zoom: number): TemplateResult {
  const r = TOUCH_INDICATOR_RADIUS / zoom;
  return svg`
    <g
      class="touch-indicator"
      pointer-events="none"
      transform="translate(${point.x}, ${point.y})"
    >
      <rect
        x=${-r}
        y=${-r}
        width=${2 * r}
        height=${2 * r}
        fill="var(--sl-color-neutral-400, #a0a0a9)"
        fill-opacity="0.2"
        stroke="var(--sl-color-neutral-400, #a0a0a9)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </g>
  `;
}

function renderSelectionPreview(
  selection: SelectionController,
  doc: DocumentController,
): TemplateResult {
  const items = [...doc.nodes, ...doc.images, ...doc.edges];
  return svg`
    ${items
      .filter((item) => !selection.has(item.id))
      .map((item) => renderSelectionIndicator(item.id, doc, true))}
  `;
}

function renderSelectionIndicator(
  entryId: Id,
  doc: DocumentController,
  preview = false,
): TemplateResult {
  const item = doc.get(entryId);
  if (!item) return svg``;

  if (item.kind === "node" || item.kind === "image") {
    return svg`
      <g
        data-selection-id=${preview ? nothing : entryId}
        data-preview-id=${preview ? entryId : nothing}
        visibility=${preview ? "hidden" : nothing}
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
        data-selection-id=${preview ? nothing : entryId}
        data-preview-id=${preview ? entryId : nothing}
        visibility=${preview ? "hidden" : nothing}
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
): TemplateResult | typeof nothing {
  if (anchorRendering.kind === "none") return nothing;

  const r = HANDLE_SIZE / zoom;

  return svg`
    ${doc.nodes.map((node) => {
      if (
        anchorRendering.kind === "all"
          ? node.id === anchorRendering.skipNodeId
          : node.id !== anchorRendering.nodeId
      ) {
        return nothing;
      }
      const anchors = Object.fromEntries(
        Object.entries(getAnchorPoints(node)).filter(
          ([pos]) =>
            anchorRendering.kind === "all" || pos === anchorRendering.position,
        ),
      );
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
