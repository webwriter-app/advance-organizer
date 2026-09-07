import { Edge, Id, Image, Node } from "../model/types";

const CLIPBOARD_MIME = "application/vnd.webwriter.advance-organizer+json";
const CLIPBOARD_WEB_MIME = `web ${CLIPBOARD_MIME}`;
const PAYLOAD_TYPE = "webwriter/advance-organizer";

export type ClipboardAction = "cut" | "copy" | "paste";

export interface ClipboardContent {
  readonly payload: ClipboardPayload | null;
  readonly images: File[];
}

export interface ClipboardPayload {
  readonly type: typeof PAYLOAD_TYPE;
  readonly nodes: Node[];
  readonly edges: Edge[];
  readonly images: Image[];
  readonly pages: Record<Id, string>;
}

export function createPayload(
  parts: Omit<ClipboardPayload, "type">,
): ClipboardPayload {
  return { type: PAYLOAD_TYPE, ...parts };
}

export function writePayload(
  data: DataTransfer,
  payload: ClipboardPayload,
): void {
  const serialized = JSON.stringify(payload);
  data.setData(CLIPBOARD_MIME, serialized);
  data.setData("text/plain", serialized);
}

export function readPayload(
  data: DataTransfer | null | undefined,
): ClipboardPayload | null {
  if (!data) return null;
  return (
    parsePayload(data.getData(CLIPBOARD_MIME)) ??
    parsePayload(data.getData("text/plain"))
  );
}

export async function writePayloadToClipboard(
  payload: ClipboardPayload,
): Promise<void> {
  const serialized = JSON.stringify(payload);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [CLIPBOARD_WEB_MIME]: new Blob([serialized], { type: CLIPBOARD_MIME }),
        "text/plain": new Blob([serialized], { type: "text/plain" }),
      }),
    ]);
  } catch {
    await navigator.clipboard.writeText(serialized);
  }
}

export async function readClipboard(): Promise<ClipboardContent> {
  let items: ClipboardItem[];
  try {
    items = [...(await navigator.clipboard.read())];
  } catch {
    const text = await navigator.clipboard.readText();
    return { payload: parsePayload(text), images: [] };
  }

  const images: File[] = [];
  for (const item of items) {
    for (const type of [CLIPBOARD_WEB_MIME, "text/plain"]) {
      if (!item.types.includes(type)) continue;
      const payload = parsePayload(await (await item.getType(type)).text());
      if (payload) return { payload, images: [] };
    }

    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (!imageType) continue;
    const blob = await item.getType(imageType);
    images.push(new File([blob], "clipboard-image", { type: imageType }));
  }

  return { payload: null, images };
}

function parsePayload(text: string): ClipboardPayload | null {
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed["type"] !== PAYLOAD_TYPE) return null;

  const nodes = asArray(parsed["nodes"]).filter(isNode);
  const images = asArray(parsed["images"]).filter(isImage);
  const edges = asArray(parsed["edges"]).filter(isEdge);
  if (nodes.length === 0 && images.length === 0 && edges.length === 0)
    return null;

  const nodeIds = new Set(nodes.map((n) => n.id));

  const pages: Record<Id, string> = {};
  const rawPages = parsed["pages"];
  if (isRecord(rawPages)) {
    for (const id of nodeIds) {
      const content = rawPages[id];
      if (typeof content === "string") pages[id] = content;
    }
  }

  return createPayload({ nodes, edges, images, pages });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isBox(value: Record<string, unknown>): boolean {
  const position = value["position"];
  const dimension = value["dimension"];
  return (
    typeof value["id"] === "string" &&
    isRecord(position) &&
    Number.isFinite(position["x"]) &&
    Number.isFinite(position["y"]) &&
    isRecord(dimension) &&
    Number.isFinite(dimension["width"]) &&
    Number.isFinite(dimension["height"])
  );
}

function isNode(value: unknown): value is Node {
  return (
    isRecord(value) &&
    value["kind"] === "node" &&
    isBox(value) &&
    isRecord(value["style"]) &&
    isRecord(value["label"])
  );
}

function isImage(value: unknown): value is Image {
  return (
    isRecord(value) &&
    value["kind"] === "image" &&
    isBox(value) &&
    typeof value["src"] === "string" &&
    value["src"].startsWith("data:image/")
  );
}

function isEdge(value: unknown): value is Edge {
  return (
    isRecord(value) &&
    value["kind"] === "edge" &&
    typeof value["id"] === "string" &&
    typeof value["source"] === "string" &&
    typeof value["target"] === "string" &&
    isRecord(value["style"])
  );
}
