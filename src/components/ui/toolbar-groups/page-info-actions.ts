import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { css, html, nothing, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { property } from "lit/decorators.js";
import { Id } from "../../../model/types";
import { localized, msg } from "@lit/localize";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconArrowLeft from "@tabler/icons/outline/arrow-left.svg";

@localized()
export class AoPageInfoActionsGroup extends LitElementWw {
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

  static override styles = [
    actionsStyles,
    css`
      :host {
        min-width: 0;
      }
    `,
  ];

  protected override render(): TemplateResult | typeof nothing {
    if (!this.doc) {
      return nothing;
    }

    const node = this.openPageId ? this.doc.get(this.openPageId) : null;
    const label = node?.kind === "node" ? node.label.text : null;

    return html`<sl-button-group label=${msg("Go back")}>
        <sl-tooltip content=${msg("Go back")}>
          <sl-button size="small" @click=${this._handleClosePageClick}>
            <sl-icon label=${msg("Go back")} src=${iconArrowLeft}></sl-icon>
          </sl-button>
        </sl-tooltip>
      </sl-button-group>
      <p>${label}</p>`;
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
