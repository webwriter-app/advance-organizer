import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { html, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconArrowLeft from "@tabler/icons/outline/arrow-left.svg";
import { property } from "lit/decorators.js";
import { Id } from "../../../model/types";

export class AoPageEditActionsGroup extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @property({ type: String })
  accessor openPageId: Id | null = null;

  static override scopedElements = {
    "sl-button": SlButton,
    "sl-button-group": SlButtonGroup,
    "sl-icon": SlIcon,
    "sl-tooltip": SlTooltip,
  };

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
  }

  static override styles = actionsStyles;

  protected override render(): TemplateResult {
    if (!this.doc) {
      return html``;
    }

    return html`<sl-button-group label="Go back">
        <sl-tooltip content="Go back">
          <sl-button @click=${this._handleClosePageClick}>
            <sl-icon src=${iconArrowLeft}></sl-icon>
          </sl-button>
        </sl-tooltip>
      </sl-button-group>
      <p>
        ${this.doc && this.openPageId !== null
          ? this.doc.get(this.openPageId)?.label?.text
          : null}
      </p>`;
  }

  private _handleClosePageClick(): void {
    this.dispatchEvent(
      new CustomEvent("close-page", {
        bubbles: true,
        composed: true,
      }),
    );
  }
}
