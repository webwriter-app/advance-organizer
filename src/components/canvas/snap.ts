import { EdgePosition, Id, Node, Point } from "../../model/types";
import { applyAnchorHighlightDom } from "./dom-sync";
import { getAnchorPoints, SNAP_RADIUS } from "./helper";

export interface SnapTarget {
  nodeId: Id;
  position: EdgePosition;
  point: Point;
  distance: number;
}

export function findSnapTarget(
  nodes: Node[],
  pos: Point,
  excludeId?: Id,
): SnapTarget | null {
  return findNearestAnchor(nodes, pos, SNAP_RADIUS, excludeId);
}

export function findNearestAnchor(
  nodes: Node[],
  pos: Point,
  radius: number,
  excludeId?: Id,
): SnapTarget | null {
  let closest: SnapTarget | null = null;

  for (const node of nodes) {
    if (node.id === excludeId) continue;
    const anchors = getAnchorPoints(node);
    for (const [anchorPos, anchorPoint] of Object.entries(anchors)) {
      const dx = anchorPoint.x - pos.x;
      const dy = anchorPoint.y - pos.y;
      const distance = Math.hypot(dx, dy);
      if (
        distance <= radius &&
        (closest === null || distance < closest.distance)
      ) {
        closest = {
          nodeId: node.id,
          position: anchorPos as EdgePosition,
          point: anchorPoint,
          distance,
        };
      }
    }
  }

  return closest;
}

export class SnapHighlighter {
  private _target: { nodeId: Id; position: EdgePosition } | null = null;

  update(
    root: ParentNode,
    target: { nodeId: Id; position: EdgePosition } | null,
  ): void {
    if (
      target?.nodeId !== this._target?.nodeId ||
      target?.position !== this._target?.position
    ) {
      if (this._target) {
        applyAnchorHighlightDom(root, this._target, false);
      }
      if (target) {
        applyAnchorHighlightDom(root, target, true);
      }
      this._target = target;
    }
  }

  clear(root: ParentNode): void {
    this.update(root, null);
  }
}
