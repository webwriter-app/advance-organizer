import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { html, nothing, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { Id, ImageStyle, StrokeStyle } from "../../../model/types";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlColorPicker from "@shoelace-style/shoelace/dist/components/color-picker/color-picker.component.js";
import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component.js";
import SlMenuItem from "@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js";
import SlRange from "@shoelace-style/shoelace/dist/components/range/range.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconStrokeWidth from "@tabler/icons/outline/stroke-straight.svg";
import iconFill from "@tabler/icons/outline/bucket-droplet.svg";
import iconBorderStyle from "@tabler/icons/outline/border-style-2.svg";

export class AoImageActionsGroup extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  static override scopedElements = {
    "sl-button": SlButton,
    "sl-button-group": SlButtonGroup,
    "sl-color-picker": SlColorPicker,
    "sl-dropdown": SlDropdown,
    "sl-icon": SlIcon,
    "sl-menu": SlMenu,
    "sl-menu-item": SlMenuItem,
    "sl-range": SlRange,
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
    return !!doc && !!selection && selection.sharedKind() === "image";
  }

  protected override render(): TemplateResult | typeof nothing {
    const firstSelected = [...this.selection.entries][0]!;
    const item = this.doc.get(firstSelected);
    if (item?.kind !== "image") {
      return nothing;
    }
    const stroke = item.style?.stroke || "#000000";
    const strokeWidth = item.style?.strokeWidth ?? 0;

    return html`<sl-button-group label="Image edits">
      <sl-dropdown>
        <sl-tooltip slot="trigger" content="Stroke color">
          <sl-button size="small" caret>
            <sl-icon .src=${iconFill}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-color-picker
          .value=${stroke}
          opacity
          inline
          @sl-input=${(e: CustomEvent) => {
            if (e.target instanceof SlColorPicker) {
              this._updateBorderColor(e.target.getFormattedValue("hexa"));
            }
          }}></sl-color-picker>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" content="Stroke width">
          <sl-button size="small" caret>
            <sl-icon .src=${iconStrokeWidth}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-range
          .value=${strokeWidth}
          min="0"
          max="16"
          @sl-input=${(e: CustomEvent) => {
            if (e.target instanceof SlRange) {
              this._updateBorderWidth(e.target.value);
            }
          }}></sl-range>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" content="Stroke style">
          <sl-button size="small" caret>
            <sl-icon .src=${iconBorderStyle}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu
          @sl-select=${(e: CustomEvent) =>
            this._updateBorderStyle(e.detail.item.value)}>
          <sl-menu-item value="solid">Solid</sl-menu-item>
          <sl-menu-item value="dashed">Dashed</sl-menu-item>
          <sl-menu-item value="dotted">Dotted</sl-menu-item>
        </sl-menu>
      </sl-dropdown>
    </sl-button-group>`;
  }

  private _updateBorderStyle(strokeStyle: StrokeStyle): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateImageStyle(id, {
        strokeStyle,
        ...this._visibleWidth(id),
      });
    }
  }

  private _updateBorderColor(color: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateImageStyle(id, {
        stroke: color,
        ...this._visibleWidth(id),
      });
    }
  }

  private _updateBorderWidth(width: number): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateImageStyle(id, { strokeWidth: width });
    }
  }

  private _visibleWidth(id: Id): Partial<ImageStyle> {
    const item = this.doc.get(id);
    const strokeWidth = item?.kind === "image" ? item.style?.strokeWidth : 0;
    return strokeWidth ? {} : { strokeWidth: 1 };
  }
}
