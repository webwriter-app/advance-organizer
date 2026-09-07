import {
  Bounds,
  BoxItem,
  CanvasItem,
  Dimension,
  Edge,
  EdgePosition,
  EdgeStyle,
  Id,
  Image,
  ImageStyle,
  Label,
  Node,
  NodeStyle,
} from "../model/types";
import { Point } from "../model/types";
import { Observable } from "./observable";
import {
  boundsWithin,
  computeBounds,
  INSERT_GAP,
} from "../components/canvas/helper";

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

  isEmpty(): boolean {
    return this._nodes.size === 0 && this._images.size === 0;
  }

  hasItem(id: Id): boolean {
    return this._nodes.has(id) || this._edges.has(id) || this._images.has(id);
  }

  get(id: Id): CanvasItem | undefined {
    return this._nodes.get(id) ?? this._edges.get(id) ?? this._images.get(id);
  }

  hasItemAt(position: Point): boolean {
    const isAt = (item: BoxItem): boolean =>
      Math.abs(item.position.x - position.x) < 1 &&
      Math.abs(item.position.y - position.y) < 1;
    return (
      [...this._nodes.values()].some(isAt) ||
      [...this._images.values()].some(isAt)
    );
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
    if (this._hasEdgeAt(edge)) return null;

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
          position: {
            x: node.position.x + INSERT_GAP,
            y: node.position.y + INSERT_GAP,
          },
        });
      } else {
        const image = this._images.get(id);
        if (image) {
          const newId = crypto.randomUUID();
          newIds.add(newId);
          this._images.set(newId, {
            ...image,
            id: newId,
            position: {
              x: image.position.x + INSERT_GAP,
              y: image.position.y + INSERT_GAP,
            },
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

  collectItems(ids: Set<Id>): {
    nodes: Node[];
    edges: Edge[];
    images: Image[];
  } {
    const nodes: Node[] = [];
    const images: Image[] = [];

    for (const id of ids) {
      const node = this._nodes.get(id);
      if (node) {
        nodes.push(node);
        continue;
      }
      const image = this._images.get(id);
      if (image) {
        images.push(image);
      }
    }

    const edges = [...this._edges.values()].filter((e) => ids.has(e.id));

    return { nodes, edges, images };
  }

  insertItems(
    items: { nodes: Node[]; edges: Edge[]; images: Image[] },
    viewport?: Bounds | null,
  ): {
    newIds: Set<Id>;
    nodeIdMap: Map<Id, Id>;
  } {
    const boxItems: BoxItem[] = [...items.nodes, ...items.images];
    if (boxItems.length === 0 && items.edges.length === 0)
      return { newIds: new Set(), nodeIdMap: new Map() };

    const newIds: Set<Id> = new Set();
    const nodeIdMap: Map<Id, Id> = new Map();

    const offset = this._pasteShift(boxItems, viewport);
    const shift = (position: Point): Point => ({
      x: position.x + offset.x,
      y: position.y + offset.y,
    });

    for (const node of items.nodes) {
      const newId = crypto.randomUUID();
      nodeIdMap.set(node.id, newId);
      newIds.add(newId);
      this._nodes.set(newId, {
        ...node,
        id: newId,
        kind: "node",
        position: shift(node.position),
      });
    }

    for (const image of items.images) {
      const newId = crypto.randomUUID();
      newIds.add(newId);
      this._images.set(newId, {
        ...image,
        id: newId,
        kind: "image",
        position: shift(image.position),
      });
    }

    const endpoint = (id: Id): Id | null =>
      nodeIdMap.get(id) ?? (this._nodes.has(id) ? id : null);

    for (const edge of items.edges) {
      const source = endpoint(edge.source);
      const target = endpoint(edge.target);
      if (!source || !target || source === target) continue;
      const reconnected = { ...edge, kind: "edge" as const, source, target };
      if (this._hasEdgeAt(reconnected)) continue;
      const newId = crypto.randomUUID();
      newIds.add(newId);
      this._edges.set(newId, { ...reconnected, id: newId });
    }

    this.notify();
    return { newIds, nodeIdMap };
  }

  freePosition(position: Point): Point {
    const offset = this._pasteOffset([{ position }]);
    return { x: position.x + offset, y: position.y + offset };
  }

  private _hasEdgeAt(
    edge: Pick<Edge, "source" | "sourcePosition" | "target" | "targetPosition">,
  ): boolean {
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
        return true;
    }
    return false;
  }

  private _pasteShift(
    items: readonly BoxItem[],
    viewport?: Bounds | null,
  ): Point {
    const cascade = (base: Point): Point => {
      const step = this._pasteOffset(items, base);
      return { x: base.x + step, y: base.y + step };
    };

    const atOrigin = cascade({ x: 0, y: 0 });
    const bounds = computeBounds(items);
    if (!viewport || !bounds) return atOrigin;

    const isVisible = (shift: Point): boolean =>
      boundsWithin(viewport, {
        position: {
          x: bounds.position.x + shift.x,
          y: bounds.position.y + shift.y,
        },
        dimension: bounds.dimension,
      });
    if (isVisible(atOrigin)) return atOrigin;

    const toCenter = {
      x: viewport.position.x - bounds.position.x,
      y: viewport.position.y - bounds.position.y,
    };
    const centered = cascade(toCenter);
    return isVisible(centered) ? centered : toCenter;
  }

  private _pasteOffset(
    items: readonly { position: Point }[],
    base: Point = { x: 0, y: 0 },
  ): number {
    let step = 0;
    while (
      step < 100 &&
      items.some((item) =>
        this.hasItemAt({
          x: item.position.x + base.x + step * INSERT_GAP,
          y: item.position.y + base.y + step * INSERT_GAP,
        }),
      )
    ) {
      step++;
    }
    return step * INSERT_GAP;
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
      const label = text ? { ...edge.label, text } : undefined;
      this._edges.set(id, { ...edge, label });
      this.notify();
    }
  }

  updateLabelStyle(id: Id, style: Partial<Omit<Label, "text">>): void {
    const node = this._nodes.get(id);
    if (node) {
      this._nodes.set(id, { ...node, label: { ...node.label, ...style } });
      this.notify();
      return;
    }
    const edge = this._edges.get(id);
    if (edge?.label) {
      this._edges.set(id, { ...edge, label: { ...edge.label, ...style } });
      this.notify();
    }
  }

  // TODO: Always accept map / array of nodes to update -> less re-rendering
  updateNodeStyle(id: Id, style: Partial<NodeStyle>): void {
    const node = this._nodes.get(id);
    if (!node) return;
    const preset = "preset" in style ? style.preset : "custom";
    this._nodes.set(id, {
      ...node,
      style: { ...node.style, ...style, preset },
    });
    this.notify();
  }

  updateEdgeStyle(id: Id, style: Partial<EdgeStyle>): void {
    const edge = this._edges.get(id);
    if (!edge) return;
    this._edges.set(id, { ...edge, style: { ...edge.style, ...style } });
    this.notify();
  }

  updateImageStyle(id: Id, style: Partial<ImageStyle>): void {
    const image = this._images.get(id);
    if (!image) return;
    this._images.set(id, { ...image, style: { ...image.style, ...style } });
    this.notify();
  }
}
