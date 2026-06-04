import { LitElementWw } from "@webwriter/lit";
import { html, PropertyValues, type TemplateResult } from "lit";
import { canvasStyles } from "./canvas.styles";
import { renderNode } from "./node";
import { renderEdge } from "./edge";
import { consume } from "@lit/context";
import { documentContext, selectionContext } from "../../state/contexts";
import { SelectionController } from "../../state/selection";
import { renderOverlay } from "./overlay";
import { DocumentController } from "../../state/document";
import { SubscribeController } from "../../state/subscribe";
import { repeat } from "lit/directives/repeat.js";
import { Dimension, Id, Node, Point, ResizeHandle } from "../../model/types";
import { state } from "lit/decorators.js";
import {
  applyResize,
  computeEdgePoints,
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

  // TODO: Replace <marker> with current-stroke fills with custom solution to support Safari
  // https://caniuse.com/wf-context-fill-stroke
  protected override render(): TemplateResult {
    return html`<svg
      style="touch-action: none"
      width="100%"
      height="100%"
      @pointerdown=${this._onPointerDown}
      @pointermove=${this._onPointerMove}
      @pointerup=${this._onPointerUp}
      @pointercancel=${this._onPointerUp}>
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
        </marker>
      </defs>
      <g class="viewport">
        <g class="background"></g>
        <g class="edges">
          ${repeat(
            this.doc.edges,
            (e) => e.id,
            (e) => renderEdge(e, this.doc),
          )}
        </g>
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

          const newPositions = new Map<Id, Point>();
          for (const [id, startPos] of this._mode.startPositions) {
            newPositions.set(id, { x: startPos.x + dx, y: startPos.y + dy });
          }
          for (const [id, newPos] of newPositions) {
            this._applyDragDom(id, newPos, newPositions);
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

  private _applyDragDom(
    id: Id,
    newPos: Point,
    allNewPositions?: Map<Id, Point>,
  ): void {
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

    this._updateConnectedEdgesDom(id, newPos, undefined, allNewPositions);
  }

  private _updateConnectedEdgesDom(
    id: Id,
    newPos: Point,
    newDim?: Dimension,
    allNewPositions?: Map<Id, Point>,
  ): void {
    const node = this.doc.get(id);
    if (!node || node.kind !== "node") return;

    const movedNode: Node = {
      ...node,
      position: newPos,
      ...(newDim && { dimension: newDim }),
    };

    const _applyEdge = (gEl: SVGGElement, isSource: boolean): void => {
      const edgeId = gEl.dataset["itemId"];
      if (!edgeId) return;
      const edge = this.doc.get(edgeId);
      if (!edge || edge.kind !== "edge") return;

      const otherId = isSource ? edge.target : edge.source;
      const otherNode = this.doc.get(otherId);
      if (!otherNode || otherNode.kind !== "node") return;

      const otherNewPos = allNewPositions?.get(otherId);
      const effectiveOther: Node = otherNewPos
        ? { ...otherNode, position: otherNewPos }
        : otherNode;

      const source = isSource ? movedNode : effectiveOther;
      const target = isSource ? effectiveOther : movedNode;
      const { start, end } = computeEdgePoints(source, target, edge);

      const selLine = this.renderRoot.querySelector(
        `line[data-selection-id="${edgeId}"]`,
      ) as SVGLineElement | null;
      if (selLine) {
        selLine.setAttribute("x1", String(start.x));
        selLine.setAttribute("y1", String(start.y));
        selLine.setAttribute("x2", String(end.x));
        selLine.setAttribute("y2", String(end.y));
      }

      for (const lineEl of gEl.querySelectorAll("line")) {
        lineEl.setAttribute("x1", String(start.x));
        lineEl.setAttribute("y1", String(start.y));
        lineEl.setAttribute("x2", String(end.x));
        lineEl.setAttribute("y2", String(end.y));
      }
    };

    for (const gEl of this.renderRoot.querySelectorAll<SVGGElement>(
      `g.edge[data-source-id="${id}"]`,
    )) {
      _applyEdge(gEl, true);
    }
    for (const gEl of this.renderRoot.querySelectorAll<SVGGElement>(
      `g.edge[data-target-id="${id}"]`,
    )) {
      _applyEdge(gEl, false);
    }
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

    this._updateConnectedEdgesDom(id, newPos, newDim);
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
