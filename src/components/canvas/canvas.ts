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
import { Id, Point, ResizeHandle } from "../../model/types";
import { state } from "lit/decorators.js";
import { INTERACTIVE_SELECTOR } from "./helper";
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
  handleDrawEdgeClick,
  renderDrawEdgePreview,
} from "./modes/draw-edge";
import { SnapHighlighter } from "./snap";

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

  @state()
  private accessor _mode: InteractionMode = { kind: "idle" };

  @state()
  private accessor _editingId: Id | null = null;

  get editingId(): Id | null {
    return this._editingId;
  }

  private _rafId: number | null = null;
  private _pendingPointer: Point | null = null;
  private _editFocusPending: boolean = false;
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

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);

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
        @keydown=${this._onEditKeydown}
        @focusout=${this._onEditFocusOut}
        @contextmenu=${this._onContextMenu}
        @dragover=${this._dropController.onDragOver}
        @dragleave=${this._dropController.onDragLeave}
        @drop=${this._dropController.onDrop}
        @copy=${this._onCopy}
        @cut=${this._onCut}
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
            ${renderDrawEdgePreview(this._mode, this.doc)}
          </g>
          <g class="nodes">
            ${repeat(
              this.doc.nodes,
              (n) => n.id,
              (n) => renderNode(n, this._editingId === n.id),
            )}
          </g>
          <g class="overlays">
            ${renderOverlay(
              this.selection,
              this.doc,
              this._zoomController.scale,
              {
                active:
                  this._mode.kind === "reanchor-edge" ||
                  this._mode.kind === "draw-edge",
                skipNodeId:
                  this._mode.kind === "reanchor-edge"
                    ? this._mode.otherNodeId
                    : this._mode.kind === "draw-edge"
                      ? (this._mode.source?.nodeId ?? undefined)
                      : undefined,
              },
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

  private _onCopy(e: ClipboardEvent): void {
    copySelection(e, this);
  }

  private _onCut(e: ClipboardEvent): void {
    cutSelection(e, this);
  }

  private _onPaste(e: ClipboardEvent): void {
    pasteFromEvent(e, this._zoomController.viewportCenter(), this);
  }

  async runClipboardAction(action: ClipboardAction): Promise<void> {
    await performClipboardAction(
      action,
      this._zoomController.viewportCenter(),
      this,
    );
  }

  private _onPointerDown(e: PointerEvent): void {
    // Ignore clicks inside the label being edited, they are handled by the contenteditable div
    if ((e.target as Element).closest(".label-editor")) return;

    if (e.button !== 0) return; // ignore non-left clicks

    if (this._mode.kind === "draw-edge") {
      handleDrawEdgeClick(e, this._mode, this._modeContext);
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

  private _onPointerMove(e: PointerEvent): void {
    if (!handlesPointerMove(this._mode)) return;

    this._pendingPointer = { x: e.clientX, y: e.clientY };
    this._shiftKey = e.shiftKey;

    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (!this._pendingPointer) return;
        getHandlers(this._mode)?.onPointerMove?.(
          this._pendingPointer,
          this._mode,
          this._modeContext,
        );
      });
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
