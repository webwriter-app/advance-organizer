import type {
  Dimension,
  EdgePosition,
  Id,
  Point,
  ResizeHandle,
} from "../../../model/types";
import type { DocumentController } from "../../../state/document";
import type { SelectionController } from "../../../state/selection";
import { ZoomController } from "../zoom";
import { SnapHighlighter } from "../snap";

export type InteractionMode =
  | { kind: "idle" }
  | { kind: "rectangle-select"; start: Point; touch: boolean }
  | {
      kind: "drag";
      start: Point;
      startPositions: Map<Id, Point>;
      items: Set<Id>;
    }
  | {
      kind: "resize";
      start: Point;
      startPosition: Point;
      startDimension: Dimension;
      handle: ResizeHandle;
      itemId: Id;
      aspectRatio: number;
      lockByDefault: boolean;
    }
  | {
      kind: "draw-edge";
      source: {
        nodeId: Id;
        anchor: EdgePosition;
        start: Point;
        startEndpointPos: Point;
      } | null;
    }
  | {
      kind: "reanchor-edge";
      edgeId: Id;
      endpoint: "source" | "target";
      otherNodeId: Id;
      start: Point;
      startEndpointPos: Point;
      otherEndpointPos: Point;
    };

export type ModeOf<K extends InteractionMode["kind"]> = Extract<
  InteractionMode,
  { kind: K }
>;

export interface ModeContext {
  doc: DocumentController;
  selection: SelectionController;
  zoom: ZoomController;
  snap: SnapHighlighter;
  root: ParentNode;
  host: HTMLElement;
  shiftKeyPressed(): boolean;
  setMode(mode: InteractionMode): void;
  resetMode(): void;
}

export interface ModeHandlers<K extends InteractionMode["kind"]> {
  persistOnPointerUp?: boolean;
  onPointerMove?(pointer: Point, mode: ModeOf<K>, ctx: ModeContext): void;
  onPointerUp?(pointer: Point, mode: ModeOf<K>, ctx: ModeContext): void;
  onCancel?(mode: ModeOf<K>, ctx: ModeContext): void;
}

export type ModeHandlerMap = {
  [K in InteractionMode["kind"]]?: ModeHandlers<K>;
};
