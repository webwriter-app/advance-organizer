import { LitElementWw } from "@webwriter/lit";
import { dragOverlayStyles } from "./drag-overlay.styles";
import { html, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { localized, msg, str } from "@lit/localize";

import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";

import photoPlus from "@tabler/icons/outline/photo-plus.svg";

@localized()
export class AoDragOverlay extends LitElementWw {
  static override scopedElements = {
    "sl-icon": SlIcon,
  };

  @property({ type: Number })
  accessor imageCount: number = 1;

  static override styles = dragOverlayStyles;

  protected override render(): TemplateResult {
    return html`<div class="drag-overlay">
      <div class="border">
        <sl-icon .src=${photoPlus}></sl-icon>
        ${this.imageCount > 1
          ? msg(str`Drop ${this.imageCount} images here`)
          : msg("Drop 1 image here")}
      </div>
    </div>`;
  }
}
