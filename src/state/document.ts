import { Dimension, Edge, Id, Node, NodeStyle } from "../model/types";
import { Point } from "../model/types";
import { Observable } from "./observable";

export class DocumentController extends Observable {
  private _nodes: Map<Id, Node> = new Map();
  private _edges: Map<Id, Edge> = new Map();

  load(nodes: Node[], edges: Edge[]): void {
    this._nodes = new Map(nodes.map((n) => [n.id, n]));
    this._edges = new Map(edges.map((e) => [e.id, e]));
    this.notify();
  }

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

  // TODO: Always accept map / array of nodes to update -> less re-rendering
  updateNodeStyle(id: Id, style: Partial<NodeStyle>): void {
    const node = this._nodes.get(id);
    if (!node) return;
    this._nodes.set(id, { ...node, style: { ...node.style, ...style } });
    this.notify();
  }
}
