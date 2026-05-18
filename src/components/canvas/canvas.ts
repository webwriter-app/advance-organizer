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
import { Dimension, Id, Point, ResizeHandle } from "../../model/types";
import { state } from "lit/decorators.js";
import {
  applyResize,
  computeResize,
  getHandlePositions,
  HANDLE_SIZE,
} from "./helper";

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
  | {
      kind: "resize";
      start: Point;
      startPosition: Point;
      startDimension: Dimension;
      handle: ResizeHandle;
      itemId: Id;
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
    const handleEl = target.closest<SVGElement>("[data-handle]");
    const itemEl = !handleEl
      ? target.closest<SVGElement>("[data-item-id]")
      : null;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;

    if (handleEl) {
      const handle = handleEl.dataset["handle"]! as ResizeHandle;
      const groupEl = handleEl.closest<SVGElement>("[data-resize-id]");
      const resizeId = groupEl?.dataset["resizeId"];
      if (!resizeId || !this.selection.has(resizeId)) return;
      this._beginResize(e, resizeId, handle);
    } else if (itemEl) {
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

  private _beginResize(
    e: PointerEvent,
    itemId: Id,
    handle: ResizeHandle,
  ): void {
    const item = this.doc.get(itemId);
    if (!item || item.kind !== "node") return;

    this._mode = {
      kind: "resize",
      start: { x: e.clientX, y: e.clientY },
      startPosition: { ...item.position },
      startDimension: { ...item.dimension },
      handle,
      itemId,
    };
  }

  private _onPointerMove(e: PointerEvent): void {
    if (this._mode.kind !== "drag" && this._mode.kind !== "resize") return;

    this._pendingPointer = { x: e.clientX, y: e.clientY };

    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (!this._pendingPointer) return;

        if (this._mode.kind === "drag") {
          const dx = this._pendingPointer.x - this._mode.start.x;
          const dy = this._pendingPointer.y - this._mode.start.y;

          for (const [id, startPos] of this._mode.startPositions) {
            const newPos = { x: startPos.x + dx, y: startPos.y + dy };
            this._applyDragDom(id, newPos);
          }
        } else if (this._mode.kind === "resize") {
          const dx = this._pendingPointer.x - this._mode.start.x;
          const dy = this._pendingPointer.y - this._mode.start.y;
          const { newPos, newDim } = computeResize(
            this._mode.handle,
            this._mode.startPosition,
            this._mode.startDimension,
            dx,
            dy,
          );
          this._applyResizeDom(this._mode.itemId, newPos, newDim);
        }
      });
    }
  }

  private _applyDragDom(id: Id, newPos: Point): void {
    const translate = `translate(${newPos.x}, ${newPos.y})`;

    const nodeG = this.renderRoot.querySelector(
      `g.node[data-item-id="${id}"]`,
    ) as SVGGElement | null;
    const selG = this.renderRoot.querySelector(
      `[data-selection-id="${id}"]`,
    ) as SVGGElement | null;
    const handlesG = this.renderRoot.querySelector(
      `.resize-handles[data-resize-id="${id}"]`,
    ) as SVGGElement | null;

    nodeG?.setAttribute("transform", translate);
    selG?.setAttribute("transform", translate);
    handlesG?.setAttribute("transform", translate);
  }

  private _applyResizeDom(id: Id, newPos: Point, newDim: Dimension): void {
    this._applyDragDom(id, newPos);

    const shapeEl = this.renderRoot.querySelector(
      `g.node[data-item-id="${id}"] g.shape > *`,
    ) as SVGElement | null;
    if (shapeEl) {
      applyResize(shapeEl, newDim);
    }

    const selRect = this.renderRoot.querySelector(
      `g[data-selection-id="${id}"] rect`,
    ) as SVGRectElement | null;
    if (selRect) {
      applyResize(selRect, newDim);
    }

    const handlesG = this.renderRoot.querySelector(
      `.resize-handles[data-resize-id="${id}"]`,
    ) as SVGGElement | null;
    if (handlesG) {
      const handlePositions = getHandlePositions(newDim);
      for (const { handle, pos } of handlePositions) {
        const rect = handlesG.querySelector(`[data-handle="${handle}"]`);
        if (rect) {
          rect.setAttribute("x", String(pos.x - HANDLE_SIZE / 2));
          rect.setAttribute("y", String(pos.y - HANDLE_SIZE / 2));
        }
      }
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
    } else if (this._mode.kind === "resize" && this._pendingPointer) {
      const dx = this._pendingPointer.x - this._mode.start.x;
      const dy = this._pendingPointer.y - this._mode.start.y;
      const { newPos, newDim } = computeResize(
        this._mode.handle,
        this._mode.startPosition,
        this._mode.startDimension,
        dx,
        dy,
      );
      this.doc.resizeNode(this._mode.itemId, newPos, newDim);
    }

    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._pendingPointer = null;
    this._mode = { kind: "idle" };
  }
}
