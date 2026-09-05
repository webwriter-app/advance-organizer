import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { css, html, nothing, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import {
  Node,
  NodePresetId,
  NodePresetSelection,
  NodeShape,
  StrokeStyle,
} from "../../../model/types";
import { NODE_PRESETS, presetLabel, presetStyle } from "../../../model/presets";
import { renderShapePreview } from "../../canvas/node";
import { localized, msg } from "@lit/localize";
import { WwColorPicker } from "../color-picker";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
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
import iconCustom from "@tabler/icons/outline/adjustments.svg";

const CUSTOM = "custom";

@localized()
export class AoNodeActionsGroup extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  static override scopedElements = {
    "sl-button": SlButton,
    "sl-button-group": SlButtonGroup,
    "ww-color-picker": WwColorPicker,
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

  static override styles = [
    actionsStyles,
    css`
      sl-menu.presets {
        max-height: 60vh;
        overflow-y: auto;
      }

      .shape-preview {
        width: 3.5em;
        height: 1.75em;
        flex: none;
      }

      sl-menu-item .shape-preview {
        margin-right: var(--sl-spacing-x-small);
      }

      sl-menu-item sl-icon[slot="prefix"] {
        width: 3.5em;
      }

      sl-button .shape-preview {
        margin: 0 var(--sl-spacing-3x-small);
      }
    `,
  ];

  static isApplicable(
    doc: DocumentController | undefined,
    selection: SelectionController | undefined,
  ): boolean {
    return !!doc && !!selection && selection.sharedKind() === "node";
  }

  private _selectedNodes(): Node[] {
    const nodes: Node[] = [];
    for (const id of this.selection.entries) {
      const item = this.doc.get(id);
      if (item?.kind === "node") {
        nodes.push(item);
      }
    }
    return nodes;
  }

  private _sharedPreset(nodes: Node[]): NodePresetSelection | null {
    const presets = new Set(nodes.map((node) => node.style.preset ?? CUSTOM));
    return presets.size === 1 ? [...presets][0]! : null;
  }

  protected override render(): TemplateResult | typeof nothing {
    const nodes = this._selectedNodes();
    const first = nodes[0];
    if (!first) {
      return nothing;
    }

    const preset = this._sharedPreset(nodes);

    return html`<sl-button-group label=${msg("Node edits")}>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Node preset")}>
          <sl-button size="small" caret>
            ${preset === CUSTOM
              ? html`<sl-icon
                  label=${msg("Node preset")}
                  .src=${iconCustom}></sl-icon>`
              : renderShapePreview(first.style)}
          </sl-button>
        </sl-tooltip>
        <sl-menu
          class="presets"
          @sl-select=${(e: CustomEvent) => this._onPresetSelect(e)}>
          ${this._renderPresets(preset)}
          <sl-divider></sl-divider>
          <sl-menu-item
            type="checkbox"
            value=${CUSTOM}
            ?checked=${preset === CUSTOM}>
            <sl-icon slot="prefix" .src=${iconCustom}></sl-icon>
            ${msg("Custom")}
          </sl-menu-item>
        </sl-menu>
      </sl-dropdown>
      ${preset === CUSTOM ? this._renderCustomActions(first) : nothing}
    </sl-button-group>`;
  }

  private _renderPresets(selected: NodePresetSelection | null): TemplateResult {
    return html` ${NODE_PRESETS.map(
      (preset) =>
        html`<sl-menu-item
          type="checkbox"
          value=${preset.id}
          ?checked=${selected === preset.id}>
          <span slot="prefix">${renderShapePreview(preset.style)}</span>
          ${presetLabel(preset.id)}
        </sl-menu-item>`,
    )}`;
  }

  private _onPresetSelect(e: CustomEvent): void {
    const item = e.detail.item as SlMenuItem;
    item.checked = true;
    this._applyPreset(item.value as NodePresetSelection);
  }

  private _renderCustomActions(node: Node): TemplateResult {
    const fill = node.style.fill || "#ffffff";
    const stroke = node.style.stroke || "#000000";
    const strokeWidth = node.style.strokeWidth ?? 1;

    return html`<sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Shape")}>
          <sl-button size="small" caret>
            <sl-icon label=${msg("Shape")} .src=${iconShape}></sl-icon>
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
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Fill")}>
          <sl-button size="small" caret>
            <sl-icon label=${msg("Fill")} .src=${iconFill}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <ww-color-picker
          .value=${fill}
          tinted
          @input=${(e: CustomEvent<string>) =>
            this._updateNodeColor(e.detail)}></ww-color-picker>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Border")}>
          <sl-button size="small" caret>
            <sl-icon label=${msg("Border")} .src=${iconBorder}></sl-icon>
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
          <ww-color-picker
            .value=${stroke}
            @input=${(e: CustomEvent<string>) =>
              this._updateBorderColor(e.detail)}></ww-color-picker>
        </sl-menu>
      </sl-dropdown>`;
  }

  private _applyPreset(value: NodePresetSelection): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    const style =
      value === CUSTOM
        ? { preset: CUSTOM as NodePresetSelection }
        : presetStyle(value as NodePresetId);

    for (const id of this.selection.entries) {
      this.doc.updateNodeStyle(id, style);
    }
  }

  private _updateNodeShape(shape: NodeShape): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateNodeStyle(id, { shape: shape });
    }
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
