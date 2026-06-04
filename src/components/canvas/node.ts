import { svg, type TemplateResult } from "lit";
import { Node } from "../../model/types";
import { getStrokeDashArray } from "./helper";

export function renderNode(n: Node): TemplateResult {
  return svg`
    <g 
      class="node"
      data-item-id="${n.id}"
      transform="translate(${n.position.x}, ${n.position.y})"  
    >
    ${renderShape(n)}
    <text x="0" y="0" text-anchor="middle" alignment-baseline="middle">${n.label.text}</text>
  </g>`;
}

function renderShape(n: Node): TemplateResult {
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
    return svg``;
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
