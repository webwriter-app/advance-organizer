import { html, PropertyValues, TemplateResult } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, query, state } from "lit/decorators.js";
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
import { Id } from "../model/types";
import { AoPageEditActionsGroup } from "../components/ui/toolbar-groups/page-edit-actions";
import { PageController } from "../state/page";

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

  @state()
  accessor openPage: Id | null = null;

  @query("slot#page-slot")
  accessor pageSlot!: HTMLSlotElement;

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

    "ao-node-actions": AoNodeActionsGroup,
    "ao-page-actions": AoPageActionsGroup,
    "ao-page-edit-actions": AoPageEditActionsGroup,
  };

  static override styles = [styles, shoelaceTheme];

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
          ? html` <ao-node-actions></ao-node-actions>
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
