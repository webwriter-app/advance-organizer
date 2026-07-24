import { html, nothing, PropertyValues, TemplateResult } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { styles } from "./webwriter-advance-organizer.styles";

import { WwToolbar } from "../components/ui/toolbar";
import { WwContextMenu } from "../components/ui/context-menu";
import { AoCanvas } from "../components/canvas/canvas";

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
import { Edge, Id, Image, Node } from "../model/types";
import { AoPageEditActionsGroup } from "../components/ui/toolbar-groups/page-edit-actions";
import { PageController } from "../state/page";
import { AoCreateActionsGroup } from "../components/ui/toolbar-groups/create-actions";
import { AoEdgeActionsGroup } from "../components/ui/toolbar-groups/edge-actions";
import { ClipboardAction } from "../utils/clipboard";

/* Optional LOCALIZATION: Uncomment this after first running `npm run localize` in the command line.
import LOCALIZE from '../localization/generated'
import {msg} from '@lit/localize'
*/

@customElement("webwriter-advance-organizer")
export class WebwriterAdvanceOrganizer extends LitElementWw {
  @provide({
    context: documentContext,
  })
  accessor doc = new DocumentController(this);

  @provide({
    context: selectionContext,
  })
  accessor selection = new SelectionController(this, this.doc);

  @provide({
    context: pageContext,
  })
  accessor pages = new PageController(this, this.doc);

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

  @property({ type: Array, reflect: true })
  accessor images: Image[] = [];

  @state()
  private accessor _openPage: Id | null = null;

  @state()
  private accessor _contextMenu: { x: number; y: number } | null = null;

  @query("slot#page-slot")
  private accessor pageSlot!: HTMLSlotElement;

  @query("ao-canvas")
  private accessor canvas!: AoCanvas | null;

  /* Optional LOCALIZATION: Uncomment this after first running `npm run localize` in the command line.
  localize = LOCALIZE
  */

  static override shadowRootOptions: ShadowRootInit = {
    ...super.shadowRootOptions,
    slotAssignment: "manual" as const,
  };

  /** Register the classes of custom elements to use in the Shadow DOM here.
   * @example
   * import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js"
   * ...
   *   static scopedElements = {"sl-button": SlButton}
   **/
  static override scopedElements = {
    "ww-toolbar": WwToolbar,
    "ww-context-menu": WwContextMenu,
    "ao-canvas": AoCanvas,

    "ao-create-actions": AoCreateActionsGroup,
    "ao-node-actions": AoNodeActionsGroup,
    "ao-edge-actions": AoEdgeActionsGroup,
    "ao-page-actions": AoPageActionsGroup,
    "ao-page-edit-actions": AoPageEditActionsGroup,
  };

  static override styles = [styles, shoelaceTheme];

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
      if (this._openPage !== null && this.pageSlot) {
        const page = this.pages.getPage(this._openPage);
        if (page) {
          this.pageSlot.assign(page);
        }
      }
    }
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

    return html`<ww-toolbar>
      ${this._openPage === null
        ? html`<ao-create-actions
              @start-draw-edge=${() =>
                this.canvas?.beginDrawEdge()}></ao-create-actions>
            <div class="spacer"></div>
            <ao-node-actions></ao-node-actions>
            <ao-edge-actions></ao-edge-actions>
            <ao-page-actions
              @open-page=${(e: CustomEvent<{ pageId: Id | null }>) =>
                this._openPageForNode(e.detail.pageId)}></ao-page-actions>`
        : html`<ao-page-edit-actions
            .openPageId=${this._openPage}
            @close-page=${() => {
              this._openPage = null;
            }}></ao-page-edit-actions>`}
    </ww-toolbar>`;
  }

  protected override render(): TemplateResult {
    return html`<div class="root${this.isContentEditable ? "" : " reading"}">
      ${this._renderToolbar()}
      ${this._openPage === null
        ? html`<ao-canvas
            .editable=${this.isContentEditable}
            @open-page=${(e: CustomEvent<{ pageId: Id | null }>) =>
              this._openPageForNode(e.detail.pageId)}
            @open-context-menu=${(e: CustomEvent<{ x: number; y: number }>) => {
              const rect = this.getBoundingClientRect();
              this._contextMenu = {
                x: e.detail.x - rect.left,
                y: e.detail.y - rect.top,
              };
            }}></ao-canvas>
          ${this._contextMenu
            ? html`<div
                class="context-menu-backdrop"
                @pointerdown=${() => {
                  this._contextMenu = null;
                }}
                @contextmenu=${(e: Event) => e.preventDefault()}>
                <ww-context-menu
                  style=${`left: ${this._contextMenu.x}px; top: ${this._contextMenu.y}px;`}
                  @pointerdown=${(e: Event) => e.stopPropagation()}
                  @clipboard-action=${(
                    e: CustomEvent<{ action: ClipboardAction }>,
                  ) => {
                    void this.canvas?.runClipboardAction(e.detail.action);
                  }}
                  @close-context-menu=${() => {
                    this._contextMenu = null;
                  }}></ww-context-menu>
              </div>`
            : nothing}`
      : html`<div class="page-container">
          <slot id="page-slot"></slot>
        </div>`}
    </div>`;
  }
}
