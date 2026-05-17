import { html, TemplateResult } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement } from "lit/decorators.js";
import { styles } from "./webwriter-advance-organizer.styles";

import { WwToolbar } from "../components/ui/toolbar";
import { AoCanvas } from "../components/canvas/canvas";

import shoelaceTheme from "@shoelace-style/shoelace/dist/themes/light.styles.js";
import { AoNodeActionsGroup } from "../components/ui/toolbar-groups/node-actions";
import { provide } from "@lit/context";
import { documentContext, selectionContext } from "../state/contexts";
import { DocumentController } from "../state/document";
import { SelectionController } from "../state/selection";

/* Optional LOCALIZATION: Uncomment this after first running `npm run localize` in the command line.
import LOCALIZE from '../localization/generated'
import {msg} from '@lit/localize'
*/

@customElement("webwriter-advance-organizer")
export class WebwriterAdvanceOrganizer extends LitElementWw {
  @provide({
    context: documentContext,
  })
  accessor doc = new DocumentController(this);

  @provide({
    context: selectionContext,
  })
  accessor selection = new SelectionController(this, this.doc);

  /* Optional LOCALIZATION: Uncomment this after first running `npm run localize` in the command line.
  localize = LOCALIZE
  */

  /** Register the classes of custom elements to use in the Shadow DOM here.
   * @example
   * import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js"
   * ...
   *   static scopedElements = {"sl-button": SlButton}
   **/
  static override scopedElements = {
    "ww-toolbar": WwToolbar,
    "ao-canvas": AoCanvas,

    "ao-node-actions": AoNodeActionsGroup,
  };

  static override styles = [styles, shoelaceTheme];

  protected override render(): TemplateResult {
    return html`<ww-toolbar>
        <ao-node-actions></ao-node-actions>
      </ww-toolbar>
      <ao-canvas></ao-canvas>`;
  }
}
