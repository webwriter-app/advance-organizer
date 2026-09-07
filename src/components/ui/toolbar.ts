import { LitElementWw } from "@webwriter/lit";
import { toolbarStyles } from "./toolbar.styles";
import { html, type TemplateResult } from "lit";

export class AoToolbar extends LitElementWw {
  static override styles = toolbarStyles;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "toolbar");
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}
