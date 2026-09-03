import { html, type TemplateResult } from "lit";
import { LitElementWw } from "@webwriter/lit";
import {
  customElement,
  property,
  queryAssignedElements,
} from "lit/decorators.js";
import { styles } from "./webwriter-advance-organizer-page.styles";

/**
 * A page of a `<webwriter-advance-organizer>`: the content shown when a learner clicks on
 * the node it belongs to. Pages are children of the advance organizer and are linked to a
 * node by their `node-id`.
 *
 * A page holds arbitrary content – text, images, other widgets – and stays hidden until
 * its node is opened. Pages are managed by the advance organizer, adding a page to a node
 * in the toolbar creates one, and removing the node removes its page again.
 *
 * @slot - The page content.
 */
@customElement("webwriter-advance-organizer-page")
export class WebwriterAdvanceOrganizerPage extends LitElementWw {
  @property({ type: String, attribute: "node-id", reflect: true })
  accessor nodeId: string | null = null;

  /** @internal */
  @queryAssignedElements({ flatten: true })
  accessor assignedElements!: Element[];

  static override styles = styles;

  protected override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}
