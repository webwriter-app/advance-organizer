import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { html, nothing, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { EdgeMarker, EdgeStyle, StrokeStyle } from "../../../model/types";
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

import iconStrokeWidth from "@tabler/icons/outline/stroke-straight.svg";
import iconFill from "@tabler/icons/outline/bucket-droplet.svg";
import iconBorderStyle from "@tabler/icons/outline/border-style-2.svg";
import iconArrowNone from "@tabler/icons/outline/minus.svg";
import iconArrowForward from "@tabler/icons/outline/arrow-right.svg";
import iconArrowReverse from "@tabler/icons/outline/arrow-left.svg";
import iconArrowBidirectional from "@tabler/icons/outline/arrows-horizontal.svg";

type ArrowheadOption = "none" | "forward" | "reverse" | "bidirectional";

const ARROWHEAD_ICONS: Record<ArrowheadOption, string> = {
  none: iconArrowNone,
  forward: iconArrowForward,
  reverse: iconArrowReverse,
  bidirectional: iconArrowBidirectional,
};

const ARROWHEAD_MARKERS: Record<
  ArrowheadOption,
  { markerStart: EdgeMarker; markerEnd: EdgeMarker }
> = {
  none: { markerStart: "none", markerEnd: "none" },
  forward: { markerStart: "none", markerEnd: "arrow" },
  reverse: { markerStart: "arrow", markerEnd: "none" },
  bidirectional: { markerStart: "arrow", markerEnd: "arrow" },
};

function getArrowheadOption(style: EdgeStyle): ArrowheadOption {
  const hasStart = style.markerStart === "arrow";
  const hasEnd = style.markerEnd === "arrow";
  if (hasStart && hasEnd) return "bidirectional";
  if (hasStart) return "reverse";
  if (hasEnd) return "forward";
  return "none";
}

@localized()
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

  static isApplicable(
    doc: DocumentController | undefined,
    selection: SelectionController | undefined,
  ): boolean {
    return !!doc && !!selection && selection.sharedKind() === "edge";
  }

  protected override render(): TemplateResult | typeof nothing {
    const firstSelected = [...this.selection.entries][0]!;
    const item = this.doc.get(firstSelected);
    if (item?.kind !== "edge") {
      return nothing;
    }
    const stroke = item.style.stroke || "#000000";
    const strokeWidth = item.style.strokeWidth ?? 1;
    const arrowheads = getArrowheadOption(item.style);

    return html`<sl-button-group label=${msg("Edge edits")}>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Stroke color")}>
          <sl-button size="small" caret>
            <sl-icon .src=${iconFill}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-color-picker
          .value=${stroke}
          opacity
          inline
          @sl-input=${onPickedColor((color) => this._previewEdgeColor(color))}
          @sl-change=${onPickedColor((color) =>
            this._updateEdgeColor(color),
          )}></sl-color-picker>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Stroke width")}>
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
              this._updateEdgeWidth(e.target.value);
            }
          }}></sl-range>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Stroke style")}>
          <sl-button size="small" caret>
            <sl-icon .src=${iconBorderStyle}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu
          @sl-select=${(e: CustomEvent) =>
            this._updateEdgeStyle(e.detail.item.value)}>
          <sl-menu-item value="solid">${msg("Solid")}</sl-menu-item>
          <sl-menu-item value="dashed">${msg("Dashed")}</sl-menu-item>
          <sl-menu-item value="dotted">${msg("Dotted")}</sl-menu-item>
        </sl-menu>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Arrowheads")}>
          <sl-button size="small" caret>
            <sl-icon .src=${ARROWHEAD_ICONS[arrowheads]}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu
          @sl-select=${(e: CustomEvent) =>
            this._updateArrowheads(e.detail.item.value)}>
          <sl-menu-item value="none">
            <sl-icon slot="prefix" .src=${iconArrowNone}></sl-icon>
            ${msg("None")}
          </sl-menu-item>
          <sl-menu-item value="forward">
            <sl-icon slot="prefix" .src=${iconArrowForward}></sl-icon>
            ${msg("Forward")}
          </sl-menu-item>
          <sl-menu-item value="reverse">
            <sl-icon slot="prefix" .src=${iconArrowReverse}></sl-icon>
            ${msg("Reverse")}
          </sl-menu-item>
          <sl-menu-item value="bidirectional">
            <sl-icon slot="prefix" .src=${iconArrowBidirectional}></sl-icon>
            ${msg("Bidirectional")}
          </sl-menu-item>
        </sl-menu>
      </sl-dropdown>
    </sl-button-group>`;
  }

  private _updateArrowheads(option: ArrowheadOption): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    const markers = ARROWHEAD_MARKERS[option];
    for (const id of this.selection.entries) {
      this.doc.updateEdgeStyle(id, markers);
    }
  }

  private _updateEdgeStyle(strokeStyle: StrokeStyle): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateEdgeStyle(id, { strokeStyle });
    }
  }

  private _previewEdgeColor(color: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

    previewColor(this, this.selection.entries, "stroke", color);
  }

  private _updateEdgeColor(color: string): void {
    if (this.selection.isEmpty() || !this.selection.allOfSameKind()) {
      return;
    }

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
