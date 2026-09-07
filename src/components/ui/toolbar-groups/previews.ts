import { html, svg, type TemplateResult } from "lit";
import { NodeShape, StrokeStyle } from "../../../model/types";

import iconLineSolid from "@tabler/icons/outline/minus.svg";
import iconLineDashed from "@tabler/icons/outline/line-dashed.svg";
import iconLineDotted from "@tabler/icons/outline/line-dotted.svg";

export const STROKE_STYLE_ICONS: Record<StrokeStyle, string> = {
  solid: iconLineSolid,
  dashed: iconLineDashed,
  dotted: iconLineDotted,
};

export function renderShapeIcon(shape: NodeShape | undefined): TemplateResult {
  const outline =
    shape === "ellipse"
      ? svg`<ellipse cx="12" cy="12" rx="9" ry="6" />`
      : shape === "diamond"
        ? svg`<polygon points="12,4 21,12 12,20 3,12" />`
        : svg`<rect x="3" y="6" width="18" height="12" rx="1" />`;

  return html`<svg class="preview" viewBox="0 0 24 24" aria-hidden="true">
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round">
      ${outline}
    </g>
  </svg>`;
}

export function renderColorIcon(
  icon: string,
  color: string,
  label: string,
): TemplateResult {
  return html`<span class="color-preview">
    <sl-icon label=${label} .src=${icon}></sl-icon>
    <span
      class="color-bar${color === "#ffffff" ? " border" : ""}"
      style="background-color: ${color};"></span>
  </span>`;
}
