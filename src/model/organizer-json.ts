import type { MsgFn } from "@lit/localize";
import type { Edge, Image, Node, NodeStyle } from "./types";

export interface OrganizerData {
  nodes: Node[];
  edges: Edge[];
  images: Image[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isPoint = (value: unknown) => isRecord(value) && isNumber(value["x"]) && isNumber(value["y"]);
const isSize = (value: unknown) =>
  isRecord(value) && isNumber(value["width"]) && isNumber(value["height"]) && value["width"] > 0 && value["height"] > 0;

/**
 * Checks the whole file and returns the organizer data. Throws an `Error` with a readable message
 * for anything that is not an exported organizer; edges must point to existing nodes.
 */
export function parseOrganizerJson(text: string, msg: MsgFn): OrganizerData {
  const invalid = () => new Error(msg("The file is not a valid advance organizer."));
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw invalid();
  }
  if (!isRecord(data) || !Array.isArray(data["nodes"])) throw invalid();
  const edgeList = data["edges"] ?? [];
  const imageList = data["images"] ?? [];
  if (!Array.isArray(edgeList) || !Array.isArray(imageList)) throw invalid();

  const ids = new Set<string>();
  const claim = (id: unknown): id is string => {
    if (typeof id !== "string" || !id || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  const textOf = (label: unknown) => isRecord(label) && typeof label["text"] === "string";

  const nodes: Node[] = [];
  for (const raw of data["nodes"]) {
    if (!isRecord(raw) || !claim(raw["id"]) || !isPoint(raw["position"]) || !isSize(raw["dimension"]) || !textOf(raw["label"])) throw invalid();
    nodes.push({ ...raw, kind: "node", style: (isRecord(raw["style"]) ? raw["style"] : {}) as NodeStyle } as Node);
  }
  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges: Edge[] = [];
  for (const raw of edgeList) {
    if (!isRecord(raw) || !claim(raw["id"]) || !nodeIds.has(raw["source"] as string) || !nodeIds.has(raw["target"] as string)) throw invalid();
    if (raw["label"] !== undefined && !textOf(raw["label"])) throw invalid();
    edges.push({ ...raw, kind: "edge", style: isRecord(raw["style"]) ? raw["style"] : {} } as unknown as Edge);
  }

  const images: Image[] = [];
  for (const raw of imageList) {
    if (!isRecord(raw) || !claim(raw["id"]) || !isPoint(raw["position"]) || !isSize(raw["dimension"])) throw invalid();
    if (typeof raw["src"] !== "string" || !/^data:image\//i.test(raw["src"])) throw invalid();
    images.push({ ...raw, kind: "image" } as unknown as Image);
  }
  return { nodes, edges, images };
}
