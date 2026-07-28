import { LitElementWw } from "@webwriter/lit";
import { html, type TemplateResult } from "lit";
import { actionsStyles } from "./toolbar-actions.styles";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconDelete from "@tabler/icons/outline/trash.svg";

export class AoPageEditActionsGroup extends LitElementWw {
  static override scopedElements = {
    "sl-button": SlButton,
    "sl-button-group": SlButtonGroup,
    "sl-icon": SlIcon,
    "sl-tooltip": SlTooltip,
  };

  static override styles = actionsStyles;

  protected override render(): TemplateResult {
    return html`<sl-button-group label="Page actions">
      <sl-tooltip content="Delete page">
        <sl-button size="small" @click=${this._handleDeletePageClick}>
          <sl-icon src=${iconDelete}></sl-icon>
        </sl-button>
      </sl-tooltip>
    </sl-button-group>`;
  }

  private _handleDeletePageClick(): void {
    this.dispatchEvent(
      new CustomEvent("delete-page", {
        bubbles: true,
        composed: true,
      }),
    );
  }
}
