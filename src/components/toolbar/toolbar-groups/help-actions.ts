import { LitElementWw } from "@webwriter/lit";
import { SelectionController } from "../../../state/selection";
import { css, html, type TemplateResult } from "lit";
import { actionsStyles } from "./toolbar-actions.styles";
import { MOD_LABEL } from "../../../state/keyboard";
import { localized, msg } from "@lit/localize";

import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";
import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component.js";

import iconHelp from "@tabler/icons/outline/help.svg";
import iconDrag from "@tabler/icons/outline/arrows-move.svg";

type MousePart = "left" | "right" | "wheel";

const BUTTON_HIGHLIGHT: Record<MousePart, string> = {
  left: "M6 7a4 4 0 0 1 4 -4h2v8h-6z",
  right: "M18 7a4 4 0 0 0 -4 -4h-2v8h6z",
  wheel: "",
};

const WHEEL_HIGHLIGHT =
  "M12 4a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1 -3 0v-3a1.5 1.5 0 0 1 1.5 -1.5z";

@localized()
export class AoHelpActionsGroup extends LitElementWw {
  static override scopedElements = {
    "sl-button": SlButton,
    "sl-button-group": SlButtonGroup,
    "sl-dropdown": SlDropdown,
    "sl-icon": SlIcon,
    "sl-tooltip": SlTooltip,
    "sl-menu": SlMenu,
  };

  static override styles = [
    actionsStyles,
    css`
      sl-menu {
        max-height: 60vh;
        overflow-y: auto;
        padding: var(--sl-spacing-small) var(--sl-spacing-medium);
        font-size: var(--sl-font-size-small);
        color: var(--sl-color-neutral-800);
      }

      sl-menu sl-icon {
        width: 1.2em;
        height: 1.5em;
      }

      dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        align-items: center;
        column-gap: var(--sl-spacing-medium);
        row-gap: var(--sl-spacing-medium);
        margin: 0;
      }

      dt {
        display: flex;
        align-items: center;
        gap: 0.2em;
        color: var(--sl-color-neutral-700);
      }

      dd {
        margin: 0;
      }

      .plus {
        color: var(--sl-color-neutral-400);
      }

      .glyph {
        flex: none;
        width: 1.2em;
        height: 1.5em;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .glyph .highlight {
        fill: var(--sl-color-primary-600);
        stroke: var(--sl-color-primary-600);
      }
    `,
  ];

  static isApplicable(
    _: any,
    selection: SelectionController | undefined,
  ): boolean {
    return !selection || selection.size === 0;
  }

  protected override render(): TemplateResult {
    return html`<sl-button-group label=${msg("Help actions")}>
      <sl-dropdown placement="bottom-end">
        <sl-tooltip slot="trigger" content=${msg("Help")}>
          <sl-button size="small">
            <sl-icon label=${msg("Help")} .src=${iconHelp}></sl-icon>
          </sl-button>
        </sl-tooltip>
        <sl-menu>
          <dl>
            ${this._gesture([this._mouse("left")], msg("Select an element"))}
            ${this._gesture(
              [this._mouse("left"), this._icon(iconDrag)],
              msg("Move the selection"),
            )}
            ${this._gesture([this._mouse("right")], msg("Open context menu"))}
            ${this._gesture(
              [this._mouse("wheel"), this._icon(iconDrag)],
              msg("Pan the canvas"),
            )}
            ${this._gesture(
              [this._key(MOD_LABEL), this._mouse("wheel")],
              msg("Zoom in and out"),
            )}
          </dl>
        </sl-menu>
      </sl-dropdown>
    </sl-button-group>`;
  }

  private _gesture(glyphs: TemplateResult[], action: string): TemplateResult {
    const separated = glyphs.flatMap((glyph, i) =>
      i === 0 ? [glyph] : [html`<span class="plus">+</span>`, glyph],
    );
    return html`<dt>${separated}</dt>
      <dd>${action}</dd>`;
  }

  private _mouse(part: MousePart): TemplateResult {
    return html`<svg class="glyph" viewBox="5 2 14 20" aria-hidden="true">
      <path class="highlight" d=${BUTTON_HIGHLIGHT[part]} />
      <path
        d="M6 7a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4l0 -10" />
      <path d="M6 11h12" />
      <path d="M12 3v8" />
      <path class="highlight" d=${part === "wheel" ? WHEEL_HIGHLIGHT : ""} />
    </svg>`;
  }

  private _icon(src: string): TemplateResult {
    return html`<sl-icon .src=${src}></sl-icon>`;
  }

  private _key(label: string): TemplateResult {
    return html`<span>${label}</span>`;
  }
}
