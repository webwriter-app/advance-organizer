import { svg, type TemplateResult } from "lit";
import { Image } from "../../model/types";
import { DEFAULT_BLACK } from "../../model/colors";
import { getStrokeDashArray } from "./helper";

export function renderImage(img: Image): TemplateResult {
  const position = {
    x: -img.dimension.width / 2,
    y: -img.dimension.height / 2,
  };
  const strokeWidth = img.style?.strokeWidth ?? 0;

  return svg`
    <g
      class="image"
      data-item-id="${img.id}"
      transform="translate(${img.position.x}, ${img.position.y})"
    >
    <image
      href="${img.src}"
      alt="${img.alt ?? ""}"
      x="${position.x}"
      y="${position.y}"
      width="${img.dimension.width}"
      height="${img.dimension.height}"
      preserveAspectRatio="none"
      />
      <rect
        class="image-border"
        x="${position.x}"
        y="${position.y}"
        width="${img.dimension.width}"
        height="${img.dimension.height}"
        fill="none"
        pointer-events="none"
        stroke="${img.style?.stroke || DEFAULT_BLACK}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${getStrokeDashArray(img.style?.strokeStyle, strokeWidth)}"
      />
    </g>`;
}
