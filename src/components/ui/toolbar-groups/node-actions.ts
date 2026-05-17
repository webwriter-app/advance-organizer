import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { html, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconShape from "@tabler/icons/outline/circle-square.svg";
import iconFill from "@tabler/icons/outline/bucket-droplet.svg";

export class AoNodeActionsGroup extends LitElementWw {
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

  protected override render(): TemplateResult {
    if (!this.doc || !this.selection) {
      return html``;
    }

    if (!this.selection.isEmpty() && this.selection.allOfSameKind()) {
      return html`<sl-button-group label="Node edits">
        <sl-tooltip content="Shape">
          <sl-button>
            <sl-icon .src=${iconShape}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-tooltip content="Fill">
          <sl-button>
            <sl-icon .src=${iconFill}></sl-icon>
          </sl-button>
        </sl-tooltip>
      </sl-button-group>`;
    }

    return html`<sl-button-group>
      <sl-button>No</sl-button>
      <sl-button>Selection</sl-button>
    </sl-button-group>`;
  }
}
