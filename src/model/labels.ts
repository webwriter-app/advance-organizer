import { msg } from "@lit/localize";
import { NodeShape, StrokeStyle } from "./types";

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
