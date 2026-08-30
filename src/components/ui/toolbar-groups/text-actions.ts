import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { SelectionController } from "../../../state/selection";
import { html, nothing, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { Label } from "../../../model/types";
import { onPickedColor, previewColor } from "../../../utils/color-preview";
import { localized, msg } from "@lit/localize";
import { MOD_LABEL } from "../../../state/keyboard";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlColorPicker from "@shoelace-style/shoelace/dist/components/color-picker/color-picker.component.js";
import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlRange from "@shoelace-style/shoelace/dist/components/range/range.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";
import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component.js";

import iconBold from "@tabler/icons/outline/bold.svg";
import iconItalic from "@tabler/icons/outline/italic.svg";
import iconUnderline from "@tabler/icons/outline/underline.svg";
import iconTextColor from "@tabler/icons/outline/text-color.svg";
import iconTextSize from "@tabler/icons/outline/text-size.svg";

@localized()
export class AoTextActionsGroup extends LitElementWw {
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
    "sl-range": SlRange,
    "sl-tooltip": SlTooltip,
    "sl-menu": SlMenu,
  };

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    new SubscribeController(this, this.doc);
    new SubscribeController(this, this.selection);
  }

  static override styles = actionsStyles;

  private static _collectLabels(
    doc: DocumentController | undefined,
    selection: SelectionController | undefined,
  ): Label[] | null {
    if (!doc || !selection || selection.isEmpty()) {
      return null;
    }

    const labels: Label[] = [];
    for (const id of selection.entries) {
      const item = doc.get(id);
      if (!item) {
        continue;
      }
      if (item.kind === "image") {
        return null;
      }
      if (item.label) {
        labels.push(item.label);
      }
    }

    return labels.length > 0 ? labels : null;
  }

  static isApplicable(
    doc: DocumentController | undefined,
    selection: SelectionController | undefined,
  ): boolean {
    return AoTextActionsGroup._collectLabels(doc, selection) !== null;
  }

  protected override render(): TemplateResult | typeof nothing {
    const labels = AoTextActionsGroup._collectLabels(this.doc, this.selection);
    if (!labels) {
      return nothing;
    }

    const first = labels[0]!;

    const bold = labels.every((label) => label.bold);
    const italic = labels.every((label) => label.italic);
    const underline = labels.every((label) => label.underline);
    const color = first.color || "#000000";
    const fontSize = first.fontSize ?? 18;

    return html`<sl-button-group label=${msg("Text edits")}>
      <sl-tooltip content="${msg("Bold")} (${MOD_LABEL}+B)">
        <sl-button
          size="small"
          class=${bold ? "active" : ""}
          @click=${() => this._updateLabelStyle({ bold: !bold })}>
          <sl-icon label=${msg("Bold")} .src=${iconBold}></sl-icon>
        </sl-button>
      </sl-tooltip>
      <sl-tooltip content="${msg("Italic")} (${MOD_LABEL}+I)">
        <sl-button
          size="small"
          class=${italic ? "active" : ""}
          @click=${() => this._updateLabelStyle({ italic: !italic })}>
          <sl-icon label=${msg("Italic")} .src=${iconItalic}></sl-icon>
        </sl-button>
      </sl-tooltip>
      <sl-tooltip content="${msg("Underline")} (${MOD_LABEL}+U)">
        <sl-button
          size="small"
          class=${underline ? "active" : ""}
          @click=${() => this._updateLabelStyle({ underline: !underline })}>
          <sl-icon label=${msg("Underline")} .src=${iconUnderline}></sl-icon>
        </sl-button>
      </sl-tooltip>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Text color")}>
          <sl-button size="small" caret>
            <sl-icon label=${msg("Text color")} .src=${iconTextColor}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-color-picker
          .value=${color}
          opacity
          inline
          @sl-input=${onPickedColor((picked) =>
            this._previewLabelColor(picked),
          )}
          @sl-change=${onPickedColor((picked) =>
            this._updateLabelStyle({ color: picked }),
          )}></sl-color-picker>
      </sl-dropdown>
      <sl-dropdown>
        <sl-tooltip slot="trigger" tabindex="-1" content=${msg("Font size")}>
          <sl-button size="small" caret>
            <sl-icon label=${msg("Font size")} .src=${iconTextSize}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu>
          <sl-range
            .value=${fontSize}
            min="8"
            max="48"
            @sl-input=${(e: CustomEvent) => {
              if (e.target instanceof SlRange) {
                this._updateLabelStyle({ fontSize: e.target.value });
              }
            }}></sl-range
        ></sl-menu>
      </sl-dropdown>
    </sl-button-group>`;
  }

  private _previewLabelColor(color: string): void {
    if (this.selection.isEmpty()) {
      return;
    }

    previewColor(this, this.selection.entries, "label-color", color);
  }

  // TODO: Only update DOM on input for the font size, update state only on change
  private _updateLabelStyle(style: Partial<Omit<Label, "text">>): void {
    if (this.selection.isEmpty()) {
      return;
    }

    for (const id of this.selection.entries) {
      this.doc.updateLabelStyle(id, style);
    }
  }
}
