import { LitElementWw } from "@webwriter/lit";
import { html, svg, PropertyValues, type TemplateResult } from "lit";
import { canvasStyles } from "./canvas.styles";
import { renderNode } from "./node";
import { renderEdge, renderEdgePreview } from "./edge";
import { consume } from "@lit/context";
import { documentContext, selectionContext } from "../../state/contexts";
import { SelectionController } from "../../state/selection";
import { renderOverlay } from "./overlay";
import { DocumentController } from "../../state/document";
import { SubscribeController } from "../../state/subscribe";
import { repeat } from "lit/directives/repeat.js";
import {
  Dimension,
  EdgePosition,
  Id,
  Node,
  Point,
  ResizeHandle,
} from "../../model/types";
import { state } from "lit/decorators.js";
import {
  applyResize,
  computeEdgePoints,
  computeResize,
  getAnchorPoints,
  getHandlePositions,
  HANDLE_SIZE,
  SNAP_RADIUS,
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
  | {
      kind: "draw-edge";
      source: {
        nodeId: Id;
        anchor: EdgePosition;
        start: Point;
        startEndpointPos: Point;
      } | null;
    }
  | {
      kind: "reanchor-edge";
      edgeId: Id;
      endpoint: "source" | "target";
      otherNodeId: Id;
      start: Point;
      startEndpointPos: Point;
    };

export class AoCanvas extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  @state()
  private accessor _mode: InteractionMode = { kind: "idle" };

  private _rafId: number | null = null;
  private _pendingPointer: Point | null = null;
  private _snapTarget: { nodeId: Id; position: EdgePosition } | null = null;

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
          ${this._renderDrawEdgePreview()}
        </g>
        <g class="nodes">
          ${repeat(
            this.doc.nodes,
            (n) => n.id,
            (n) => renderNode(n),
          )}
        </g>
        <g class="overlays">
          ${renderOverlay(this.selection, this.doc, {
            active:
              this._mode.kind === "reanchor-edge" ||
              this._mode.kind === "draw-edge",
            skipNodeId:
              this._mode.kind === "reanchor-edge"
                ? this._mode.otherNodeId
                : this._mode.kind === "draw-edge"
                  ? (this._mode.source?.nodeId ?? undefined)
                  : undefined,
          })}
        </g>
      </g>
    </svg>`;
  }

  private _onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return; // ignore non-left clicks

    if (this._mode.kind === "draw-edge") {
      this._handleDrawEdgeClick(e);
      return;
    }

    const target = e.target as Element;
    const handleEl = target.closest<SVGElement>("[data-handle]");
    const itemEl = !handleEl
      ? target.closest<SVGElement>("[data-item-id]")
      : null;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;

    if (handleEl) {
      const handle = handleEl.dataset["handle"]!;
      const groupEl = handleEl.closest<SVGElement>("[data-resize-id]");
      const resizeId = groupEl?.dataset["resizeId"];
      if (!resizeId || !this.selection.has(resizeId)) return;
      const item = this.doc.get(resizeId);
      if (!item) return;
      if (item.kind === "node") {
        this._beginResize(e, resizeId, handle as ResizeHandle);
      } else if (item.kind === "edge") {
        this._beginReanchor(e, resizeId, handle as "source" | "target");
      }
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

  beginDrawEdge(): void {
    this.selection.clear();
    this._mode = { kind: "draw-edge", source: null };
  }

  private _beginReanchor(
    e: PointerEvent,
    edgeId: Id,
    endpoint: "source" | "target",
  ): void {
    const edge = this.doc.get(edgeId);
    if (!edge || edge.kind !== "edge") return;
    const source = this.doc.get(edge.source);
    const target = this.doc.get(edge.target);
    if (!source || source.kind !== "node" || !target || target.kind !== "node")
      return;

    const { start, end } = computeEdgePoints(source, target, edge);
    this._mode = {
      kind: "reanchor-edge",
      edgeId,
      endpoint,
      otherNodeId: endpoint === "source" ? edge.target : edge.source,
      start: { x: e.clientX, y: e.clientY },
      startEndpointPos: endpoint === "source" ? start : end,
    };
  }

  private _handleDrawEdgeClick(e: PointerEvent): void {
    if (this._mode.kind !== "draw-edge") return;

    const target = e.target as Element;
    const anchorEl = target.closest<SVGElement>("[data-anchor-position]");
    const anchorGroupEl = anchorEl?.closest<SVGElement>(
      "[data-anchor-node-id]",
    );

    if (!anchorEl || !anchorGroupEl) {
      this._resetMode();
      return;
    }

    const nodeId = anchorGroupEl.dataset["anchorNodeId"]!;
    const anchor = anchorEl.dataset["anchorPosition"] as EdgePosition;

    if (this._mode.source === null) {
      const node = this.doc.get(nodeId);
      if (!node || node.kind !== "node") return;
      const anchorRect = anchorEl.getBoundingClientRect();
      this._mode = {
        kind: "draw-edge",
        source: {
          nodeId,
          anchor,
          start: {
            x: anchorRect.x + anchorRect.width / 2,
            y: anchorRect.y + anchorRect.height / 2,
          },
          startEndpointPos: getAnchorPoints(node)[anchor],
        },
      };
      return;
    }

    if (nodeId === this._mode.source.nodeId) return;

    this._commitDrawEdge(this._mode.source, { nodeId, anchor });
  }

  private _commitDrawEdge(
    source: { nodeId: Id; anchor: EdgePosition },
    target: { nodeId: Id; anchor: EdgePosition },
  ): void {
    this._resetMode();
    console.log(
      "Adding edge from",
      source.nodeId,
      source.anchor,
      "to",
      target.nodeId,
      target.anchor,
    );
    this.doc.addEdge({
      source: source.nodeId,
      sourcePosition: source.anchor,
      target: target.nodeId,
      targetPosition: target.anchor,
      style: {
        markerEnd: "arrow",
      },
    });
  }

  private _renderDrawEdgePreview(): TemplateResult {
    if (this._mode.kind !== "draw-edge" || !this._mode.source) return svg``;
    const node = this.doc.get(this._mode.source.nodeId);
    if (!node || node.kind !== "node") return svg``;
    const start = this._mode.source.startEndpointPos;
    return renderEdgePreview(start);
  }

  private _applyDrawEdgePreviewDom(end: Point): void {
    const line = this.renderRoot.querySelector<SVGLineElement>(
      "g.edge-preview line",
    );
    if (!line) return;
    line.setAttribute("x2", String(end.x));
    line.setAttribute("y2", String(end.y));
  }

  private _onPointerMove(e: PointerEvent): void {
    if (
      this._mode.kind !== "drag" &&
      this._mode.kind !== "resize" &&
      this._mode.kind !== "reanchor-edge" &&
      !(this._mode.kind === "draw-edge" && this._mode.source !== null)
    )
      return;

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
        } else if (this._mode.kind === "reanchor-edge") {
          const dx = this._pendingPointer.x - this._mode.start.x;
          const dy = this._pendingPointer.y - this._mode.start.y;

          const pos = {
            x: this._mode.startEndpointPos.x + dx,
            y: this._mode.startEndpointPos.y + dy,
          };
          const snapTarget = this._findSnapTarget(pos, this._mode.otherNodeId);
          this._updateSnapHighlight(snapTarget);
          this._applyReanchorDom(
            this._mode.edgeId,
            this._mode.endpoint,
            snapTarget ? snapTarget.point : pos,
          );
        } else if (this._mode.kind === "draw-edge" && this._mode.source) {
          const dx = this._pendingPointer.x - this._mode.source.start.x;
          const dy = this._pendingPointer.y - this._mode.source.start.y;

          const pos = {
            x: this._mode.source.startEndpointPos.x + dx,
            y: this._mode.source.startEndpointPos.y + dy,
          };
          const snapTarget = this._findSnapTarget(
            pos,
            this._mode.source.nodeId,
          );
          this._updateSnapHighlight(snapTarget);
          this._applyDrawEdgePreviewDom(snapTarget ? snapTarget.point : pos);
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

  private _applyReanchorDom(
    edgeId: Id,
    endpoint: "source" | "target",
    newPos: Point,
  ): void {
    const edgeG = this.renderRoot.querySelector(
      `g.edge[data-item-id="${edgeId}"]`,
    ) as SVGGElement | null;
    if (!edgeG) return;

    const attr1 = endpoint === "source" ? "x1" : "x2";
    const attr2 = endpoint === "source" ? "y1" : "y2";

    edgeG.querySelectorAll("line").forEach((lineEl) => {
      lineEl.setAttribute(attr1, String(newPos.x));
      lineEl.setAttribute(attr2, String(newPos.y));
    });

    const selLine = this.renderRoot.querySelector(
      `line[data-selection-id="${edgeId}"]`,
    ) as SVGLineElement | null;
    if (selLine) {
      selLine.setAttribute(attr1, String(newPos.x));
      selLine.setAttribute(attr2, String(newPos.y));
    }
  }

  private _findSnapTarget(pos: Point, excludeId?: Id) {
    let closest: {
      nodeId: Id;
      position: EdgePosition;
      point: Point;
      distance: number;
    } | null = null;

    for (const node of this.doc.nodes) {
      if (node.id === excludeId) continue;
      const anchors = getAnchorPoints(node);
      for (const [anchorPos, anchorPoint] of Object.entries(anchors)) {
        const dx = anchorPoint.x - pos.x;
        const dy = anchorPoint.y - pos.y;
        const distance = Math.hypot(dx, dy);
        if (
          distance <= SNAP_RADIUS &&
          (closest === null || distance < closest.distance)
        ) {
          closest = {
            nodeId: node.id,
            position: anchorPos as EdgePosition,
            point: anchorPoint,
            distance,
          };
        }
      }
    }

    return closest;
  }

  private _onPointerUp(): void {
    if (this._mode.kind === "draw-edge") {
      if (this._mode.source && this._pendingPointer) {
        const dx = this._pendingPointer.x - this._mode.source.start.x;
        const dy = this._pendingPointer.y - this._mode.source.start.y;
        const pos = {
          x: this._mode.source.startEndpointPos.x + dx,
          y: this._mode.source.startEndpointPos.y + dy,
        };
        const snapTarget = this._findSnapTarget(pos, this._mode.source.nodeId);
        if (snapTarget) {
          this._commitDrawEdge(this._mode.source, {
            nodeId: snapTarget.nodeId,
            anchor: snapTarget.position,
          });
        }
      }
      return;
    }

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
    } else if (this._mode.kind === "reanchor-edge" && this._pendingPointer) {
      const dx = this._pendingPointer.x - this._mode.start.x;
      const dy = this._pendingPointer.y - this._mode.start.y;

      const pos = {
        x: this._mode.startEndpointPos.x + dx,
        y: this._mode.startEndpointPos.y + dy,
      };
      const snapTarget = this._findSnapTarget(pos, this._mode.otherNodeId);

      if (snapTarget) {
        this.doc.reanchorEdge(
          this._mode.edgeId,
          this._mode.endpoint,
          snapTarget.nodeId,
          snapTarget.position,
        );
      } else {
        this._applyReanchorDom(
          this._mode.edgeId,
          this._mode.endpoint,
          this._mode.startEndpointPos,
        );
      }
    }

    this._resetMode();
  }

  private _updateSnapHighlight(
    snapTarget: { nodeId: Id; position: EdgePosition } | null,
  ): void {
    if (
      snapTarget?.nodeId !== this._snapTarget?.nodeId ||
      snapTarget?.position !== this._snapTarget?.position
    ) {
      if (this._snapTarget) {
        this._setAnchorHighlight(this._snapTarget, false);
      }
      if (snapTarget) {
        this._setAnchorHighlight(snapTarget, true);
      }
      this._snapTarget = snapTarget;
    }
  }

  private _setAnchorHighlight(
    target: { nodeId: Id; position: EdgePosition },
    active: boolean,
  ): void {
    const circle = this.renderRoot.querySelector<SVGCircleElement>(
      `[data-anchor-node-id="${target.nodeId}"] [data-anchor-position="${target.position}"]`,
    );
    circle?.setAttribute(
      "fill",
      active ? "var(--ao-anchor-color, #7d828a)" : "white",
    );
  }

  private _resetMode(): void {
    if (this._snapTarget) {
      this._setAnchorHighlight(this._snapTarget, false);
      this._snapTarget = null;
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._pendingPointer = null;
    this._mode = { kind: "idle" };
  }
}
