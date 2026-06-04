import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { html, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { StrokeStyle } from "../../../model/types";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlColorPicker from "@shoelace-style/shoelace/dist/components/color-picker/color-picker.component.js";
import SlDivider from "@shoelace-style/shoelace/dist/components/divider/divider.component.js";
import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component.js";
import SlMenuItem from "@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js";
import SlMenuLabel from "@shoelace-style/shoelace/dist/components/menu-label/menu-label.component.js";
import SlRange from "@shoelace-style/shoelace/dist/components/range/range.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconStrokeWidth from "@tabler/icons/outline/stroke-straight.svg";
import iconFill from "@tabler/icons/outline/bucket-droplet.svg";
import iconBorderStyle from "@tabler/icons/outline/border-style-2.svg";

export class AoEdgeActionsGroup extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  static override scopedElements = {
    "sl-button": SlButton,
    "sl-button-group": SlButtonGroup,
    "sl-color-picker": SlColorPicker,
    "sl-divider": SlDivider,
    "sl-dropdown": SlDropdown,
    "sl-icon": SlIcon,
    "sl-menu": SlMenu,
    "sl-menu-item": SlMenuItem,
    "sl-menu-label": SlMenuLabel,
    "sl-range": SlRange,
    "sl-tooltip": SlTooltip,
  };

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
  }

  static override styles = actionsStyles;

  protected override render(): TemplateResult {
    if (!this.doc || !this.selection) {
      return html``;
    }

    if (!this.selection.isEmpty() && this.selection.allOfSameKind()) {
      const firstSelected = [...this.selection.entries][0]!;
      const item = this.doc.get(firstSelected);
      if (item?.kind !== "edge") {
        return html``;
      }
      const stroke = item.style.stroke || "#000000";
      const strokeWidth = item.style.strokeWidth ?? 1;

      return html`<sl-button-group label="Edge edits">
        <sl-dropdown>
          <sl-tooltip slot="trigger" content="Stroke color">
            <sl-button caret>
              <sl-icon .src=${iconFill}></sl-icon>
            </sl-button>
          </sl-tooltip>
          <sl-color-picker
            .value=${stroke}
            opacity
            inline
            @sl-input=${(e: CustomEvent) => {
              if (e.target instanceof SlColorPicker) {
                this._updateEdgeColor(e.target.getFormattedValue("hexa"));
              }
            }}></sl-color-picker>
        </sl-dropdown>
        <sl-dropdown>
          <sl-tooltip slot="trigger" content="Stroke width">
            <sl-button caret>
              <sl-icon .src=${iconStrokeWidth}></sl-icon>
            </sl-button>
          </sl-tooltip>
          <sl-range
            .value=${strokeWidth}
            min="0"
            max="16"
            @sl-input=${(e: CustomEvent) => {
              if (e.target instanceof SlRange) {
                this._updateEdgeWidth(e.target.value);
              }
            }}></sl-range>
        </sl-dropdown>
        <sl-dropdown>
          <sl-tooltip slot="trigger" content="Stroke style">
            <sl-button caret>
              <sl-icon .src=${iconBorderStyle}></sl-icon>
            </sl-button>
          </sl-tooltip>
          <sl-menu
            @sl-select=${(e: CustomEvent) =>
              this._updateEdgeStyle(e.detail.item.value)}>
            <sl-menu-item value="solid">Solid</sl-menu-item>
            <sl-menu-item value="dashed">Dashed</sl-menu-item>
            <sl-menu-item value="dotted">Dotted</sl-menu-item>
          </sl-menu>
        </sl-dropdown>
      </sl-button-group>`;
    }

    return html``;
  }

  private _updateEdgeStyle(strokeStyle: StrokeStyle): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateEdgeStyle(id, { strokeStyle });
    }
  }

  private _updateEdgeColor(color: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    // TODO: Only update DOM on input, update state only on change (debounce)

    for (const id of this.selection.entries) {
      this.doc.updateEdgeStyle(id, { stroke: color });
    }
  }

  private _updateEdgeWidth(value: number): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateEdgeStyle(id, { strokeWidth: value });
    }
  }
}
