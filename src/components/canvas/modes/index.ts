import { dragHandlers } from "./drag";
import { drawEdgeHandlers } from "./draw-edge";
import { reanchorEdgeHandlers } from "./reanchor-edge";
import { rectangleSelectHandlers } from "./rectangle-select";
import { resizeHandlers } from "./resize";
import { InteractionMode, ModeHandlerMap, ModeHandlers } from "./types";

export const modeHandlers: ModeHandlerMap = {
  drag: dragHandlers,
  resize: resizeHandlers,
  "rectangle-select": rectangleSelectHandlers,
  "draw-edge": drawEdgeHandlers,
  "reanchor-edge": reanchorEdgeHandlers,
};

export function getHandlers(mode: InteractionMode) {
  return modeHandlers[mode.kind] as
    | ModeHandlers<InteractionMode["kind"]>
    | undefined;
}

export function handlesPointerMove(mode: InteractionMode): boolean {
  return !!getHandlers(mode)?.onPointerMove;
}
