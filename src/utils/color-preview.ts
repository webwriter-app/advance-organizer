import { ColorChannel, ColorPreview, Id } from "../model/types";

import SlColorPicker from "@shoelace-style/shoelace/dist/components/color-picker/color-picker.component.js";

export function previewColor(
  host: HTMLElement,
  ids: Iterable<Id>,
  channel: ColorChannel,
  color: string,
): void {
  host.dispatchEvent(
    new CustomEvent<ColorPreview>("preview-color", {
      bubbles: true,
      composed: true,
      detail: { ids: [...ids], channel, color },
    }),
  );
}

export function onPickedColor(
  handler: (color: string) => void,
): (e: Event) => void {
  return (e: Event) => {
    if (e.target instanceof SlColorPicker) {
      handler(e.target.getFormattedValue("hexa"));
    }
  };
}
