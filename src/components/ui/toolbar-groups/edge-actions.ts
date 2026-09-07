import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { html, nothing, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import {
  ArrowheadOption,
  EdgeMarker,
  EdgeStyle,
  StrokeStyle,
} from "../../../model/types";
import { DEFAULT_BLACK } from "../../../model/colors";
import {
  ARROWHEAD_OPTIONS,
  arrowheadLabel,
  STROKE_STYLES,
  strokeStyleLabel,
} from "../../../model/labels";
import { renderColorIcon, STROKE_STYLE_ICONS } from "./previews";
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

import iconFill from "@tabler/icons/outline/bucket-droplet.svg";
import iconStroke from "@tabler/icons/outline/border-style-2.svg";
import iconArrowNone from "@tabler/icons/outline/minus.svg";
import iconArrowForward from "@tabler/icons/outline/arrow-right.svg";
import iconArrowReverse from "@tabler/icons/outline/arrow-left.svg";
import iconArrowBidirectional from "@tabler/icons/outline/arrows-horizontal.svg";

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
    const stroke = item.style.stroke || DEFAULT_BLACK;
    const strokeWidth = item.style.strokeWidth ?? 1;
    const arrowheads = getArrowheadOption(item.style);

    return html`<sl-button-group label=${msg("Relation edits")}>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Stroke color")}>
          <sl-button size="small" caret>
            ${renderColorIcon(iconFill, stroke, msg("Stroke color"))}
          </sl-button>
        </sl-tooltip>
        <sl-menu class="colors">
          <ww-color-picker
            .value=${stroke}
            @input=${(e: CustomEvent<string>) =>
              this._updateEdgeColor(e.detail)}></ww-color-picker>
        </sl-menu>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Stroke")}>
          <sl-button size="small" caret>
            <sl-icon label=${msg("Stroke")} .src=${iconStroke}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu @sl-select=${(e: CustomEvent) => this._onStrokeStyleSelect(e)}>
          <sl-menu-label>${msg("Stroke width")}</sl-menu-label>
          <sl-range
            .value=${strokeWidth}
            min="1"
            max="16"
            @sl-input=${(e: CustomEvent) => {
              if (e.target instanceof SlRange) {
                this._updateEdgeWidth(e.target.value);
              }
            }}></sl-range>
          <sl-divider></sl-divider>
          <sl-menu-label>${msg("Stroke style")}</sl-menu-label>
          ${STROKE_STYLES.map(
            (strokeStyle) =>
              html`<sl-menu-item
                type="checkbox"
                value=${strokeStyle}
                ?checked=${strokeStyle === (item.style.strokeStyle ?? "solid")}>
                <sl-icon
                  slot="prefix"
                  .src=${STROKE_STYLE_ICONS[strokeStyle]}></sl-icon>
                ${strokeStyleLabel(strokeStyle)}
              </sl-menu-item>`,
          )}
        </sl-menu>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Arrowheads")}>
          <sl-button size="small" caret>
            <sl-icon
              label=${msg("Arrowheads")}
              .src=${ARROWHEAD_ICONS[arrowheads]}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu @sl-select=${(e: CustomEvent) => this._onArrowheadsSelect(e)}>
          ${ARROWHEAD_OPTIONS.map(
            (option) =>
              html`<sl-menu-item
                type="checkbox"
                value=${option}
                ?checked=${option === arrowheads}>
                <sl-icon
                  slot="prefix"
                  .src=${ARROWHEAD_ICONS[option]}></sl-icon>
                ${arrowheadLabel(option)}
              </sl-menu-item>`,
          )}
        </sl-menu>
      </sl-dropdown>
    </sl-button-group>`;
  }

  private _onArrowheadsSelect(e: CustomEvent): void {
    const item = e.detail.item as SlMenuItem;
    item.checked = true;
    this._updateArrowheads(item.value as ArrowheadOption);
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

  private _onStrokeStyleSelect(e: CustomEvent): void {
    const item = e.detail.item as SlMenuItem;
    item.checked = true;
    this._updateEdgeStyle(item.value as StrokeStyle);
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
