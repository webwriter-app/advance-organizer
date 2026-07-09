import {
  CanvasItem,
  Dimension,
  Edge,
  EdgePosition,
  EdgeStyle,
  Id,
  Image,
  Node,
  NodeStyle,
} from "../model/types";
import { Point } from "../model/types";
import { Observable } from "./observable";

export class DocumentController extends Observable {
  private _nodes: Map<Id, Node> = new Map();
  private _edges: Map<Id, Edge> = new Map();
  private _images: Map<Id, Image> = new Map();

  load(nodes: Node[], edges: Edge[], images: Image[]): void {
    this._nodes = new Map(nodes.map((n) => [n.id, n]));
    this._edges = new Map(edges.map((e) => [e.id, e]));
    this._images = new Map(images.map((i) => [i.id, i]));
    this.notify();
  }

  hasItem(id: Id): boolean {
    return this._nodes.has(id) || this._edges.has(id) || this._images.has(id);
  }

  get(id: Id): CanvasItem | undefined {
    return this._nodes.get(id) ?? this._edges.get(id) ?? this._images.get(id);
  }

  get nodes(): Node[] {
    return [...this._nodes.values()];
  }

  get edges(): Edge[] {
    return [...this._edges.values()];
  }

  get images(): Image[] {
    return [...this._images.values()];
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

    const id = crypto.randomUUID();
    const newEdge: Edge = { ...edge, id, kind: "edge" };
    this._edges.set(id, newEdge);
    this.notify();
    return newEdge;
  }

  addImage(image: Omit<Image, "id" | "kind">): Image {
    const id = crypto.randomUUID();
    const newImage: Image = { ...image, id, kind: "image" };
    this._images.set(id, newImage);
    this.notify();
    return newImage;
  }

  removeItems(ids: Set<Id>): void {
    for (const id of ids) {
      this._nodes.delete(id);
      this._edges.delete(id);
      this._images.delete(id);
    }
    for (const edge of this._edges.values()) {
      if (ids.has(edge.source) || ids.has(edge.target)) {
        this._edges.delete(edge.id);
      }
    }
    this.notify();
  }

  duplicateItems(ids: Set<Id>): {
    newIds: Set<Id>;
    nodeIdMap: Map<Id, Id>;
  } {
    const newIds: Set<Id> = new Set();
    const duplicatedNodeIds: Map<Id, Id> = new Map();

    for (const id of ids) {
      const node = this._nodes.get(id);
      if (node) {
        const newId = crypto.randomUUID();
        duplicatedNodeIds.set(id, newId);
        newIds.add(newId);
        this._nodes.set(newId, {
          ...node,
          id: newId,
          position: { x: node.position.x + 20, y: node.position.y + 20 },
        });
      } else {
        const image = this._images.get(id);
        if (image) {
          const newId = crypto.randomUUID();
          newIds.add(newId);
          this._images.set(newId, {
            ...image,
            id: newId,
            position: { x: image.position.x + 20, y: image.position.y + 20 },
          });
        }
      }
    }

    for (const id of ids) {
      const edge = this._edges.get(id);
      if (edge) {
        const newSourceId = duplicatedNodeIds.get(edge.source) ?? edge.source;
        const newTargetId = duplicatedNodeIds.get(edge.target) ?? edge.target;
        if (newSourceId === edge.source && newTargetId === edge.target) {
          continue;
        }
        const newId = crypto.randomUUID();
        newIds.add(newId);
        this._edges.set(newId, {
          ...edge,
          id: newId,
          source: newSourceId,
          target: newTargetId,
        });
      }
    }
    this.notify();
    return { newIds, nodeIdMap: duplicatedNodeIds };
  }

  resizeItem(id: Id, position: Point, dimension: Dimension): void {
    const node = this._nodes.get(id);
    if (node) {
      this._nodes.set(id, { ...node, position, dimension });
    } else {
      const image = this._images.get(id);
      if (image) {
        this._images.set(id, { ...image, position, dimension });
      }
    }
    this.notify();
  }

  moveItems(positions: Map<Id, Point>): void {
    for (const [id, position] of positions) {
      const node = this._nodes.get(id);
      if (node) {
        this._nodes.set(id, { ...node, position });
        continue;
      }
      const image = this._images.get(id);
      if (image) {
        this._images.set(id, { ...image, position });
      }
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

  updateLabelText(id: Id, text: string): void {
    const node = this._nodes.get(id);
    if (node) {
      this._nodes.set(id, { ...node, label: { ...node.label, text } });
      this.notify();
      return;
    }
    const edge = this._edges.get(id);
    if (edge) {
      this._edges.set(id, { ...edge, label: { ...edge.label, text } });
      this.notify();
    }
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
