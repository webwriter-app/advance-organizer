import { Edge, Node } from "../model/types";
import { Observable } from "./observable";

export class DocumentController extends Observable {
  private _nodes: Node[] = [
    {
      id: "1",
      label: {
        text: "Node 1",
      },
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
    {
      id: "2",
      label: {
        text: "Node 2",
      },
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
    {
      id: "3",
      label: {
        text: "Node 3",
      },
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
  ];
  private _edges: Edge[] = [];

  hasItem(id: string): boolean {
    return (
      this._nodes.some((n) => n.id === id) ||
      this._edges.some((e) => e.id === id)
    );
  }

  get(id: string): Node | Edge | undefined {
    const node = this._nodes.find((n) => n.id === id);
    if (node) {
      return node;
    }
    return this._edges.find((e) => e.id === id);
  }

  get nodes(): Node[] {
    return this._nodes;
  }

  get edges(): Edge[] {
    return this._edges;
  }
}
