import { LitElementWw } from "@webwriter/lit";
import { html, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { localized, msg } from "@lit/localize";
import { colorPickerStyles } from "./color-picker.styles";

export interface ColorOption {
  readonly label: string;
  readonly color: string;
}

@localized()
export class WwColorPicker extends LitElementWw {
  // `--sl-color-*-600`, `gray-950` for black as fixed values
  static get COLORS(): readonly ColorOption[] {
    return [
      { label: msg("Black"), color: "#131316" },
      { label: msg("White"), color: "#ffffff" },
      { label: msg("Red"), color: "#dc2626" },
      { label: msg("Orange"), color: "#ea580c" },
      { label: msg("Yellow"), color: "#ca8a04" },
      { label: msg("Green"), color: "#16a34a" },
      { label: msg("Cyan"), color: "#0891b2" },
      { label: msg("Blue"), color: "#2563eb" },
      { label: msg("Violet"), color: "#7c3aed" },
      { label: msg("Pink"), color: "#db2777" },
    ];
  }

  // `--sl-color-*-100`, `gray-200` for neutral
  static get TINTS(): readonly ColorOption[] {
    return [
      { label: msg("White"), color: "#ffffff" },
      { label: msg("Gray"), color: "#e4e4e7" },
      { label: msg("Red"), color: "#fee2e2" },
      { label: msg("Orange"), color: "#ffedd5" },
      { label: msg("Yellow"), color: "#fef9c3" },
      { label: msg("Green"), color: "#dcfce7" },
      { label: msg("Cyan"), color: "#cffafe" },
      { label: msg("Blue"), color: "#dbeafe" },
      { label: msg("Violet"), color: "#ede9fe" },
      { label: msg("Pink"), color: "#fce7f3" },
    ];
  }

  @property({ type: String })
  accessor value = "";

  @property({ type: Boolean })
  accessor tinted = false;

  static override styles = colorPickerStyles;

  constructor() {
    super();
    this.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.stopPropagation();
      }
    });
  }

  protected override render(): TemplateResult {
    const colors = this.tinted ? WwColorPicker.TINTS : WwColorPicker.COLORS;
    const current = normalizeColor(this.value);

    return html`${colors.map(
      ({ label, color }) =>
        html`<button
          class=${classMap({ current: normalizeColor(color) === current })}
          title=${label}
          @click=${() => this._emit(color)}>
          <span
            class=${classMap({ swatch: true, pale: isPale(color) })}
            style="background-color: ${color};"></span>
        </button>`,
    )}`;
  }

  private _emit(color: string): void {
    this.dispatchEvent(new CustomEvent<string>("input", { detail: color }));
  }
}

/** Whether a swatch needs a border to stand out against the panel. */
function isPale(color: string): boolean {
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return false;
  }

  const [red, green, blue] = [1, 3, 5].map(
    (offset) => parseInt(color.slice(offset, offset + 2), 16) / 255,
  ) as [number, number, number];

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.85;
}

function normalizeColor(color: string): string {
  const value = color.trim().toLowerCase();
  return value.length === 9 && value.endsWith("ff") ? value.slice(0, 7) : value;
}
