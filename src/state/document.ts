import { Dimension, Edge, Id, Node } from "../model/types";
import { Point } from "../model/types";
import { Observable } from "./observable";

export class DocumentController extends Observable {
  private _nodes: Map<Id, Node> = new Map([
    [
      "1",
      {
        id: "1",
        label: { text: "Node 1" },
        position: { x: 500, y: 300 },
        dimension: { width: 100, height: 300 },
        style: {
          shape: "diamond",
          fill: "lightblue",
          stroke: "blue",
          strokeWidth: 2,
          strokeStyle: "dotted",
        },
        kind: "node",
      },
    ],
    [
      "2",
      {
        id: "2",
        label: { text: "Node 2" },
        position: { x: 200, y: 200 },
        dimension: { width: 100, height: 100 },
        style: {
          shape: "ellipse",
          fill: "lightgreen",
          stroke: "green",
          strokeWidth: 2,
          strokeStyle: "dashed",
        },
        kind: "node",
      },
    ],
    [
      "3",
      {
        id: "3",
        label: { text: "Node 3" },
        position: { x: 250, y: 400 },
        dimension: { width: 200, height: 100 },
        style: {
          shape: "rectangle",
          fill: "lightcoral",
          stroke: "red",
          strokeWidth: 2,
        },
        kind: "node",
      },
    ],
  ]);
  private _edges: Map<Id, Edge> = new Map();

  hasItem(id: Id): boolean {
    return this._nodes.has(id) || this._edges.has(id);
  }

  get(id: Id): Node | Edge | undefined {
    return this._nodes.get(id) ?? this._edges.get(id);
  }

  get nodes(): Node[] {
    return [...this._nodes.values()];
  }

  get edges(): Edge[] {
    return [...this._edges.values()];
  }

  updateNode(id: Id, update: Partial<Omit<Node, "id" | "kind">>): void {
    const node = this._nodes.get(id);
    if (!node) return;
    Object.assign(node, update);
    this.notify();
  }

  resizeNode(id: Id, position: Point, dimension: Dimension): void {
    const node = this._nodes.get(id);
    if (!node) return;
    this._nodes.set(id, { ...node, position, dimension });
    this.notify();
  }

  moveNodes(positions: Map<Id, Point>): void {
    for (const [id, position] of positions) {
      const node = this._nodes.get(id);
      if (!node) continue;
      this._nodes.set(id, { ...node, position });
    }
    this.notify();
  }
}
