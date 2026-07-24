import { nothing, svg, type TemplateResult } from "lit";
import { Bounds, Dimension, Node, NodeShape, Point } from "../../model/types";
import { getStrokeDashArray } from "./helper";
import { renderLabel } from "./label";

export function renderNode(
  n: Node,
  hasPage: boolean = false,
  editingLabel: boolean = false,
): TemplateResult {
  const label = getLabelBounds(n.style.shape, n.dimension);
  return svg`
    <g
      class="node${hasPage ? " has-page" : ""}"
      data-item-id="${n.id}"
      transform="translate(${n.position.x}, ${n.position.y})"
    >
    ${renderShape(n)}
    ${renderLabel(n.id, n.label, label.position, label.dimension, editingLabel)}
    ${hasPage ? renderBadge(n) : nothing}
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

function renderShape(n: Node): TemplateResult | typeof nothing {
  let shape: TemplateResult;

  if (n.style.shape === "rectangle") {
    shape = svg`
      <rect 
        x=${-n.dimension.width / 2}
        y=${-n.dimension.height / 2}
        width="${n.dimension.width}"
        height="${n.dimension.height}"
      />`;
  } else if (n.style.shape === "ellipse") {
    shape = svg`
      <ellipse
        cx="0"
        cy="0"
        rx="${n.dimension.width / 2}"
        ry="${n.dimension.height / 2}"
      />`;
  } else if (n.style.shape === "diamond") {
    shape = svg`
      <polygon
        points="${-n.dimension.width / 2},0 0,${-n.dimension.height / 2} ${n.dimension.width / 2},0 0,${n.dimension.height / 2}"
      />`;
  } else {
    return nothing;
  }

  return svg`
    <g
      class="shape"
      fill="${n.style.fill || "lightgray"}"
      stroke="${n.style.stroke || "black"}"
      stroke-width="${n.style.strokeWidth ?? 1}"
      stroke-dasharray="${getStrokeDashArray(n.style.strokeStyle, n.style.strokeWidth)}"
    >${shape}</g>`;
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

function renderBadge(n: Node): TemplateResult {
  const position = getBadgePosition(n.style.shape, n.dimension);

  const badgeColor = n.style.stroke || n.style.fill || "white";
  const iconColor = contrastInk(badgeColor);

  return svg`
    <g class="badge" transform="translate(${position.x}, ${position.y})" color=${iconColor}>
      <circle r="10" fill=${badgeColor} />
      ${getOpenPageIcon()}
    </g>`;
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
