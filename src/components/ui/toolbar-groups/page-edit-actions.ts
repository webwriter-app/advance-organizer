import { LitElementWw } from "@webwriter/lit";
import { css, html, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { actionsStyles } from "./toolbar-actions.styles";
import { localized, msg } from "@lit/localize";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconDelete from "@tabler/icons/outline/trash.svg";

@localized()
export class AoPageEditActionsGroup extends LitElementWw {
  static override scopedElements = {
    "sl-button": SlButton,
    "sl-button-group": SlButtonGroup,
    "sl-dialog": SlDialog,
    "sl-icon": SlIcon,
    "sl-tooltip": SlTooltip,
  };

  static override styles = [
    actionsStyles,
    css`
      sl-dialog::part(base),
      sl-dialog::part(overlay) {
        position: absolute;
      }
    `,
  ];

  @state()
  private accessor _confirmOpen = false;

  protected override render(): TemplateResult {
    return html`<sl-button-group label=${msg("Page actions")}>
        <sl-tooltip content=${msg("Delete page")}>
          <sl-button size="small" @click=${this._handleDeletePageClick}>
            <sl-icon label=${msg("Delete page")} src=${iconDelete}></sl-icon>
          </sl-button>
        </sl-tooltip>
      </sl-button-group>
      <sl-dialog
        label=${msg("Delete page")}
        ?open=${this._confirmOpen}
        @sl-hide=${this._handleCancel}>
        ${msg("Are you sure you want to delete this page?")}
        <sl-button slot="footer" autofocus @click=${this._handleCancel}>
          ${msg("Cancel")}
        </sl-button>
        <sl-button slot="footer" variant="danger" @click=${this._handleConfirm}>
          ${msg("Delete")}
        </sl-button>
      </sl-dialog>`;
  }

  private _handleDeletePageClick = (): void => {
    this._confirmOpen = true;
  };

  private _handleCancel = (): void => {
    this._confirmOpen = false;
  };

  private _handleConfirm = (): void => {
    this._confirmOpen = false;
    this.dispatchEvent(
      new CustomEvent("delete-page", {
        bubbles: true,
        composed: true,
      }),
    );
  };
}
