import { LitElementWw } from "@webwriter/lit";
import { contextMenuStyles } from "./context-menu.styles";
import { html, PropertyValues, type TemplateResult } from "lit";

import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component.js";
import SlMenuItem from "@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js";
import SlDivider from "@shoelace-style/shoelace/dist/components/divider/divider.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
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
import { ClipboardAction } from "../../utils/clipboard";

import iconCut from "@tabler/icons/outline/cut.svg";
import iconCopy from "@tabler/icons/outline/copy.svg";
import iconPaste from "@tabler/icons/outline/clipboard.svg";
import iconDuplicate from "@tabler/icons/outline/copy-plus.svg";
import iconDelete from "@tabler/icons/outline/trash.svg";

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
    "sl-divider": SlDivider,
    "sl-icon": SlIcon,
  };

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
  }

  static override styles = contextMenuStyles;

  protected override render(): TemplateResult {
    return html`
      <sl-menu @sl-select=${this._handleMenuSelect}>
        <sl-menu-item id="cut" ?disabled=${this.selection.isEmpty()}>
          <sl-icon slot="prefix" .src=${iconCut}></sl-icon>
          Cut
        </sl-menu-item>
        <sl-menu-item id="copy" ?disabled=${this.selection.isEmpty()}>
          <sl-icon slot="prefix" .src=${iconCopy}></sl-icon>
          Copy
        </sl-menu-item>
        <sl-menu-item id="paste">
          <sl-icon slot="prefix" .src=${iconPaste}></sl-icon>
          Paste
        </sl-menu-item>
        <sl-divider></sl-divider>
        <sl-menu-item id="duplicate" ?disabled=${this.selection.isEmpty()}>
          <sl-icon slot="prefix" .src=${iconDuplicate}></sl-icon>
          Duplicate
        </sl-menu-item>
        <sl-menu-item id="delete" ?disabled=${this.selection.isEmpty()}>
          <sl-icon slot="prefix" .src=${iconDelete}></sl-icon>
          Delete
        </sl-menu-item>
      </sl-menu>
    `;
  }

  private _handleMenuSelect(event: CustomEvent): void {
    const menuItem = event.detail.item as SlMenuItem;
    const action = menuItem.id;

    if (action === "cut" || action === "copy" || action === "paste") {
      this._handleClipboardAction(action);
    } else if (action === "duplicate") {
      this._handleDuplicate();
    } else if (action === "delete") {
      this._handleDelete();
    }

    this.dispatchEvent(
      new CustomEvent("close-context-menu", { bubbles: true, composed: true }),
    );
  }

  private _handleClipboardAction(action: ClipboardAction): void {
    this.dispatchEvent(
      new CustomEvent<{ action: ClipboardAction }>("clipboard-action", {
        detail: { action },
        bubbles: true,
        composed: true,
      }),
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
    this.doc.removeItems(new Set(this.selection.entries));
  }
}
