import { LitElementWw } from "@webwriter/lit";
import { html, svg, nothing, PropertyValues, type TemplateResult } from "lit";
import createPanZoom, { type PanZoom } from "panzoom";
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
  BoxItem,
  Dimension,
  EdgePosition,
  Id,
  Node,
  Point,
  ResizeHandle,
} from "../../model/types";
import { query, state } from "lit/decorators.js";
import {
  applyResize,
  computeEdgePoints,
  computeEdgeLabelLayout,
  computeResize,
  getAnchorPoints,
  getHandlePositions,
  HANDLE_CURSORS,
  HANDLE_SIZE,
  SNAP_RADIUS,
  INTERACTIVE_SELECTOR,
} from "./helper";
import { AoZoomControls } from "../ui/zoom-controls";
import { renderImage } from "./image";
import {
  countImageItems,
  displayDimension,
  filterImageFiles,
  importImage,
} from "../../utils/image-import";
import { AoDragOverlay } from "../ui/drag-overlay";

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
      aspectRatio: number;
      lockByDefault: boolean;
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
      otherEndpointPos: Point;
    };

export class AoCanvas extends LitElementWw {
  static override scopedElements = {
    "ao-zoom-controls": AoZoomControls,
    "ao-drag-overlay": AoDragOverlay,
  };

  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  @state()
  private accessor _mode: InteractionMode = { kind: "idle" };

  @state()
  private accessor _editingId: Id | null = null;

  @state()
  private accessor _zoom: number = 1;

  @state()
  private accessor _draggedImageCount: number | null = null;

  @query("ao-zoom-controls")
  private accessor _zoomControls!: AoZoomControls | null;

  private _panzoom: PanZoom | null = null;
  private _rafId: number | null = null;
  private _pendingPointer: Point | null = null;
  private _snapTarget: { nodeId: Id; position: EdgePosition } | null = null;
  private _editFocusPending: boolean = false;
  private _lastItemClick: { id: Id; time: number } | null = null;
  private _shiftKey: boolean = false;

  private static readonly DOUBLE_CLICK_MS = 400;
  private static readonly MIN_ZOOM = 0.25;
  private static readonly MAX_ZOOM = 4;
  private static readonly ZOOM_STEP = 1.3;
  private static readonly FIT_PADDING = 32;
  private static readonly INSERT_GAP = 24;

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
    this._initPanZoom();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.renderRoot
      ?.querySelector<SVGSVGElement>("svg")
      ?.removeEventListener("touchstart", this._onTouchStartCapture, {
        capture: true,
      });
    this._panzoom?.off("zoom", this._syncZoomLevel);
    this._panzoom?.dispose();
    this._panzoom = null;
  }

  static override styles = canvasStyles;

  // TODO: Replace <marker> with current-stroke fills with custom solution to support Safari
  // https://caniuse.com/wf-context-fill-stroke
  protected override render(): TemplateResult {
    return html`<svg
        style="touch-action: none"
        width="100%"
        height="100%"
        tabindex="0"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
        @keydown=${this._onEditKeydown}
        @focusout=${this._onEditFocusOut}
        @contextmenu=${this._onContextMenu}
        @dragover=${this._onDragOver}
        @dragleave=${this._onDragLeave}
        @drop=${this._onDrop}
        @paste=${this._onPaste}>
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
          <g class="images">
            ${repeat(this.doc.images, (img) => img.id, renderImage)}
          </g>
          <g class="edges">
            ${repeat(
              this.doc.edges,
              (e) => e.id,
              (e) => renderEdge(e, this.doc, this._editingId === e.id),
            )}
            ${this._renderDrawEdgePreview()}
          </g>
          <g class="nodes">
            ${repeat(
              this.doc.nodes,
              (n) => n.id,
              (n) => renderNode(n, this._editingId === n.id),
            )}
          </g>
          <g class="overlays">
            ${renderOverlay(this.selection, this.doc, this._zoom, {
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
      </svg>
      <ao-zoom-controls
        minZoom=${AoCanvas.MIN_ZOOM}
        maxZoom=${AoCanvas.MAX_ZOOM}
        @zoom-in=${this._zoomIn}
        @zoom-out=${this._zoomOut}
        @center-view=${this._fitToContent}>
      </ao-zoom-controls>
      ${this._draggedImageCount === null
        ? nothing
        : html`<ao-drag-overlay .imageCount=${this._draggedImageCount}>
          </ao-drag-overlay>`}`;
  }

  private _isInteractiveTarget(target: EventTarget | null): boolean {
    return !!(target as Element | null)?.closest(INTERACTIVE_SELECTOR);
  }

  private _initPanZoom(): void {
    const viewport = this.renderRoot.querySelector<SVGGElement>("g.viewport");
    const svg = this.renderRoot.querySelector<SVGSVGElement>("svg");
    if (!viewport || !svg) return;

    this._panzoom = createPanZoom(viewport, {
      minZoom: AoCanvas.MIN_ZOOM,
      maxZoom: AoCanvas.MAX_ZOOM,
      zoomDoubleClickSpeed: 1, // disable double-click to zoom
      beforeMouseDown: (e) => this._isInteractiveTarget(e.target),
    });
    this._panzoom.on("zoom", this._syncZoomLevel);
    this._syncZoomLevel();
    svg.addEventListener("touchstart", this._onTouchStartCapture, {
      capture: true,
      passive: true,
    });
  }

  private _syncZoomLevel = (): void => {
    if (!this._panzoom) return;
    const scale = this._panzoom.getTransform().scale;
    this._zoom = scale;
    if (this._zoomControls) {
      this._zoomControls.zoomLevel = scale;
    }
  };

  private _onTouchStartCapture = (e: TouchEvent): void => {
    if (this._isInteractiveTarget(e.target)) {
      e.stopPropagation();
    }
  };

  private _zoomScale(): number {
    return this._panzoom?.getTransform().scale ?? 1;
  }

  private _viewportSize(): { width: number; height: number } {
    const rect = this.renderRoot
      .querySelector<SVGSVGElement>("svg")
      ?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }

  private _clampZoom(scale: number): number {
    return Math.min(AoCanvas.MAX_ZOOM, Math.max(AoCanvas.MIN_ZOOM, scale));
  }

  private _zoomTo(scale: number, x: number, y: number): void {
    if (!this._panzoom) return;
    const current = this._panzoom.getTransform().scale;
    this._panzoom.zoomTo(0, 0, scale / current);
    this._panzoom.moveTo(x, y);
  }

  private _zoomIn(): void {
    this._zoomBy(AoCanvas.ZOOM_STEP);
  }
  private _zoomOut(): void {
    this._zoomBy(1 / AoCanvas.ZOOM_STEP);
  }

  private _zoomBy(factor: number): void {
    if (!this._panzoom) return;
    const { width, height } = this._viewportSize();
    const t = this._panzoom.getTransform();
    const targetScale = this._clampZoom(t.scale * factor);
    if (targetScale === t.scale) return;

    const cx = width / 2;
    const cy = height / 2;
    const sceneX = (cx - t.x) / t.scale;
    const sceneY = (cy - t.y) / t.scale;
    this._zoomTo(
      targetScale,
      cx - sceneX * targetScale,
      cy - sceneY * targetScale,
    );
  }

  private _fitToContent = (): void => {
    if (!this._panzoom) return;
    const { width, height } = this._viewportSize();
    if (width === 0 || height === 0) return;

    const nodes = this.doc.nodes;
    const images = this.doc.images;
    const boxItems: BoxItem[] = [...nodes, ...images];
    if (boxItems.length === 0) {
      this._zoomTo(1, width / 2, height / 2);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of boxItems) {
      minX = Math.min(minX, b.position.x - b.dimension.width / 2);
      minY = Math.min(minY, b.position.y - b.dimension.height / 2);
      maxX = Math.max(maxX, b.position.x + b.dimension.width / 2);
      maxY = Math.max(maxY, b.position.y + b.dimension.height / 2);
    }

    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;
    const scale = this._clampZoom(
      Math.min(
        (width - 2 * AoCanvas.FIT_PADDING) / bboxWidth,
        (height - 2 * AoCanvas.FIT_PADDING) / bboxHeight,
      ),
    );

    const centerX = minX + bboxWidth / 2;
    const centerY = minY + bboxHeight / 2;
    this._zoomTo(
      scale,
      width / 2 - centerX * scale,
      height / 2 - centerY * scale,
    );
  };

  private _clientToScene(clientX: number, clientY: number): Point {
    const rect = this.renderRoot
      .querySelector<SVGSVGElement>("svg")
      ?.getBoundingClientRect();
    const t = this._panzoom?.getTransform();
    const scale = t?.scale ?? 1;
    return {
      x: (clientX - (rect?.left ?? 0) - (t?.x ?? 0)) / scale,
      y: (clientY - (rect?.top ?? 0) - (t?.y ?? 0)) / scale,
    };
  }

  private _viewportCenter(): Point {
    const { width, height } = this._viewportSize();
    const t = this._panzoom?.getTransform();
    const scale = t?.scale ?? 1;
    return {
      x: (width / 2 - (t?.x ?? 0)) / scale,
      y: (height / 2 - (t?.y ?? 0)) / scale,
    };
  }

  private _onDragOver(e: DragEvent): void {
    if (!e.dataTransfer?.types.includes("Files")) return;
    const imageCount = countImageItems(e.dataTransfer.items);
    if (imageCount === 0) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    this._draggedImageCount = imageCount;
  }

  private _onDragLeave(e: DragEvent): void {
    const target = e.currentTarget as Element;
    const related = e.relatedTarget as Element | null;
    if (related && target.contains(related)) return;
    this._draggedImageCount = null;
  }

  private _onDrop(e: DragEvent): void {
    this._draggedImageCount = null;
    const files = filterImageFiles(e.dataTransfer?.files);
    e.preventDefault();
    e.stopPropagation();
    if (files.length === 0) return;
    this._insertImages(files, this._clientToScene(e.clientX, e.clientY));
  }

  private _onPaste(e: ClipboardEvent): void {
    if (this._editingId) return;
    const files = filterImageFiles(e.clipboardData?.files);
    if (files.length === 0) return;
    e.preventDefault();
    this._insertImages(files, this._viewportCenter());
  }

  private async _insertImages(files: File[], position: Point): Promise<void> {
    const inserted = new Set<Id>();
    let offset = 0;

    for (const file of files) {
      try {
        const imported = await importImage(file);
        const image = this.doc.addImage({
          dimension: displayDimension(imported),
          position: { x: position.x + offset, y: position.y + offset },
          src: imported.src,
        });
        inserted.add(image.id);
        offset += AoCanvas.INSERT_GAP;
      } catch (error) {
        console.error(`Could not insert ${file.name}`, error);
      }
    }

    if (inserted.size > 0) this.selection.select(inserted);
  }

  private _onPointerDown(e: PointerEvent): void {
    // Ignore clicks inside the label being edited, they are handled by the contenteditable div
    if ((e.target as Element).closest(".label-editor")) return;

    if (e.button !== 0) return; // ignore non-left clicks

    if (this._mode.kind === "draw-edge") {
      this._handleDrawEdgeClick(e);
      return;
    }

    this._shiftKey = e.shiftKey;

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
      if (item.kind === "node" || item.kind === "image") {
        this._beginResize(e, resizeId, handle as ResizeHandle);
      } else if (item.kind === "edge") {
        this._beginReanchor(e, resizeId, handle as "source" | "target");
      }
    } else if (itemEl) {
      const id = itemEl.dataset["itemId"]!;

      if (additive) {
        this.selection.toggle(id);
      } else if (!this.selection.has(id)) {
        this.selection.select(new Set<Id>([id]));
      }

      const isDoubleClick =
        this._lastItemClick?.id === id &&
        e.timeStamp - this._lastItemClick.time < AoCanvas.DOUBLE_CLICK_MS;
      this._lastItemClick = { id, time: e.timeStamp };

      const item = this.doc.get(id);
      if (
        isDoubleClick &&
        (item?.kind === "node" || (item?.kind === "edge" && !!item.label))
      ) {
        // Suppress browser focus handling
        e.preventDefault();
        this._lastItemClick = null;
        this._startEditing(id);
        return;
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
      if (item?.kind === "node" || item?.kind === "image") {
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
    if (!item || (item.kind !== "node" && item.kind !== "image")) return;

    this._mode = {
      kind: "resize",
      start: { x: e.clientX, y: e.clientY },
      startPosition: { ...item.position },
      startDimension: { ...item.dimension },
      handle,
      itemId,
      aspectRatio: item.dimension.width / item.dimension.height,
      lockByDefault: item.kind === "image",
    };

    this.style.setProperty("--ao-resize-cursor", HANDLE_CURSORS[handle]);
    this.classList.add("resizing");
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
      otherEndpointPos: endpoint === "source" ? end : start,
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
    this._shiftKey = e.shiftKey;

    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (!this._pendingPointer) return;

        const scale = this._zoomScale();
        if (this._mode.kind === "drag") {
          const dx = (this._pendingPointer.x - this._mode.start.x) / scale;
          const dy = (this._pendingPointer.y - this._mode.start.y) / scale;

          const newPositions = new Map<Id, Point>();
          for (const [id, startPos] of this._mode.startPositions) {
            newPositions.set(id, { x: startPos.x + dx, y: startPos.y + dy });
          }
          for (const [id, newPos] of newPositions) {
            this._applyDragDom(id, newPos, newPositions);
          }
        } else if (this._mode.kind === "resize") {
          const dx = (this._pendingPointer.x - this._mode.start.x) / scale;
          const dy = (this._pendingPointer.y - this._mode.start.y) / scale;
          const locked = this._mode.lockByDefault !== this._shiftKey;
          const { newPos, newDim } = computeResize(
            this._mode.handle,
            this._mode.startPosition,
            this._mode.startDimension,
            dx,
            dy,
            locked ? this._mode.aspectRatio : undefined,
          );
          this._applyResizeDom(this._mode.itemId, newPos, newDim);
        } else if (this._mode.kind === "reanchor-edge") {
          const dx = (this._pendingPointer.x - this._mode.start.x) / scale;
          const dy = (this._pendingPointer.y - this._mode.start.y) / scale;

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
            this._mode.otherEndpointPos,
          );
        } else if (this._mode.kind === "draw-edge" && this._mode.source) {
          const dx =
            (this._pendingPointer.x - this._mode.source.start.x) / scale;
          const dy =
            (this._pendingPointer.y - this._mode.source.start.y) / scale;

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
      `g.node[data-item-id="${id}"], g.image[data-item-id="${id}"]`,
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

      this._updateEdgeLabelDom(gEl, start, end);
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
      `g.node[data-item-id="${id}"] g.shape > *, g.image[data-item-id="${id}"] image`,
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
      const hs = HANDLE_SIZE / this._zoom;
      const handlePositions = getHandlePositions(newDim);
      for (const { handle, pos } of handlePositions) {
        const rect = handlesG.querySelector(`[data-handle="${handle}"]`);
        if (rect) {
          rect.setAttribute("x", String(pos.x - hs / 2));
          rect.setAttribute("y", String(pos.y - hs / 2));
        }
      }
    }

    const labelFo = this.renderRoot.querySelector(
      `g.node[data-item-id="${id}"] foreignObject.label-fo`,
    ) as SVGForeignObjectElement | null;
    if (labelFo) {
      applyResize(labelFo, newDim);
    }

    this._updateConnectedEdgesDom(id, newPos, newDim);
  }

  private _applyReanchorDom(
    edgeId: Id,
    endpoint: "source" | "target",
    newPos: Point,
    otherPos: Point,
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

    const start = endpoint === "source" ? newPos : otherPos;
    const end = endpoint === "source" ? otherPos : newPos;
    this._updateEdgeLabelDom(edgeG, start, end);
  }

  private _updateEdgeLabelDom(
    edgeG: SVGGElement,
    start: Point,
    end: Point,
  ): void {
    const labelFo = edgeG.querySelector(
      `foreignObject.label-fo`,
    ) as SVGForeignObjectElement | null;
    if (!labelFo) return;

    const { position, dimension } = computeEdgeLabelLayout(start, end);
    labelFo.setAttribute("x", String(position.x));
    labelFo.setAttribute("y", String(position.y));
    labelFo.setAttribute("width", String(dimension.width));
    labelFo.setAttribute("height", String(dimension.height));
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

  private _onPointerUp(e?: PointerEvent): void {
    if (e) this._shiftKey = e.shiftKey;

    if (this._mode.kind === "draw-edge") {
      if (this._mode.source && this._pendingPointer) {
        const scale = this._zoomScale();
        const dx = (this._pendingPointer.x - this._mode.source.start.x) / scale;
        const dy = (this._pendingPointer.y - this._mode.source.start.y) / scale;
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

    const scale = this._zoomScale();
    if (this._mode.kind === "drag" && this._pendingPointer) {
      const dx = (this._pendingPointer.x - this._mode.start.x) / scale;
      const dy = (this._pendingPointer.y - this._mode.start.y) / scale;

      if (dx !== 0 || dy !== 0) {
        const finalPositions = new Map<Id, Point>();
        for (const [id, startPos] of this._mode.startPositions) {
          finalPositions.set(id, { x: startPos.x + dx, y: startPos.y + dy });
        }
        this.doc.moveItems(finalPositions);
      }
    } else if (this._mode.kind === "resize" && this._pendingPointer) {
      const dx = (this._pendingPointer.x - this._mode.start.x) / scale;
      const dy = (this._pendingPointer.y - this._mode.start.y) / scale;
      const locked = this._mode.lockByDefault !== this._shiftKey;
      const { newPos, newDim } = computeResize(
        this._mode.handle,
        this._mode.startPosition,
        this._mode.startDimension,
        dx,
        dy,
        locked ? this._mode.aspectRatio : undefined,
      );
      this.doc.resizeItem(this._mode.itemId, newPos, newDim);
    } else if (this._mode.kind === "reanchor-edge" && this._pendingPointer) {
      const dx = (this._pendingPointer.x - this._mode.start.x) / scale;
      const dy = (this._pendingPointer.y - this._mode.start.y) / scale;

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
          this._mode.otherEndpointPos,
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
    if (this._mode.kind === "resize") {
      this.classList.remove("resizing");
      this.style.removeProperty("--ao-resize-cursor");
    }
    if (this._snapTarget) {
      this._setAnchorHighlight(this._snapTarget, false);
      this._snapTarget = null;
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._pendingPointer = null;
    if (this._mode.kind !== "idle") {
      this._mode = { kind: "idle" };
    }
  }

  protected override updated(): void {
    if (this._editFocusPending && this._editingId) {
      this._editFocusPending = false;
      const el = this.renderRoot.querySelector<HTMLElement>(
        `.label-editor[data-edit-id="${this._editingId}"]`,
      );
      if (el) {
        // Set text imperatively to avoid Lit issues with contenteditable
        const item = this.doc.get(this._editingId);
        if (!item || (item.kind !== "node" && item.kind !== "edge")) return;
        el.textContent = item?.label?.text ?? "";
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  private _startEditing(id: Id): void {
    this._editingId = id;
    this._editFocusPending = true;
  }

  private _onEditKeydown(e: KeyboardEvent): void {
    if (!this._editingId) return;
    const el = e.target as HTMLElement;
    if (!el.classList?.contains("label-editor")) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this._commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      this._cancelEdit();
    }
    e.stopPropagation();
  }

  private _onEditFocusOut(e: FocusEvent): void {
    const el = e.target as HTMLElement;
    if (!el.classList?.contains("label-editor")) return;
    this._commitEdit();
  }

  private _commitEdit(): void {
    if (!this._editingId) return;
    const id = this._editingId;
    const el = this.renderRoot.querySelector<HTMLElement>(
      `.label-editor[data-edit-id="${id}"]`,
    );
    const text = (el?.innerText ?? "").trim();
    this._editingId = null;
    this.doc.updateLabelText(id, text);
  }

  private _cancelEdit(): void {
    // Triggers re-render to restore previous label text
    this._editingId = null;
  }

  private _onContextMenu(e: PointerEvent): void {
    if (this._mode.kind !== "idle") return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as Element;
    const itemEl = target.closest<SVGElement>("[data-item-id]");

    if (!itemEl) return;

    if (!this.selection.has(itemEl.dataset["itemId"]!)) {
      this.selection.select(new Set<Id>([itemEl.dataset["itemId"]!]));
    }

    const contextMenuEvent = new CustomEvent("open-context-menu", {
      detail: {
        x: e.clientX,
        y: e.clientY,
      },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(contextMenuEvent);
  }
}
