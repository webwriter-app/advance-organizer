import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { html, PropertyValues, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { SelectionController } from "../../../state/selection";
import { localized, msg } from "@lit/localize";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconAddNode from "@tabler/icons/outline/square-plus-2.svg";
import iconAddEdge from "@tabler/icons/outline/link-plus.svg";
import iconAddImage from "@tabler/icons/outline/photo-plus.svg";

@localized()
export class AoCreateActionsGroup extends LitElementWw {
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
    return html`<sl-button-group label=${msg("Add elements")}>
      <sl-tooltip content="${msg("Add node")} (N)">
        <sl-button size="small" @click=${this._handleAddNodeClick}>
          <sl-icon label=${msg("Add node")} src=${iconAddNode}></sl-icon>
        </sl-button>
      </sl-tooltip>
      <sl-tooltip content="${msg("Add edge")} (E)">
        <sl-button
          size="small"
          class=${this.drawingEdge ? "active" : ""}
          @click=${this._handleAddEdgeClick}>
          <sl-icon label=${msg("Add edge")} src=${iconAddEdge}></sl-icon>
        </sl-button>
      </sl-tooltip>
      <sl-tooltip content="${msg("Add picture")} (I)">
        <sl-button size="small" @click=${this._handleAddImageClick}>
          <sl-icon label=${msg("Add picture")} src=${iconAddImage}></sl-icon>
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
