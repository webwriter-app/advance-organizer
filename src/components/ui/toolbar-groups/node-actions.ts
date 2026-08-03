import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { html, nothing, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { NodeShape, StrokeStyle } from "../../../model/types";
import { onPickedColor, previewColor } from "../../../utils/color-preview";
import { localized, msg } from "@lit/localize";

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

import iconShape from "@tabler/icons/outline/circle-square.svg";
import iconFill from "@tabler/icons/outline/bucket-droplet.svg";
import iconBorder from "@tabler/icons/outline/border-style.svg";

@localized()
export class AoNodeActionsGroup extends LitElementWw {
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

  static isApplicable(
    doc: DocumentController | undefined,
    selection: SelectionController | undefined,
  ): boolean {
    return !!doc && !!selection && selection.sharedKind() === "node";
  }

  protected override render(): TemplateResult | typeof nothing {
    const firstSelected = [...this.selection.entries][0]!;
    const item = this.doc.get(firstSelected);
    if (item?.kind !== "node") {
      return nothing;
    }
    const fill = item.style.fill || "#ffffff";
    const stroke = item.style.stroke || "#000000";
    const strokeWidth = item.style.strokeWidth ?? 1;

    return html`<sl-button-group label=${msg("Node edits")}>
      <sl-dropdown>
        <sl-tooltip slot="trigger" content=${msg("Shape")}>
          <sl-button size="small" caret>
            <sl-icon .src=${iconShape}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu
          @sl-select=${(e: CustomEvent) =>
            this._updateNodeShape(e.detail.item.value)}>
          <sl-menu-item value="rectangle">${msg("Rectangle")}</sl-menu-item>
          <sl-menu-item value="ellipse">${msg("Ellipse")}</sl-menu-item>
          <sl-menu-item value="diamond">${msg("Diamond")}</sl-menu-item>
        </sl-menu>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" content=${msg("Fill")}>
          <sl-button size="small" caret>
            <sl-icon .src=${iconFill}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-color-picker
          .value=${fill}
          opacity
          inline
          @sl-input=${onPickedColor((color) => this._previewNodeColor(color))}
          @sl-change=${onPickedColor((color) =>
            this._updateNodeColor(color),
          )}></sl-color-picker>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" content=${msg("Border")}>
          <sl-button size="small" caret>
            <sl-icon .src=${iconBorder}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu
          @sl-select=${(e: CustomEvent) =>
            this._updateNodeBorder(e.detail.item.value)}>
          <sl-menu-label>${msg("Border width")}</sl-menu-label>
          <sl-range
            .value=${strokeWidth}
            min="0"
            max="16"
            @sl-input=${(e: CustomEvent) => {
              if (e.target instanceof SlRange) {
                this._updateBorderWidth(e.target.value);
              }
            }}></sl-range>
          <sl-divider></sl-divider>
          <sl-menu-label>${msg("Border type")}</sl-menu-label>
          <sl-menu-item value="border-solid">${msg("Solid")}</sl-menu-item>
          <sl-menu-item value="border-dashed">${msg("Dashed")}</sl-menu-item>
          <sl-menu-item value="border-dotted">${msg("Dotted")}</sl-menu-item>
          <sl-divider></sl-divider>
          <sl-menu-label>${msg("Border color")}</sl-menu-label>
          <sl-color-picker
            .value=${stroke}
            inline
            @sl-input=${onPickedColor((color) =>
              this._previewBorderColor(color),
            )}
            @sl-change=${onPickedColor((color) =>
              this._updateBorderColor(color),
            )}></sl-color-picker>
        </sl-menu>
      </sl-dropdown>
    </sl-button-group>`;
  }

  private _updateNodeShape(shape: NodeShape): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateNodeStyle(id, { shape: shape });
    }
  }

  private _previewNodeColor(color: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    previewColor(this, this.selection.entries, "fill", color);
  }

  private _updateNodeColor(color: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateNodeStyle(id, { fill: color });
    }
  }

  private _updateNodeBorder(value: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    if (value.startsWith("border-")) {
      const strokeStyle = value.replace("border-", "") as StrokeStyle;

      for (const id of this.selection.entries) {
        this.doc.updateNodeStyle(id, { strokeStyle });
      }
    }
  }

  private _previewBorderColor(color: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    previewColor(this, this.selection.entries, "stroke", color);
  }

  private _updateBorderColor(color: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateNodeStyle(id, { stroke: color });
    }
  }

  private _updateBorderWidth(width: number): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateNodeStyle(id, { strokeWidth: width });
    }
  }
}
