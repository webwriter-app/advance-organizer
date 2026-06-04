import { html, PropertyValues, TemplateResult } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { styles } from "./webwriter-advance-organizer.styles";

import { WwToolbar } from "../components/ui/toolbar";
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
import { Edge, Id, Node } from "../model/types";
import { AoPageEditActionsGroup } from "../components/ui/toolbar-groups/page-edit-actions";
import { PageController } from "../state/page";
import { AoCreateActionsGroup } from "../components/ui/toolbar-groups/create-actions";
import { AoEdgeActionsGroup } from "../components/ui/toolbar-groups/edge-actions";

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
    },
  ];

  @state()
  private accessor openPage: Id | null = null;

  @query("slot#page-slot")
  private accessor pageSlot!: HTMLSlotElement;

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
    });
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("nodes") || changedProperties.has("edges")) {
      // TODO: Check if this check is really necessary or if we can always call load
      if (
        JSON.stringify(this.nodes) !== JSON.stringify(this.doc.nodes) ||
        JSON.stringify(this.edges) !== JSON.stringify(this.doc.edges)
      ) {
        this.doc.load(this.nodes, this.edges);
      }
    }
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("openPage")) {
      const prevPage = changedProperties.get("openPage") as Id | null;
      if (prevPage !== null) {
        const closedPage = this.pages.getPage(prevPage);
        closedPage
          ?.querySelectorAll<HTMLMediaElement>("audio, video")
          .forEach((m) => m.pause());
      }
      if (this.openPage !== null && this.pageSlot) {
        const page = this.pages.getPage(this.openPage);
        if (page) {
          this.pageSlot.assign(page);
        }
      }
    }
  }

  protected override render(): TemplateResult {
    return html`<ww-toolbar>
        ${this.openPage === null
          ? html`<ao-create-actions></ao-create-actions>
              <div class="spacer"></div>
              <ao-node-actions></ao-node-actions>
              <ao-edge-actions></ao-edge-actions>
              <ao-page-actions
                @open-page=${(e: CustomEvent<{ pageId: Id | null }>) => {
                  const pageToOpen = e.detail.pageId;
                  if (pageToOpen === null) {
                    return;
                  }
                  if (!this.pages.hasPage(pageToOpen)) {
                    this.pages.addPage(pageToOpen);
                  }
                  this.openPage = pageToOpen;
                }}></ao-page-actions>`
          : html`<ao-page-edit-actions
              .openPageId=${this.openPage}
              @close-page=${() => {
                this.openPage = null;
              }}></ao-page-edit-actions>`}
      </ww-toolbar>
      ${this.openPage === null
        ? html`<ao-canvas></ao-canvas>`
        : html`<div class="page-container">
            <slot id="page-slot"></slot>
          </div>`}`;
  }
}
