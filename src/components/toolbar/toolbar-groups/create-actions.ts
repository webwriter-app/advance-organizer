import { connectMessages } from "../../../../localization/localizer";
import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { html, PropertyValues, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { SelectionController } from "../../../state/selection";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconAddNode from "@tabler/icons/outline/square-plus-2.svg";
import iconAddEdge from "@tabler/icons/outline/link-plus.svg";
import iconAddImage from "@tabler/icons/outline/photo-plus.svg";

export class AoCreateActionsGroup extends LitElementWw {
  protected readonly msg = connectMessages(this);
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  @property({ type: Boolean })
  accessor drawingEdge = false;

  static override scopedElements = {
    "sl-button": SlButton,
    "sl-button-group": SlButtonGroup,
    "sl-icon": SlIcon,
    "sl-tooltip": SlTooltip,
  };

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
  }

  static override styles = actionsStyles;

  protected override render(): TemplateResult {
    return html`<sl-button-group label=${this.msg("Add elements")}>
      <sl-tooltip content="${this.msg("Add concept")} (C)">
        <sl-button size="small" @click=${this._handleAddNodeClick}>
          <sl-icon label=${this.msg("Add concept")} src=${iconAddNode}></sl-icon>
        </sl-button>
      </sl-tooltip>
      <sl-tooltip content="${this.msg("Add relation")} (R)">
        <sl-button
          size="small"
          class=${this.drawingEdge ? "active" : ""}
          @click=${this._handleAddEdgeClick}>
          <sl-icon label=${this.msg("Add relation")} src=${iconAddEdge}></sl-icon>
        </sl-button>
      </sl-tooltip>
      <sl-tooltip content="${this.msg("Add picture")} (I)">
        <sl-button size="small" @click=${this._handleAddImageClick}>
          <sl-icon label=${this.msg("Add picture")} src=${iconAddImage}></sl-icon>
        </sl-button>
      </sl-tooltip>
    </sl-button-group>`;
  }

  private _handleAddNodeClick(): void {
    this.dispatchEvent(
      new CustomEvent("add-node", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleAddEdgeClick(): void {
    this.dispatchEvent(
      new CustomEvent("toggle-draw-edge", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleAddImageClick(): void {
    this.dispatchEvent(
      new CustomEvent("add-image", {
        bubbles: true,
        composed: true,
      }),
    );
  }
}
