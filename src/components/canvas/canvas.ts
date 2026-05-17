import { LitElementWw } from "@webwriter/lit";
import { html, PropertyValues, type TemplateResult } from "lit";
import { canvasStyles } from "./canvas.styles";
import { renderNode } from "./node";
import { consume } from "@lit/context";
import { documentContext, selectionContext } from "../../state/contexts";
import { SelectionController } from "../../state/selection";
import { renderOverlay } from "./overlay";
import { DocumentController } from "../../state/document";
import { SubscribeController } from "../../state/subscribe";
import { repeat } from "lit/directives/repeat.js";
import { Id, Point } from "../../model/types";
import { state } from "lit/decorators.js";

type InteractionMode =
  | { kind: "idle" }
  | { kind: "pan"; start: Point }
  | { kind: "lasso"; start: Point; current: Point }
  | {
      kind: "drag";
      start: Point;
      startPositions: Map<Id, Point>;
      items: Set<Id>;
    }
  | { kind: "draw-edge"; sourceId: Id; cursor: Point };

export class AoCanvas extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  @state()
  private accessor _mode: InteractionMode = { kind: "idle" };

  private _rafId: number | null = null;
  private _pendingPointer: Point | null = null;

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
  }

  static override styles = canvasStyles;

  protected override render(): TemplateResult {
    return html`<svg
      width="100%"
      height="100%"
      @pointerdown=${this._onPointerDown}
      @pointermove=${this._onPointerMove}
      @pointerup=${this._onPointerUp}
      @pointercancel=${this._onPointerUp}>
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

      this._beginDrag(e);
    } else if (!additive) {
      this.selection.clear();
    }

    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  }

  private _beginDrag(e: PointerEvent): void {
    const startPositions = new Map<Id, Point>();
    for (const id of this.selection.entries) {
      const item = this.doc.get(id);
      if (item?.kind === "node") {
        startPositions.set(id, { ...item.position });
      }
    }
    this._mode = {
      kind: "drag",
      start: { x: e.clientX, y: e.clientY },
      startPositions,
      items: new Set(this.selection.entries),
    };
  }

  private _onPointerMove(e: PointerEvent): void {
    if (this._mode.kind !== "drag") return;

    this._pendingPointer = { x: e.clientX, y: e.clientY };

    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (this._mode.kind !== "drag" || !this._pendingPointer) return;

        const dx = this._pendingPointer.x - this._mode.start.x;
        const dy = this._pendingPointer.y - this._mode.start.y;

        for (const [id, startPos] of this._mode.startPositions) {
          const transform = `translate(${startPos.x + dx}, ${startPos.y + dy})`;
          (
            this.renderRoot.querySelector(
              `g.node[data-item-id="${id}"]`,
            ) as SVGGElement | null
          )?.setAttribute("transform", transform);
          (
            this.renderRoot.querySelector(
              `[data-selection-id="${id}"]`,
            ) as SVGGElement | null
          )?.setAttribute("transform", transform);
          (
            this.renderRoot.querySelector(
              `.resize-handles[data-resize-id="${id}"]`,
            ) as SVGGElement | null
          )?.setAttribute("transform", transform);
        }
      });
    }
  }

  private _onPointerUp(): void {
    if (this._mode.kind === "drag" && this._pendingPointer) {
      const dx = this._pendingPointer.x - this._mode.start.x;
      const dy = this._pendingPointer.y - this._mode.start.y;

      if (dx !== 0 || dy !== 0) {
        const finalPositions = new Map<Id, Point>();
        for (const [id, startPos] of this._mode.startPositions) {
          finalPositions.set(id, { x: startPos.x + dx, y: startPos.y + dy });
        }
        this.doc.moveNodes(finalPositions);
      }
    }

    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._pendingPointer = null;
    this._mode = { kind: "idle" };
  }
}
