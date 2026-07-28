import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { html, nothing, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconEditFile from "@tabler/icons/outline/file-pencil.svg";

export class AoPageActionsGroup extends LitElementWw {
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

  static isApplicable(
    doc: DocumentController | undefined,
    selection: SelectionController | undefined,
  ): boolean {
    if (!doc || !selection || selection.size !== 1) {
      return false;
    }
    const firstSelected = [...selection.entries][0]!;
    return doc.get(firstSelected)?.kind === "node";
  }

  protected override render(): TemplateResult | typeof nothing {
    const firstSelected = [...this.selection.entries][0]!;
    const item = this.doc.get(firstSelected);
    if (item?.kind !== "node") {
      return nothing;
    }

    return html`<sl-button-group label="Connected page">
      <sl-tooltip content="Connected page">
        <sl-button
          size="small"
          variant="primary"
          @click=${this._handleOpenPageClick}>
          <sl-icon src=${iconEditFile}></sl-icon>
        </sl-button>
      </sl-tooltip>
    </sl-button-group>`;
  }

  private _handleOpenPageClick(): void {
    this.dispatchEvent(
      new CustomEvent("open-page", {
        bubbles: true,
        composed: true,
        detail: { pageId: [...this.selection.entries][0]! },
      }),
    );
  }
}
