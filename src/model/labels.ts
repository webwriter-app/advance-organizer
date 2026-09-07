import { msg } from "@lit/localize";
import { ArrowheadOption, NodeShape, StrokeStyle } from "./types";

export const SHAPES: readonly NodeShape[] = ["rectangle", "ellipse", "diamond"];

export const STROKE_STYLES: readonly StrokeStyle[] = [
  "solid",
  "dashed",
  "dotted",
];

export function shapeLabel(shape: NodeShape): string {
  switch (shape) {
    case "rectangle":
      return msg("Rectangle");
    case "ellipse":
      return msg("Ellipse");
    case "diamond":
      return msg("Diamond");
  }
}

export function strokeStyleLabel(strokeStyle: StrokeStyle): string {
  switch (strokeStyle) {
    case "solid":
      return msg("Solid");
    case "dashed":
      return msg("Dashed");
    case "dotted":
      return msg("Dotted");
  }
}

export const ARROWHEAD_OPTIONS: readonly ArrowheadOption[] = [
  "none",
  "forward",
  "reverse",
  "bidirectional",
];

export function arrowheadLabel(option: ArrowheadOption): string {
  switch (option) {
    case "none":
      return msg("None");
    case "forward":
      return msg("Forward");
    case "reverse":
      return msg("Reverse");
    case "bidirectional":
      return msg("Bidirectional");
  }
}
