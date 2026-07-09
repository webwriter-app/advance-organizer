import { consume } from "@lit/context";
import { LitElementWw } from "@webwriter/lit";
import { documentContext, selectionContext } from "../../../state/contexts";
import { DocumentController } from "../../../state/document";
import { html, PropertyValues, type TemplateResult } from "lit";
import { SubscribeController } from "../../../state/subscribe";
import { actionsStyles } from "./toolbar-actions.styles";
import { SelectionController } from "../../../state/selection";
import { Id } from "../../../model/types";
import { query } from "lit/decorators.js";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";

import iconAddNode from "@tabler/icons/outline/square-plus-2.svg";
import iconAddEdge from "@tabler/icons/outline/link-plus.svg";
import iconAddImage from "@tabler/icons/outline/photo-plus.svg";

const MIN_IMAGE_SIDE = 200;

export class AoCreateActionsGroup extends LitElementWw {
  @consume({ context: documentContext })
  accessor doc!: DocumentController;

  @consume({ context: selectionContext })
  accessor selection!: SelectionController;

  @query("#file-input")
  private accessor _fileInput!: HTMLInputElement;

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

  protected override render(): TemplateResult {
    return html`<sl-button-group label="Add elements">
        <sl-tooltip content="Add node">
          <sl-button @click=${this._handleAddNodeClick}>
            <sl-icon src=${iconAddNode}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-tooltip content="Add edge">
          <sl-button @click=${this._handleAddEdgeClick}>
            <sl-icon src=${iconAddEdge}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-tooltip content="Add picture">
          <sl-button @click=${this._handleAddImageClick}>
            <sl-icon src=${iconAddImage}></sl-icon>
          </sl-button>
        </sl-tooltip>
      </sl-button-group>
      <input
        id="file-input"
        type="file"
        accept="image/*"
        style="display: none"
        @change=${this._handleFileInputChange} />`;
  }

  private _handleAddNodeClick(): void {
    const newNode = this.doc.addNode({
      dimension: { width: 100, height: 50 },
      label: { text: "New node" },
      position: { x: 100, y: 100 },
      style: {
        shape: "rectangle",
        fill: "lightblue",
        stroke: "blue",
        strokeWidth: 2,
      },
    });
    this.selection.select(new Set<Id>([newNode.id]));
  }

  private _handleAddEdgeClick(): void {
    this.dispatchEvent(
      new CustomEvent("start-draw-edge", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleAddImageClick(): void {
    this._fileInput.click();
  }

  private _handleFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = reader.result as string;
      const probe = new Image();
      probe.onload = () => {
        const scale = MIN_IMAGE_SIDE / Math.min(probe.naturalWidth, probe.naturalHeight);
        const newImage = this.doc.addImage({
          dimension: {
            width: Math.round(probe.naturalWidth * scale),
            height: Math.round(probe.naturalHeight * scale),
          },
          position: { x: 100, y: 100 },
          src: imageDataUrl,
        });
        this.selection.select(new Set<Id>([newImage.id]));
      };
      probe.src = imageDataUrl;
    };
    reader.readAsDataURL(file);
  }
}
