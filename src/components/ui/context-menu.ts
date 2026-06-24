import { LitElementWw } from "@webwriter/lit";
import { contextMenuStyles } from "./context-menu.styles";
import { html, PropertyValues, type TemplateResult } from "lit";

import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component.js";
import SlMenuItem from "@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js";
import { consume } from "@lit/context";
import {
  documentContext,
  pageContext,
  selectionContext,
} from "../../state/contexts";
import { DocumentController } from "../../state/document";
import { SelectionController } from "../../state/selection";
import { PageController } from "../../state/page";
import { SubscribeController } from "../../state/subscribe";

export class WwContextMenu extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  @consume({ context: pageContext })
  accessor pages!: PageController;

  static override scopedElements = {
    "sl-menu": SlMenu,
    "sl-menu-item": SlMenuItem,
  };

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
  }

  static override styles = contextMenuStyles;

  protected override render(): TemplateResult {
    return html`
      <sl-menu @sl-select=${this._handleMenuSelect}>
        <sl-menu-item id="duplicate">Duplicate</sl-menu-item>
        <sl-menu-item id="delete">Delete</sl-menu-item>
      </sl-menu>
    `;
  }

  private _handleMenuSelect(event: CustomEvent): void {
    const menuItem = event.detail.item as SlMenuItem;
    const action = menuItem.id;

    if (action === "duplicate") {
      this._handleDuplicate();
    } else if (action === "delete") {
      this._handleDelete();
    }

    this.dispatchEvent(
      new CustomEvent("close-context-menu", { bubbles: true, composed: true }),
    );
  }

  private _handleDuplicate(): void {
    const selectedIds = this.selection.entries;
    const { newIds, nodeIdMap } = this.doc.duplicateItems(selectedIds);

    for (const [oldNodeId, newNodeId] of nodeIdMap) {
      this.pages.duplicatePage(oldNodeId, newNodeId);
    }

    this.selection.select(newIds);
  }

  private _handleDelete(): void {
    const selectedIds = this.selection.entries;
    this.doc.removeItems(selectedIds);
  }
}
