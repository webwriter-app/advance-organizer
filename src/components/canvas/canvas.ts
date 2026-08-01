import { LitElementWw } from "@webwriter/lit";
import { html, nothing, PropertyValues, type TemplateResult } from "lit";
import { canvasStyles } from "./canvas.styles";
import { renderNode } from "./node";
import { renderEdge } from "./edge";
import { consume } from "@lit/context";
import {
  documentContext,
  pageContext,
  selectionContext,
} from "../../state/contexts";
import { SelectionController } from "../../state/selection";
import { PageController } from "../../state/page";
import { renderOverlay } from "./overlay";
import { DocumentController } from "../../state/document";
import { SubscribeController } from "../../state/subscribe";
import { repeat } from "lit/directives/repeat.js";
import {
  AnchorRendering,
  ColorPreview,
  EdgePosition,
  Id,
  Point,
  ResizeHandle,
} from "../../model/types";
import { property, state } from "lit/decorators.js";
import { ANCHOR_HOVER_RADIUS, INTERACTIVE_SELECTOR } from "./helper";
import { ClipboardAction } from "../../utils/clipboard";
import { AoZoomControls } from "../ui/zoom-controls";
import { ZoomController } from "./zoom";
import { renderImage } from "./image";
import { AoDragOverlay } from "../ui/drag-overlay";
import {
  copySelection,
  cutSelection,
  pasteFromEvent,
  runClipboardAction as performClipboardAction,
} from "./copy-paste";
import { DropController } from "./drop";
import { InteractionMode, ModeContext } from "./modes/types";
import { getHandlers, handlesPointerMove } from "./modes";
import { beginDrag } from "./modes/drag";
import { beginResize } from "./modes/resize";
import { beginRectangleSelect } from "./modes/rectangle-select";
import { beginReanchor } from "./modes/reanchor-edge";
import {
  beginDrawEdge as startDrawEdgeMode,
  beginDrawEdgeFromAnchor,
  findAnchorTarget,
  handleDrawEdgeClick,
  renderDrawEdgePreview,
} from "./modes/draw-edge";
import { findNearestAnchor, SnapHighlighter } from "./snap";
import { applyColorPreviewDom } from "./dom-sync";
import { LabelEditController, EDITOR_CLASS } from "./label-edit";

export class AoCanvas extends LitElementWw {
  static override scopedElements = {
    "ao-zoom-controls": AoZoomControls,
    "ao-drag-overlay": AoDragOverlay,
  };

  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  @consume({ context: pageContext })
  accessor pages!: PageController;

  @property({ type: Boolean, reflect: true })
  accessor editable = true;

  @state()
  private accessor _mode: InteractionMode = { kind: "idle" };

  @state()
  private accessor _hoveredAnchor: {
    nodeId: Id;
    position: EdgePosition;
  } | null = null;

  private readonly _labelEdit = new LabelEditController(this);

  get editingId(): Id | null {
    return this._labelEdit.editingId;
  }

  private _rafId: number | null = null;
  private _pendingPointer: Point | null = null;
  private _lastItemClick: { id: Id; time: number } | null = null;
  private _shiftKey: boolean = false;

  private static readonly DOUBLE_CLICK_MS = 400;
  private static readonly MIN_ZOOM = 0.25;
  private static readonly MAX_ZOOM = 4;

  private readonly _zoomController = new ZoomController(
    this,
    AoCanvas.MIN_ZOOM,
    AoCanvas.MAX_ZOOM,
  );

  private readonly _snapHighlighter = new SnapHighlighter();

  private readonly _dropController = new DropController(
    this,
    this._zoomController,
  );

  private _modeContextCache: ModeContext | null = null;

  private get _modeContext(): ModeContext {
    return (this._modeContextCache ??= {
      doc: this.doc,
      selection: this.selection,
      zoom: this._zoomController,
      snap: this._snapHighlighter,
      root: this.renderRoot,
      host: this,
      shiftKeyPressed: () => this._shiftKey,
      setMode: (mode) => {
        this._mode = mode;
        this._pendingPointer = null;
      },
      resetMode: () => this._resetMode(),
    });
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("editable") && !this.editable) {
      this.selection?.clear();
      this._resetMode();
    }

    if (this._hoveredAnchor && !this._tracksAnchorHover()) {
      this._hoveredAnchor = null;
    }
  }

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
    new SubscribeController(this, this.pages);

    const viewport = this.renderRoot.querySelector<SVGGElement>("g.viewport");
    const svg = this.renderRoot.querySelector<SVGSVGElement>("svg");
    if (!viewport || !svg) return;

    this._zoomController.init(viewport);
    svg.addEventListener("touchstart", this._onTouchStartCapture, {
      capture: true,
      passive: true,
    });
    svg.addEventListener("mousedown", this._onMouseDownCapture, {
      capture: true,
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    const svg = this.renderRoot?.querySelector<SVGSVGElement>("svg");
    svg?.removeEventListener("touchstart", this._onTouchStartCapture, {
      capture: true,
    });
    svg?.removeEventListener("mousedown", this._onMouseDownCapture, {
      capture: true,
    });
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
        @pointerleave=${() => (this._hoveredAnchor = null)}
        @keydown=${(e: KeyboardEvent) => this._labelEdit.onKeydown(e)}
        @focusout=${(e: FocusEvent) => this._labelEdit.onFocusOut(e)}
        @contextmenu=${this._onContextMenu}
        @dragover=${this._dropController.onDragOver}
        @dragleave=${this._dropController.onDragLeave}
        @drop=${this._dropController.onDrop}>
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
              (e) => renderEdge(e, this.doc, this._labelEdit.isEditing(e.id)),
            )}
            ${renderDrawEdgePreview(this._mode, this.doc)}
          </g>
          <g class="nodes">
            ${repeat(
              this.doc.nodes,
              (n) => n.id,
              (n) =>
                renderNode(
                  n,
                  this.pages.hasPage(n.id),
                  this._labelEdit.isEditing(n.id),
                ),
            )}
          </g>
          <g class="overlays">
            ${renderOverlay(
              this.selection,
              this.doc,
              this._zoomController.scale,
              this._anchorRendering(),
              this._mode.kind === "rectangle-select" ? this._mode.start : null,
            )}
          </g>
        </g>
      </svg>
      <ao-zoom-controls
        minZoom=${AoCanvas.MIN_ZOOM}
        maxZoom=${AoCanvas.MAX_ZOOM}
        .zoomLevel=${this._zoomController.scale}
        @zoom-in=${() => this._zoomController.zoomIn()}
        @zoom-out=${() => this._zoomController.zoomOut()}
        @center-view=${() =>
          this._zoomController.fitToContent([
            ...this.doc.nodes,
            ...this.doc.images,
          ])}>
      </ao-zoom-controls>
      ${this._dropController.imageCount === null
        ? nothing
        : html`<ao-drag-overlay .imageCount=${this._dropController.imageCount}>
          </ao-drag-overlay>`}`;
  }

  private _anchorRendering(): AnchorRendering {
    if (this._mode.kind === "reanchor-edge") {
      return { kind: "all", skipNodeId: this._mode.otherNodeId };
    }
    if (this._mode.kind === "draw-edge") {
      const source = this._mode.source;
      return { kind: "all", ...(source && { skipNodeId: source.nodeId }) };
    }
    if (this._hoveredAnchor) {
      return { kind: "single", ...this._hoveredAnchor };
    }
    return { kind: "none" };
  }

  private _isInteractiveTarget(target: EventTarget | null): boolean {
    return !!(target as Element | null)?.closest(INTERACTIVE_SELECTOR);
  }

  private _onTouchStartCapture = (e: TouchEvent): void => {
    if (this._isInteractiveTarget(e.target)) {
      e.stopPropagation();
    }
  };

  private _onMouseDownCapture = (e: MouseEvent): void => {
    if (e.button === 1) e.preventDefault();
  };

  insertPosition(): Point {
    return this._zoomController.viewportCenter();
  }

  startLabelEdit(id: Id): void {
    this._labelEdit.start(id);
  }

  cancelInteraction(): boolean {
    if (this._mode.kind === "idle") return false;
    this._resetMode();
    return true;
  }

  handleCopy(e: ClipboardEvent): void {
    copySelection(e, this);
  }

  handleCut(e: ClipboardEvent): void {
    if (!this.editable) return;
    cutSelection(e, this);
  }

  handlePaste(e: ClipboardEvent): void {
    if (!this.editable) return;
    pasteFromEvent(e, this._zoomController.viewportCenter(), this);
  }

  async runClipboardAction(action: ClipboardAction): Promise<void> {
    if (!this.editable) return;
    await performClipboardAction(
      action,
      this._zoomController.viewportCenter(),
      this,
    );
  }

  private _onPointerDown(e: PointerEvent): void {
    // Ignore clicks inside the label being edited, they are handled by the contenteditable div
    if ((e.target as Element).closest(`.${EDITOR_CLASS}`)) return;

    if (e.button !== 0) return; // ignore non-left clicks

    // In student mode, clicking on a node opens the page for that node instead of selecting it
    if (!this.editable) {
      const itemEl = (e.target as Element).closest<SVGElement>(
        "[data-item-id]",
      );
      const id = itemEl?.dataset["itemId"];
      if (id && this.doc.get(id)?.kind === "node") {
        this._openPage(id);
      }
      return;
    }

    if (this._mode.kind === "draw-edge") {
      handleDrawEdgeClick(e, this._mode, this._modeContext);
      return;
    }

    this._shiftKey = e.shiftKey;

    const target = e.target as Element;

    // Clicking or dragging from a hovered anchor point starts a new edge there.
    const anchorTarget = findAnchorTarget(target);
    if (anchorTarget) {
      beginDrawEdgeFromAnchor(anchorTarget, this._modeContext);
      const svg = e.currentTarget as SVGSVGElement;
      svg.focus({ preventScroll: true });
      svg.setPointerCapture(e.pointerId);
      return;
    }

    // A click on the badge opens the connected page, even in edit mode.
    const badgeEl = target.closest(".badge");
    if (badgeEl) {
      const nodeId =
        badgeEl.closest<SVGElement>("[data-item-id]")?.dataset["itemId"];
      if (nodeId) {
        e.preventDefault();
        this._openPage(nodeId);
        return;
      }
    }

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
        beginResize(e, resizeId, handle as ResizeHandle, this._modeContext);
      } else if (item.kind === "edge") {
        beginReanchor(
          e,
          resizeId,
          handle as "source" | "target",
          this._modeContext,
        );
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
      if (isDoubleClick && (item?.kind === "node" || item?.kind === "edge")) {
        // Suppress browser focus handling
        e.preventDefault();
        this._lastItemClick = null;
        this._labelEdit.start(id);
        return;
      }

      beginDrag(e, this._modeContext);
    } else {
      if (!additive) this.selection.clear();
      if (e.pointerType !== "touch") {
        beginRectangleSelect(e, this._modeContext);
      }
    }

    const svg = e.currentTarget as SVGSVGElement;
    svg.focus({ preventScroll: true });
    svg.setPointerCapture(e.pointerId);
  }

  beginDrawEdge(): void {
    startDrawEdgeMode(this._modeContext);
  }

  previewColor(preview: ColorPreview): void {
    applyColorPreviewDom(this.renderRoot, this.doc, preview);
  }

  private _onPointerMove(e: PointerEvent): void {
    if (!handlesPointerMove(this._mode) && !this._tracksAnchorHover()) return;

    this._pendingPointer = { x: e.clientX, y: e.clientY };
    this._shiftKey = e.shiftKey;

    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        const pointer = this._pendingPointer;
        if (!pointer) return;
        if (this._tracksAnchorHover()) {
          this._updateAnchorHover(pointer);
        } else {
          getHandlers(this._mode)?.onPointerMove?.(
            pointer,
            this._mode,
            this._modeContext,
          );
        }
      });
    }
  }

  private _tracksAnchorHover(): boolean {
    return (
      this.editable &&
      this._mode.kind === "idle" &&
      this.editingId === null &&
      this.selection.isEmpty()
    );
  }

  private _updateAnchorHover(pointer: Point): void {
    const scenePoint = this._zoomController.clientToScene(pointer.x, pointer.y);
    const nearest = findNearestAnchor(
      this.doc.nodes,
      scenePoint,
      Math.min(
        ANCHOR_HOVER_RADIUS / this._zoomController.scale,
        ANCHOR_HOVER_RADIUS,
      ),
    );
    const anchor = nearest
      ? { nodeId: nearest.nodeId, position: nearest.position }
      : null;

    if (
      anchor?.nodeId !== this._hoveredAnchor?.nodeId ||
      anchor?.position !== this._hoveredAnchor?.position
    ) {
      this._hoveredAnchor = anchor;
    }
  }

  private _onPointerUp(e?: PointerEvent): void {
    if (e) this._shiftKey = e.shiftKey;

    const handlers = getHandlers(this._mode);
    if (this._pendingPointer) {
      handlers?.onPointerUp?.(
        this._pendingPointer,
        this._mode,
        this._modeContext,
      );
    }

    if (!handlers?.persistOnPointerUp) this._resetMode();
  }

  private _resetMode(): void {
    getHandlers(this._mode)?.onCancel?.(this._mode, this._modeContext);
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._pendingPointer = null;
    if (this._mode.kind !== "idle") {
      this._mode = { kind: "idle" };
    }
  }

  private _openPage(pageId: Id): void {
    this.dispatchEvent(
      new CustomEvent("open-page", {
        detail: { pageId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onContextMenu(e: PointerEvent): void {
    if (!this.editable) return;
    if (this._mode.kind !== "idle") return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as Element;
    const itemEl = target.closest<SVGElement>("[data-item-id]");

    if (!itemEl) {
      this.selection.clear();
    } else if (!this.selection.has(itemEl.dataset["itemId"]!)) {
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
