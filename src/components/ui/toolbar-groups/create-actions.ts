import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { html, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { SelectionController } from "../../../state/selection";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconAddNode from "@tabler/icons/outline/square-plus-2.svg";
import iconAddEdge from "@tabler/icons/outline/link-plus.svg";

export class AoCreateActionsGroup extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

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
    return html`<sl-button-group label="Add elements">
      <sl-tooltip content="Add node">
        <sl-button @click=${this._handleAddNodeClick}>
          <sl-icon src=${iconAddNode}></sl-icon>
        </sl-button>
      </sl-tooltip>
      <sl-tooltip content="Add edge">
        <sl-button>
          <sl-icon src=${iconAddEdge}></sl-icon>
        </sl-button>
      </sl-tooltip>
    </sl-button-group>`;
  }

  private _handleAddNodeClick(): void {
    const newNode = this.doc.addNode({
      dimension: { width: 100, height: 50 },
      label: { text: "New node" },
      position: { x: 100, y: 100 },
      style: {
        shape: "rectangle",
        fill: "lightblue",
        stroke: "blue",
        strokeWidth: 2,
      },
    });
    this.selection.select(newNode.id);
  }
}
