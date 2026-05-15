import { LitElementWw } from "@webwriter/lit";
import { html, type TemplateResult } from "lit";
import { canvasStyles } from "./canvas.styles";
import { renderNode } from "./node";
import { provide } from "@lit/context";
import { documentContext, selectionContext } from "../../state/contexts";
import { SelectionController } from "../../state/selection";
import { renderOverlay } from "./overlay";
import { DocumentController } from "../../state/document";
import { repeat } from "lit/directives/repeat.js";

export class AoCanvas extends LitElementWw {
  @provide({
    context: documentContext,
  })
  accessor doc = new DocumentController(this);

  @provide({
    context: selectionContext,
  })
  accessor selection = new SelectionController(this, this.doc);

  static override styles = canvasStyles;

  protected override render(): TemplateResult {
    return html`<svg
      width="100%"
      height="100%"
      @pointerdown=${this._onPointerDown}>
      <g class="viewport">
        <g class="background"></g>
        <g class="edges"></g>
        <g class="nodes">
          ${repeat(
            this.doc.nodes,
            (n) => n.id,
            (n) => renderNode(n),
          )}
        </g>
        <g class="overlays">${renderOverlay(this.selection, this.doc)}</g>
      </g>
    </svg>`;
  }

  private _onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return; // ignore non-left clicks

    const target = e.target as Element;
    const itemEl = target.closest<SVGElement>("[data-item-id]");
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;

    if (itemEl) {
      const id = itemEl.dataset["itemId"]!;

      if (additive) {
        this.selection.toggle(id);
      } else if (!this.selection.has(id)) {
        this.selection.select(id);
      }
    } else if (!additive) {
      this.selection.clear();
    }

    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  }
}
