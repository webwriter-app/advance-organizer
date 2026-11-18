import type { Edge, Id, Node, NodeStyle } from "./types";

export interface OutlineItem {
  readonly text: string;
  readonly children: readonly OutlineItem[];
}

const NODE_SIZE = { width: 160, height: 60 };
const COLUMN_GAP = 80;
const ROW_GAP = 30;

/**
 * Lays an outline out as a tree from left to right: a node per item, an arrow from each item to its
 * sub-items. Leaves take one row each and a parent is centered on its children.
 */
export function organizerFromOutline(
  items: readonly OutlineItem[],
  styleFor: (depth: number) => NodeStyle,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const rowHeight = NODE_SIZE.height + ROW_GAP;
  const columnWidth = NODE_SIZE.width + COLUMN_GAP;
  let nextRow = 0;

  const place = (item: OutlineItem, depth: number): Node => {
    const children = item.children.map((child) => place(child, depth + 1));
    const y = children.length
      ? (children[0]!.position.y + children[children.length - 1]!.position.y) / 2
      : nextRow++ * rowHeight;
    const node: Node = {
      id: crypto.randomUUID(),
      kind: "node",
      position: { x: depth * columnWidth, y },
      dimension: NODE_SIZE,
      style: styleFor(depth),
      label: { text: item.text },
    };
    nodes.push(node);
    for (const child of children) {
      edges.push({
        id: crypto.randomUUID(),
        kind: "edge",
        source: node.id,
        sourcePosition: "right",
        target: child.id,
        targetPosition: "left",
        style: { markerEnd: "arrow" },
      });
    }
    return node;
  };

  for (const item of items) place(item, 0);
  return { nodes, edges };
}

/**
 * Reads the nodes as an outline. Roots are the nodes that no edge points to; sub-items follow the
 * edges from source to target, ordered from top to bottom. A node reached twice appears once, under
 * the first parent, and nodes that only form a cycle become roots, so every node is listed once.
 */
export function outlineFromOrganizer(
  nodes: readonly Node[],
  edges: readonly Edge[],
): OutlineItem[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const order = (a: Node, b: Node) => a.position.y - b.position.y || a.position.x - b.position.x;
  const children = new Map<Id, Node[]>();
  const hasParent = new Set<Id>();
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target || source === target) continue;
    children.set(source.id, [...(children.get(source.id) ?? []), target]);
    hasParent.add(target.id);
  }

  const seen = new Set<Id>();
  const build = (node: Node): OutlineItem => {
    seen.add(node.id);
    const sub = (children.get(node.id) ?? []).sort(order).filter((child) => !seen.has(child.id));
    const items: OutlineItem[] = [];
    for (const child of sub) if (!seen.has(child.id)) items.push(build(child));
    return { text: node.label.text, children: items };
  };

  const result: OutlineItem[] = [];
  const sorted = [...nodes].sort(order);
  for (const root of sorted.filter((node) => !hasParent.has(node.id))) result.push(build(root));
  for (const node of sorted) if (!seen.has(node.id)) result.push(build(node));
  return result;
}
