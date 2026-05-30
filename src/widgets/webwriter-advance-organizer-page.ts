import { html, type TemplateResult } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, queryAssignedElements } from "lit/decorators.js";
import { styles } from "./webwriter-advance-organizer-page.styles";

@customElement("webwriter-advance-organizer-page")
export class WebwriterAdvanceOrganizerPage extends LitElementWw {
  @queryAssignedElements({ flatten: true })
  accessor assignedElements!: Element[];

  static override styles = styles;

  protected override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}
