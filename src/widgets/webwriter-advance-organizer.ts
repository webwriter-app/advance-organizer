import { html, nothing, PropertyValues, TemplateResult } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { styles } from "./webwriter-advance-organizer.styles";

import { WwToolbar } from "../components/ui/toolbar";
import { WwContextMenu } from "../components/ui/context-menu";
import { AoCanvas } from "../components/canvas/canvas";
import { labelStyles } from "../components/canvas/canvas.styles";

import shoelaceTheme from "@shoelace-style/shoelace/dist/themes/light.styles.js";
import { AoNodeActionsGroup } from "../components/ui/toolbar-groups/node-actions";
import { AoPageActionsGroup } from "../components/ui/toolbar-groups/page-actions";
import { provide } from "@lit/context";
import {
  documentContext,
  pageContext,
  selectionContext,
} from "../state/contexts";
import { DocumentController } from "../state/document";
import { SelectionController } from "../state/selection";
import { ColorPreview, Edge, Id, Image, Node } from "../model/types";
import { AoPageEditActionsGroup } from "../components/ui/toolbar-groups/page-edit-actions";
import { AoPageInfoActionsGroup } from "../components/ui/toolbar-groups/page-info-actions";
import { PageController } from "../state/page";
import { KeyboardController } from "../state/keyboard";
import { insertNode, pickAndInsertImages } from "../components/canvas/insert";
import { AoCreateActionsGroup } from "../components/ui/toolbar-groups/create-actions";
import { AoEdgeActionsGroup } from "../components/ui/toolbar-groups/edge-actions";
import { ClipboardAction } from "../utils/clipboard";
import { AoImageActionsGroup } from "../components/ui/toolbar-groups/image-actions";
import {
  getPrintEntries,
  renderPages,
  renderPrintOrganizer,
} from "../components/print/print";
import { AoTextActionsGroup } from "../components/ui/toolbar-groups/text-actions";

// @ts-ignore
import LOCALIZE from "../../localization/generated";
import { localized } from "@lit/localize";

/**
 * A visual advance organizer: a canvas of labeled boxes, connecting arrows and images
 * that gives learners an overview of a topic before they study it in detail.
 *
 * @slot - The pages of the advance organizer, as `<webwriter-advance-organizer-page>` elements.
 */
@localized()
@customElement("webwriter-advance-organizer")
export class WebwriterAdvanceOrganizer extends LitElementWw {
  /** @internal */
  @provide({
    context: documentContext,
  })
  accessor doc = new DocumentController(this);

  /** @internal */
  @provide({
    context: selectionContext,
  })
  accessor selection = new SelectionController(this, this.doc);

  /** @internal */
  @provide({
    context: pageContext,
  })
  accessor pages = new PageController(this, this.doc);

  /**
   * The nodes of the advance organizer. Each node has an `id` that edges refer to and that
   * links it to a page of the same `id`, a `position` and `dimension` in canvas coordinates,
   * a `label` and a `style`.
   */
  @property({ type: Array, reflect: true })
  accessor nodes: Node[] = [
    {
      id: "1",
      label: { text: "Node 1" },
      position: { x: 500, y: 300 },
      dimension: { width: 100, height: 300 },
      style: {
        shape: "diamond",
        fill: "lightblue",
        stroke: "blue",
        strokeWidth: 2,
        strokeStyle: "dotted",
      },
      kind: "node",
    },
    {
      id: "2",
      label: { text: "Node 2" },
      position: { x: 200, y: 200 },
      dimension: { width: 100, height: 100 },
      style: {
        shape: "ellipse",
        fill: "lightgreen",
        stroke: "green",
        strokeWidth: 2,
        strokeStyle: "dashed",
      },
      kind: "node",
    },
    {
      id: "3",
      label: { text: "Node 3" },
      position: { x: 250, y: 400 },
      dimension: { width: 200, height: 100 },
      style: {
        shape: "rectangle",
        fill: "lightcoral",
        stroke: "red",
        strokeWidth: 2,
      },
      kind: "node",
    },
  ];

  /**
   * The edges of the advance organizer. Each edge refers to its `source` and `target`
   * node by `id`, anchored at a fixed side of the node (`sourcePosition`/`targetPosition`),
   * and can carry a `label` and a `style` including arrow heads at either end.
   */
  @property({ type: Array, reflect: true })
  accessor edges: Edge[] = [
    {
      id: "e1",
      kind: "edge",
      source: "1",
      target: "2",
      sourcePosition: "left",
      targetPosition: "right",
      style: {
        stroke: "purple",
        strokeWidth: 2,
        strokeStyle: "dashed",
        markerStart: "arrow",
        markerEnd: "arrow",
      },
      label: {
        text: "connects to",
        bold: true,
      },
    },
    {
      id: "e2",
      kind: "edge",
      source: "1",
      target: "3",
      sourcePosition: "bottom",
      targetPosition: "right",
      style: {
        stroke: "orange",
        strokeWidth: 3,
        strokeStyle: "dotted",
        markerEnd: "arrow",
      },
      label: {
        text: "leads to",
        italic: true,
      },
    },
    {
      id: "e3",
      kind: "edge",
      source: "2",
      target: "3",
      sourcePosition: "bottom",
      targetPosition: "top",
      style: {
        stroke: "teal",
        strokeWidth: 1,
        markerEnd: "arrow",
      },
      label: {
        text: "points to",
        underline: true,
      },
    },
  ];

  /**
   * The images placed on the canvas. Each image has a `position` and `dimension` in canvas
   * coordinates and a `src` stored as a data URL.
   */
  @property({ type: Array, reflect: true })
  accessor images: Image[] = [];

  @state()
  private accessor _openPage: Id | null = null;

  @state()
  private accessor _contextMenu: { x: number; y: number } | null = null;

  @state()
  private accessor _drawingEdge = false;

  @query("ao-canvas")
  private accessor canvas!: AoCanvas | null;

  protected override localize = LOCALIZE;

  constructor() {
    super();
    new KeyboardController(this);
  }

  /** @internal */
  static override shadowRootOptions: ShadowRootInit = {
    ...super.shadowRootOptions,
    slotAssignment: "manual" as const,
  };

  /**
   * Register the classes of custom elements to use in the Shadow DOM here.
   * @internal
   */
  static override scopedElements = {
    "ww-toolbar": WwToolbar,
    "ww-context-menu": WwContextMenu,
    "ao-canvas": AoCanvas,

    "ao-create-actions": AoCreateActionsGroup,
    "ao-node-actions": AoNodeActionsGroup,
    "ao-edge-actions": AoEdgeActionsGroup,
    "ao-image-actions": AoImageActionsGroup,
    "ao-text-actions": AoTextActionsGroup,
    "ao-page-actions": AoPageActionsGroup,
    "ao-page-info-actions": AoPageInfoActionsGroup,
    "ao-page-edit-actions": AoPageEditActionsGroup,
  };

  static override styles = [styles, labelStyles, shoelaceTheme];

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("tabindex", "-1");
    this.addEventListener("focusout", this._onFocusOut);
    this.addEventListener("copy", this._onCopy);
    this.addEventListener("cut", this._onCut);
    this.addEventListener("paste", this._onPaste);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("focusout", this._onFocusOut);
    this.removeEventListener("copy", this._onCopy);
    this.removeEventListener("cut", this._onCut);
    this.removeEventListener("paste", this._onPaste);
  }

  private _onFocusOut = (): void => {
    queueMicrotask(() => {
      if (!this.isConnected || this.selection.isEmpty()) return;
      if (!document.hasFocus()) return;
      const active = document.activeElement;
      if (active === this || this.contains(active)) return;
      this.selection.clear();
    });
  };

  private _canvasTarget(e: Event): AoCanvas | null {
    if (this._openPage !== null) return null;
    const path = e.composedPath();
    const hostIndex = path.indexOf(this);
    const inner = hostIndex === -1 ? path : path.slice(0, hostIndex);
    if (inner.some(isEditableTarget)) return null;
    return this.canvas;
  }

  /** @internal */
  keyboardTarget(e: KeyboardEvent): AoCanvas | null {
    const canvas = this._canvasTarget(e);
    if (!canvas) return null;
    const path = e.composedPath();
    return path[0] === this || path.includes(canvas) ? canvas : null;
  }

  private _onCopy = (e: ClipboardEvent): void => {
    this._canvasTarget(e)?.handleCopy(e);
  };

  private _onCut = (e: ClipboardEvent): void => {
    this._canvasTarget(e)?.handleCut(e);
  };

  private _onPaste = (e: ClipboardEvent): void => {
    this._canvasTarget(e)?.handlePaste(e);
  };

  private _insertNode = (): void => {
    if (!this.canvas) return;
    insertNode(this.canvas.insertPosition(), this.canvas);
  };

  private _insertImage = (): void => {
    if (!this.canvas) return;
    void pickAndInsertImages(this.canvas.insertPosition(), this.canvas);
  };

  protected override firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.doc.subscribe(() => {
      this.nodes = this.doc.nodes;
      this.edges = this.doc.edges;
      this.images = this.doc.images;
    });
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("_openPage") && this._openPage !== null) {
      this._drawingEdge = false;
    }
    if (
      changedProperties.has("nodes") ||
      changedProperties.has("edges") ||
      changedProperties.has("images")
    ) {
      // TODO: Check if this check is really necessary or if we can always call load
      if (
        JSON.stringify(this.nodes) !== JSON.stringify(this.doc.nodes) ||
        JSON.stringify(this.edges) !== JSON.stringify(this.doc.edges) ||
        JSON.stringify(this.images) !== JSON.stringify(this.doc.images)
      ) {
        this.doc.load(this.nodes, this.edges, this.images);
      }
    }
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("_openPage")) {
      const prevPage = changedProperties.get("_openPage") as Id | null;
      if (prevPage !== null) {
        const closedPage = this.pages.getPage(prevPage);
        closedPage
          ?.querySelectorAll<HTMLMediaElement>("audio, video")
          .forEach((m) => m.pause());
      }
    }
    this._assignPages();
  }

  private _assignPages(): void {
    const slots =
      this.renderRoot.querySelectorAll<HTMLSlotElement>("slot[data-page]");
    for (const slot of slots) {
      const page = this.pages.getPage(slot.dataset["page"]!);
      if (page && slot.assignedElements()[0] !== page) {
        slot.assign(page);
      }
    }
  }

  private _closeContextMenu(): void {
    this.focus({ preventScroll: true });
    this._contextMenu = null;
  }

  private _openPageForNode(pageId: Id | null): void {
    if (pageId === null) {
      return;
    }
    if (!this.pages.hasPage(pageId)) {
      if (!this.isContentEditable) {
        return;
      }
      this.pages.addPage(pageId);
    }
    this._openPage = pageId;
  }

  private _renderToolbar(): TemplateResult | typeof nothing {
    if (this._openPage === null && !this.isContentEditable) {
      return nothing;
    }

    return html`<ww-toolbar
      @preview-color=${(e: CustomEvent<ColorPreview>) =>
        this.canvas?.previewColor(e.detail)}>
      ${this._openPage === null
        ? html`<ao-create-actions
              .drawingEdge=${this._drawingEdge}
              @toggle-draw-edge=${() => this.canvas?.toggleDrawEdge()}
              @add-node=${this._insertNode}
              @add-image=${this._insertImage}></ao-create-actions>
            <div class="spacer"></div>
            ${AoNodeActionsGroup.isApplicable(this.doc, this.selection)
              ? html`<ao-node-actions></ao-node-actions>`
              : nothing}
            ${AoEdgeActionsGroup.isApplicable(this.doc, this.selection)
              ? html`<ao-edge-actions></ao-edge-actions>`
              : nothing}
            ${AoImageActionsGroup.isApplicable(this.doc, this.selection)
              ? html`<ao-image-actions></ao-image-actions>`
              : nothing}
            ${AoTextActionsGroup.isApplicable(this.doc, this.selection)
              ? html`<ao-text-actions></ao-text-actions>`
              : nothing}
            ${AoPageActionsGroup.isApplicable(this.doc, this.selection)
              ? html`<ao-page-actions
                  @open-page=${(e: CustomEvent<{ pageId: Id | null }>) =>
                    this._openPageForNode(e.detail.pageId)}></ao-page-actions>`
              : nothing}`
        : html`<ao-page-info-actions
              .openPageId=${this._openPage}
              @close-page=${() => {
                this._openPage = null;
              }}></ao-page-info-actions>
            <div class="spacer"></div>
            ${this.isContentEditable
              ? html`<ao-page-edit-actions
                  @delete-page=${() => {
                    if (this._openPage !== null) {
                      this.pages.removePage(this._openPage);
                      this._openPage = null;
                    }
                  }}></ao-page-edit-actions>`
              : nothing}`}
    </ww-toolbar>`;
  }

  protected override render(): TemplateResult {
    const printEntries = getPrintEntries(this.doc, this.pages);
    return html`<div class="root${this.isContentEditable ? "" : " reading"}">
      ${this._renderToolbar()}
      ${this._openPage === null
        ? html`<ao-canvas
              .editable=${this.isContentEditable}
              @draw-edge-change=${(e: CustomEvent<{ active: boolean }>) => {
                this._drawingEdge = e.detail.active;
              }}
              @open-page=${(e: CustomEvent<{ pageId: Id | null }>) =>
                this._openPageForNode(e.detail.pageId)}
              @open-context-menu=${(
                e: CustomEvent<{ x: number; y: number }>,
              ) => {
                const rect = this.getBoundingClientRect();
                this._contextMenu = {
                  x: e.detail.x - rect.left,
                  y: e.detail.y - rect.top,
                };
              }}></ao-canvas>
            ${this._contextMenu
              ? html`<ww-context-menu
                  .x=${this._contextMenu.x}
                  .y=${this._contextMenu.y}
                  @clipboard-action=${(
                    e: CustomEvent<{ action: ClipboardAction }>,
                  ) => {
                    this.canvas?.runClipboardAction(e.detail.action);
                  }}
                  @close-context-menu=${() =>
                    this._closeContextMenu()}></ww-context-menu>`
              : nothing}`
        : nothing}
      ${renderPrintOrganizer(this.doc, printEntries)}
      ${renderPages(printEntries, this._openPage)}
    </div>`;
  }
}

function isEditableTarget(target: EventTarget): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
