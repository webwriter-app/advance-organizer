import { svg, type TemplateResult } from "lit";
import { Dimension, Id, Label, Point } from "../../model/types";

export function renderLabel(
  id: Id,
  label: Label,
  position: Point,
  dimension: Dimension,
  editing: boolean,
): TemplateResult {
  // Set text of contenteditable label imperatively at a later point to avoid Lit issues with contenteditable
  const content = editing
    ? svg`<div
        xmlns="http://www.w3.org/1999/xhtml"
        class="label-content label-editor"
        data-edit-id=${id}
        contenteditable="plaintext-only"
        style=${labelCss(label)}
      ></div>`
    : svg`<div
        xmlns="http://www.w3.org/1999/xhtml"
        class="label-content"
        data-edit-id=${id}
        contenteditable="false"
        style=${labelCss(label)}
      >${label.text}</div>`;

  return svg`
    <foreignObject
      class="label-fo"
      x=${position.x}
      y=${position.y}
      width=${dimension.width}
      height=${dimension.height}
    >
      <div xmlns="http://www.w3.org/1999/xhtml" class="label-wrap">
        ${content}
      </div>
    </foreignObject>`;
}

function labelCss(label: Label): string {
  const parts: string[] = [];
  if (label.color) parts.push(`color: ${label.color}`);
  if (label.fontSize) parts.push(`font-size: ${label.fontSize}px`);
  if (label.bold) parts.push("font-weight: bold");
  if (label.italic) parts.push("font-style: italic");
  if (label.underline) parts.push("text-decoration: underline");
  return parts.join("; ");
}
