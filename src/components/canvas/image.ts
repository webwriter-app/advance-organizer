import { svg, type TemplateResult } from "lit";
import { Image } from "../../model/types";

export function renderImage(img: Image): TemplateResult {
  const position = {
    x: -img.dimension.width / 2,
    y: -img.dimension.height / 2,
  };
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
  </g>`;
}
