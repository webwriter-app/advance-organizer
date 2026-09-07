import { html, nothing, svg, type TemplateResult } from "lit";
import {
  Bounds,
  Dimension,
  Node,
  NodeShape,
  NodeStyle,
  Point,
} from "../../model/types";
import { DEFAULT_BLACK } from "../../model/colors";
import { getStrokeDashArray } from "./helper";
import { renderLabel } from "./label";

/**
 * If `pageNumber` is given, the badge shows that number instead of the open-page icon.
 */
export function renderNode(
  n: Node,
  hasPage: boolean = false,
  editingLabel: boolean = false,
  pageNumber?: number,
): TemplateResult {
  const label = getLabelBounds(n.style.shape, n.dimension);
  return svg`
    <g
      class="node${hasPage ? " has-page" : ""}"
      data-item-id="${n.id}"
      transform="translate(${n.position.x}, ${n.position.y})"
    >
    ${renderShape(n.style, n.dimension)}
    ${renderLabel(n.id, n.label, label.position, label.dimension, editingLabel)}
    ${hasPage ? renderBadge(n, pageNumber) : nothing}
  </g>`;
}

export function getLabelBounds(
  shape: NodeShape | undefined,
  dim: Dimension,
): Bounds {
  const scale =
    shape === "ellipse" ? Math.SQRT1_2 : shape === "diamond" ? 0.5 : 1;

  const dimension = {
    width: dim.width * scale,
    height: dim.height * scale,
  };
  return {
    position: { x: -dimension.width / 2, y: -dimension.height / 2 },
    dimension,
  };
}

function renderShape(
  style: NodeStyle,
  dim: Dimension,
): TemplateResult | typeof nothing {
  let shape: TemplateResult;

  if (style.shape === "rectangle") {
    shape = svg`
      <rect 
        x=${-dim.width / 2}
        y=${-dim.height / 2}
        width="${dim.width}"
        height="${dim.height}"
      />`;
  } else if (style.shape === "ellipse") {
    shape = svg`
      <ellipse
        cx="0"
        cy="0"
        rx="${dim.width / 2}"
        ry="${dim.height / 2}"
      />`;
  } else if (style.shape === "diamond") {
    shape = svg`
      <polygon
        points="${-dim.width / 2},0 0,${-dim.height / 2} ${dim.width / 2},0 0,${dim.height / 2}"
      />`;
  } else {
    return nothing;
  }

  return svg`
    <g
      class="shape"
      fill="${style.fill || "lightgray"}"
      stroke="${style.stroke || DEFAULT_BLACK}"
      stroke-width="${style.strokeWidth ?? 1}"
      stroke-dasharray="${getStrokeDashArray(style.strokeStyle, style.strokeWidth)}"
    >${shape}</g>`;
}

const PREVIEW_DIMENSION: Dimension = { width: 48, height: 24 };
const PREVIEW_PADDING = 4;

export function renderShapePreview(style: NodeStyle): TemplateResult {
  const width = PREVIEW_DIMENSION.width + 2 * PREVIEW_PADDING;
  const height = PREVIEW_DIMENSION.height + 2 * PREVIEW_PADDING;

  return html`<svg
    class="shape-preview"
    viewBox="${-width / 2} ${-height / 2} ${width} ${height}"
    width=${width}
    height=${height}
    aria-hidden="true">
    ${renderShape(
      { ...style, shape: style.shape ?? "rectangle" },
      PREVIEW_DIMENSION,
    )}
  </svg>`;
}

export function getBadgePosition(
  shape: NodeShape | undefined,
  dim: Dimension,
): Point {
  if (shape === "ellipse") {
    return {
      x: (dim.width / 2) * Math.SQRT1_2,
      y: (-dim.height / 2) * Math.SQRT1_2,
    };
  } else if (shape === "diamond") {
    return { x: dim.width / 4, y: -dim.height / 4 };
  }
  return { x: dim.width / 2, y: -dim.height / 2 };
}

export function getBadgeColors(style: NodeStyle): {
  badge: string;
  icon: "white" | "black";
} {
  const badge = style.stroke || style.fill || "white";
  return { badge, icon: contrastInk(badge) };
}

function renderBadge(n: Node, pageNumber?: number): TemplateResult {
  const position = getBadgePosition(n.style.shape, n.dimension);
  const { badge, icon } = getBadgeColors(n.style);
  const numbered = pageNumber !== undefined;

  return svg`
    <g class="badge" transform="translate(${position.x}, ${position.y})" color=${icon}>
      <circle r=${numbered ? 14 : 10} fill=${badge} />
      ${numbered ? getPageNumber(pageNumber) : getOpenPageIcon()}
    </g>`;
}

function getPageNumber(pageNumber: number): TemplateResult {
  return svg`
    <text
      class="badge-number"
      text-anchor="middle"
      dy="0.35em"
      fill="currentColor"
      font-size="16"
      font-weight="bold"
    >${pageNumber}</text>`;
}

function getOpenPageIcon(): TemplateResult {
  // Taken and adapted from @tabler/icons/outline/share-3.svg
  return svg`
    <g transform="translate(-6, -6) scale(0.5)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-share-3">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M13 4v4c-6.575 1.028 -9.02 6.788 -10 12c-.037 .206 5.384 -5.962 10 -6v4l8 -7l-8 -7" />
    </g>`;
}

const probe = document.createElement("canvas").getContext("2d")!;

function contrastInk(background: string): "white" | "black" {
  probe.fillStyle = "#fff";
  probe.fillStyle = background;
  const [r = 0, g = 0, b = 0] = probe.fillStyle
    .match(/\w\w/g)!
    .map((h) => parseInt(h, 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 128 ? "black" : "white";
}
