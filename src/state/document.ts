import {
  Dimension,
  Edge,
  EdgePosition,
  EdgeStyle,
  Id,
  Node,
  NodeStyle,
} from "../model/types";
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

  addNode(node: Omit<Node, "id" | "kind">): Node {
    const id = crypto.randomUUID();
    const newNode: Node = { ...node, id, kind: "node" };
    this._nodes.set(id, newNode);
    this.notify();
    return newNode;
  }

  addEdge(edge: Omit<Edge, "id" | "kind">): Edge | null {
    // Prevent adding an edge if source and target node are the same
    if (edge.source === edge.target) return null;
    // Prevent adding an edge if source or target node does not exist
    if (!this._nodes.has(edge.source) || !this._nodes.has(edge.target))
      return null;
    // Prevent adding an edge if an edge already exists between the same source and target anchors
    for (const e of this._edges.values()) {
      if (
        (e.source === edge.source &&
          e.sourcePosition === edge.sourcePosition &&
          e.target === edge.target &&
          e.targetPosition === edge.targetPosition) ||
        (e.source === edge.target &&
          e.sourcePosition === edge.targetPosition &&
          e.target === edge.source &&
          e.targetPosition === edge.sourcePosition)
      )
        return null;
    }
    console.log("survived addEdge checks", edge);

    const id = crypto.randomUUID();
    const newEdge: Edge = { ...edge, id, kind: "edge" };
    this._edges.set(id, newEdge);
    this.notify();
    return newEdge;
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

  reanchorEdge(
    id: Id,
    endpoint: "source" | "target",
    anchorNode: Id,
    anchorPosition: EdgePosition,
  ): void {
    const edge = this._edges.get(id);
    if (!edge) return;
    if (endpoint === "source") {
      this._edges.set(id, {
        ...edge,
        source: anchorNode,
        sourcePosition: anchorPosition,
      });
    } else {
      this._edges.set(id, {
        ...edge,
        target: anchorNode,
        targetPosition: anchorPosition,
      });
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

  updateEdgeStyle(id: Id, style: Partial<EdgeStyle>): void {
    const edge = this._edges.get(id);
    if (!edge) return;
    this._edges.set(id, { ...edge, style: { ...edge.style, ...style } });
    this.notify();
  }
}
