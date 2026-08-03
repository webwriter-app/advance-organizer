import { LitElementWw } from "@webwriter/lit";
import { zoomControlsStyles } from "./zoom-controls.styles";
import { html, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";

import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import SlDivider from "@shoelace-style/shoelace/dist/components/divider/divider.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconFocusCentered from "@tabler/icons/outline/focus-centered.svg";
import iconZoomIn from "@tabler/icons/outline/zoom-in.svg";
import iconZoomOut from "@tabler/icons/outline/zoom-out.svg";

@localized()
export class AoZoomControls extends LitElementWw {
  static override scopedElements = {
    "sl-icon-button": SlIconButton,
    "sl-divider": SlDivider,
    "sl-tooltip": SlTooltip,
  };

  @property({ type: Number })
  accessor zoomLevel: number = 1;

  @property({ type: Number })
  accessor minZoom: number = 0.25;

  @property({ type: Number })
  accessor maxZoom: number = 4;

  static override styles = zoomControlsStyles;

  protected override render(): TemplateResult {
    const atMin = this.zoomLevel <= this.minZoom * 1.001;
    const atMax = this.zoomLevel >= this.maxZoom * 0.999;

    return html`<sl-tooltip content=${msg("Fit to view")} hoist>
        <sl-icon-button
          label=${msg("Fit to view")}
          .src=${iconFocusCentered}
          @click=${() => this._emit("center-view")}></sl-icon-button>
      </sl-tooltip>
      <sl-divider vertical></sl-divider>
      <sl-tooltip content=${msg("Zoom out")} hoist>
        <sl-icon-button
          label=${msg("Zoom out")}
          .src=${iconZoomOut}
          ?disabled=${atMin}
          @click=${() => this._emit("zoom-out")}></sl-icon-button>
      </sl-tooltip>
      <span class="zoom-level">${Math.round(this.zoomLevel * 100)}%</span>
      <sl-tooltip content=${msg("Zoom in")} hoist>
        <sl-icon-button
          label=${msg("Zoom in")}
          .src=${iconZoomIn}
          ?disabled=${atMax}
          @click=${() => this._emit("zoom-in")}></sl-icon-button>
      </sl-tooltip>`;
  }

  private _emit(name: string): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
      }),
    );
  }
}
