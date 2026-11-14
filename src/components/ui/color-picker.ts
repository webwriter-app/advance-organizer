import { connectMessages } from "../../../localization/localizer";
import { LitElementWw } from "@webwriter/lit";
import { html, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { colorPickerStyles } from "./color-picker.styles";
import { DEFAULT_BLACK } from "../../model/colors";

export interface ColorOption {
  readonly label: string;
  readonly color: string;
}

export class AoColorPicker extends LitElementWw {
  protected readonly msg = connectMessages(this);
  // `--sl-color-*-600`, `gray-950` for black as fixed values
  get COLORS(): readonly ColorOption[] {
    return [
      { label: this.msg("Black"), color: DEFAULT_BLACK },
      { label: this.msg("White"), color: "#ffffff" },
      { label: this.msg("Red"), color: "#dc2626" },
      { label: this.msg("Orange"), color: "#ea580c" },
      { label: this.msg("Yellow"), color: "#ca8a04" },
      { label: this.msg("Green"), color: "#16a34a" },
      { label: this.msg("Cyan"), color: "#0891b2" },
      { label: this.msg("Blue"), color: "#2563eb" },
      { label: this.msg("Violet"), color: "#7c3aed" },
      { label: this.msg("Pink"), color: "#db2777" },
    ];
  }

  // `--sl-color-*-100`, `gray-200` for neutral
  get TINTS(): readonly ColorOption[] {
    return [
      { label: this.msg("White"), color: "#ffffff" },
      { label: this.msg("Gray"), color: "#e4e4e7" },
      { label: this.msg("Red"), color: "#fee2e2" },
      { label: this.msg("Orange"), color: "#ffedd5" },
      { label: this.msg("Yellow"), color: "#fef9c3" },
      { label: this.msg("Green"), color: "#dcfce7" },
      { label: this.msg("Cyan"), color: "#cffafe" },
      { label: this.msg("Blue"), color: "#dbeafe" },
      { label: this.msg("Violet"), color: "#ede9fe" },
      { label: this.msg("Pink"), color: "#fce7f3" },
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
    const colors = this.tinted ? this.TINTS : this.COLORS;
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
