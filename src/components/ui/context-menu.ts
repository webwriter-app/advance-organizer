import { LitElementWw } from "@webwriter/lit";
import { contextMenuStyles } from "./context-menu.styles";
import { html, PropertyValues, type TemplateResult } from "lit";
import { property, query } from "lit/decorators.js";

import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component.js";
import SlMenuItem from "@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js";
import SlDivider from "@shoelace-style/shoelace/dist/components/divider/divider.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlPopup from "@shoelace-style/shoelace/dist/components/popup/popup.component.js";
import type { VirtualElement } from "@shoelace-style/shoelace/dist/components/popup/popup.component.js";
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
import { MOD_LABEL } from "../../state/keyboard";
import { duplicateSelection } from "../canvas/insert";

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

  @property({ type: Number })
  accessor x = 0;

  @property({ type: Number })
  accessor y = 0;

  @query("sl-popup")
  private accessor _popup!: SlPopup | null;

  private _anchor: VirtualElement = {
    getBoundingClientRect: () => {
      const { left, top } = this.getBoundingClientRect();
      return new DOMRect(left + this.x, top + this.y, 0, 0);
    },
    contextElement: this,
  };

  static override scopedElements = {
    "sl-popup": SlPopup,
    "sl-menu": SlMenu,
    "sl-menu-item": SlMenuItem,
    "sl-divider": SlDivider,
    "sl-icon": SlIcon,
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("pointerdown", this._onBackdropPointerDown);
    this.addEventListener("contextmenu", this._onBackdropContextMenu);
    this.addEventListener("keydown", this._onKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("pointerdown", this._onBackdropPointerDown);
    this.removeEventListener("contextmenu", this._onBackdropContextMenu);
    this.removeEventListener("keydown", this._onKeydown);
  }

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
    this._focusFirstItem();
  }

  private async _focusFirstItem(): Promise<void> {
    const menu = this.renderRoot.querySelector<SlMenu>("sl-menu");
    if (!menu) return;
    await menu.updateComplete;

    const items = [
      ...this.renderRoot.querySelectorAll<SlMenuItem>("sl-menu-item"),
    ];
    const item = items.find((candidate) => !candidate.disabled);
    if (!item) return;

    menu.setCurrentItem(item);
    item.focus({ preventScroll: true });
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("x") || changedProperties.has("y")) {
      this._popup?.reposition();
    }
  }

  static override styles = contextMenuStyles;

  protected override render(): TemplateResult {
    return html`
      <sl-popup
        active
        placement="bottom-start"
        flip
        flip-fallback-placements="bottom-end top-start top-end"
        shift
        shift-padding="4"
        auto-size="vertical"
        auto-size-padding="4"
        .anchor=${this._anchor}
        @pointerdown=${(e: Event) => e.stopPropagation()}>
        <sl-menu @sl-select=${this._handleMenuSelect}>
          <sl-menu-item id="cut" ?disabled=${this.selection.isEmpty()}>
            <sl-icon slot="prefix" .src=${iconCut}></sl-icon>
            Cut
            <span slot="suffix" class="shortcut">${MOD_LABEL}+X</span>
          </sl-menu-item>
          <sl-menu-item id="copy" ?disabled=${this.selection.isEmpty()}>
            <sl-icon slot="prefix" .src=${iconCopy}></sl-icon>
            Copy
            <span slot="suffix" class="shortcut">${MOD_LABEL}+C</span>
          </sl-menu-item>
          <sl-menu-item id="paste">
            <sl-icon slot="prefix" .src=${iconPaste}></sl-icon>
            Paste
            <span slot="suffix" class="shortcut">${MOD_LABEL}+V</span>
          </sl-menu-item>
          <sl-divider></sl-divider>
          <sl-menu-item id="duplicate" ?disabled=${this.selection.isEmpty()}>
            <sl-icon slot="prefix" .src=${iconDuplicate}></sl-icon>
            Duplicate
            <span slot="suffix" class="shortcut">${MOD_LABEL}+D</span>
          </sl-menu-item>
          <sl-menu-item id="delete" ?disabled=${this.selection.isEmpty()}>
            <sl-icon slot="prefix" .src=${iconDelete}></sl-icon>
            Delete
            <span slot="suffix" class="shortcut">Del</span>
          </sl-menu-item>
        </sl-menu>
      </sl-popup>
    `;
  }

  private _onBackdropPointerDown = (): void => {
    this._close();
  };

  private _onBackdropContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    this._close();
  };

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

    this._close();
  }

  private _close(): void {
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
    duplicateSelection(this);
  }

  private _handleDelete(): void {
    this.doc.removeItems(new Set(this.selection.entries));
  }
}
