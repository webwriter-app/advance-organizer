export type Id = string;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Dimension {
  readonly width: number;
  readonly height: number;
}

export interface Bounds {
  readonly position: Point;
  readonly dimension: Dimension;
}

export interface Label {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly color?: string;
  readonly fontSize?: number;
}

export type NodeShape = "rectangle" | "ellipse" | "diamond";

export type StrokeStyle = "solid" | "dashed" | "dotted";

export interface NodeStyle {
  readonly shape?: NodeShape;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly strokeStyle?: StrokeStyle;
}

export interface Node {
  readonly id: Id;
  readonly kind: "node";
  readonly position: Point;
  readonly dimension: Dimension;
  readonly style: NodeStyle;
  readonly label: Label;
}

export type EdgePosition = "top" | "bottom" | "left" | "right";

export type EdgeRouting = "straight";

export type EdgeMarker = "none" | "arrow";

export interface EdgeStyle {
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly strokeStyle?: StrokeStyle;
  readonly markerStart?: EdgeMarker;
  readonly markerEnd?: EdgeMarker;
  readonly routing?: EdgeRouting;
}

export interface Edge {
  readonly id: Id;
  readonly kind: "edge";
  readonly source: Id;
  readonly sourcePosition?: EdgePosition;
  readonly target: Id;
  readonly targetPosition?: EdgePosition;
  readonly style: EdgeStyle;
  readonly label?: Label;
}

export interface Image {
  readonly id: Id;
  readonly kind: "image";
  readonly position: Point;
  readonly dimension: Dimension;
  readonly src: string;
  readonly alt?: string;
}

export type CanvasItem = Node | Edge | Image;

export type BoxItem = Node | Image;

export interface AdvanceOrganizer {
  readonly version: 1;
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly images: readonly Image[];
}

export type ResizeHandle = "tl" | "t" | "tr" | "r" | "br" | "b" | "bl" | "l";

export type AnchorRendering = {
  active: boolean;
  skipNodeId?: Id;
};
